import type {ProgramAuthorConfig} from '../lib/program-author.ts';
import {userManagement} from './user-management.ts';
import {authStore,type AuthSettings} from './auth-store.ts';
import {AuthFailure,type AuthProvider} from './provider.ts';
import {authPage} from './page.ts';
import {signLink,random} from './crypto.ts';
import {oauthFlow,oauthCookie,oauthCookieValue,isSocialProvider} from './oauth.ts';
export const sessionCookie='__Host-dc_session',challengeCookie='__Host-dc_challenge';
export function cookie(request:Request,name:string){const matches=(request.headers.get('cookie')??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name+'='));return matches.length===1?matches[0].slice(name.length+1):'';}
export function safeReturn(value:string|null){if(!value||!value.startsWith('/')||value.startsWith('//'))return '/';try{const u=new URL(value,'https://app.local');if(u.origin!=='https://app.local'||/^\/(auth(?:\/|$)|sign(?:in|out)-with-chatgpt|callback)/.test(u.pathname))return '/';return u.pathname+u.search+u.hash;}catch{return '/';}}
export function sanitize(request:Request){const h=new Headers(request.headers);for(const key of Array.from(h.keys()))if(key.toLowerCase().startsWith('oai-authenticated-')||key.toLowerCase().startsWith('x-dc-identity-'))h.delete(key);return new Request(request,{headers:h});}
function setCookie(name:string,value:string,maxAge:number){return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;}
export function authGateway(db:D1Database,provider:AuthProvider,settings:AuthSettings&{externalPrivateKey?:JsonWebKey;legacyLinkUrl?:string;isolatedStaging?:boolean;userManagementEnabled?:boolean;managementConfig?:ProgramAuthorConfig}){
 const store=authStore(db,provider,settings),origin=new URL(settings.origin).origin;
 const flow=oauthFlow(settings.encryptionKey,origin,settings.now??Date.now);
 const linkUrl=settings.legacyLinkUrl?new URL(settings.legacyLinkUrl):null;
 if(linkUrl&&(linkUrl.protocol!=='https:'||linkUrl.username||linkUrl.password||linkUrl.search||linkUrl.hash||linkUrl.origin===origin))throw new Error('Invalid legacy bridge URL');
 const capabilities={canRegister:settings.allowNewAccounts,linkingReady:!!(linkUrl&&settings.externalPrivateKey&&settings.legacyPublicKey)};
 const reply=(status:number,value:unknown,cookies:string[]=[])=>{const h=new Headers({'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});cookies.forEach(c=>h.append('Set-Cookie',c));return new Response(JSON.stringify(value),{status,headers:h});};
 return {store,async handle(input:Request,next:(request:Request)=>Promise<Response>){const req=sanitize(input),url=new URL(req.url),sid=cookie(req,sessionCookie),at=settings.now??Date.now;
  if(url.origin!==origin)return reply(421,{error:'Wrong application origin'});
  if(url.pathname.startsWith('/api/')&&!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.get('origin')!==origin)return reply(403,{error:'Same-origin mutation required'});
  if(url.pathname==='/mcp')return reply(503,{error:'Standalone MCP OAuth is not configured'});
  if(['/signin-with-chatgpt','/signout-with-chatgpt'].includes(url.pathname)){const target=url.pathname.startsWith('/signout')?'/auth/signout':'/auth/signin';return Response.redirect(origin+target+'?return_to='+encodeURIComponent(safeReturn(url.searchParams.get('return_to'))),303);}
  if(req.method==='GET'&&['/auth/signin','/auth/signout'].includes(url.pathname))return authPage({signout:url.pathname.endsWith('signout'),returnTo:safeReturn(url.searchParams.get('return_to')),english:url.searchParams.get('lang')==='en',isolatedStaging:settings.isolatedStaging});
  if(url.pathname==='/auth/oauth/callback'){
   if(req.method!=='GET')return reply(405,{error:'GET required'});
   let target='/',english=false,problem='failed';
   try{
    const state=await flow.read(cookie(req,oauthCookie));target=safeReturn(state.returnTo);english=state.english;
    if(url.searchParams.has('error')){if(url.searchParams.get('error')==='access_denied')problem='cancelled';throw new AuthFailure(401);}
    const codes=url.searchParams.getAll('code');if(codes.length!==1||!codes[0]||!provider.oauth)throw new AuthFailure(401);
    const tokens=await provider.oauth.exchange(codes[0],state.verifier),r=await store.acceptOAuth(tokens);
    if(state.previousSid)await store.logout(state.previousSid);
    const destination=r.user?origin+target:origin+'/auth/signin?lang='+(english?'en':'he')+'&return_to='+encodeURIComponent(target);
    const headers=new Headers({Location:destination,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});headers.append('Set-Cookie',setCookie(sessionCookie,r.sid,43200));headers.append('Set-Cookie',oauthCookieValue('',0));headers.append('Set-Cookie',setCookie(challengeCookie,'',0));return new Response(null,{status:303,headers});
   }catch{
    const headers=new Headers({Location:origin+'/auth/signin?lang='+(english?'en':'he')+'&return_to='+encodeURIComponent(target)+'&oauth_error='+problem,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});headers.append('Set-Cookie',oauthCookieValue('',0));return new Response(null,{status:303,headers});
   }
  }
  if(url.pathname.startsWith('/auth/')){
   if(req.method!=='POST'||req.headers.get('origin')!==origin||req.headers.get('sec-fetch-site')==='cross-site')return reply(403,{error:'Same-origin POST required'});
   try{if(!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')??''))throw new AuthFailure(400);const raw=await req.text();if(raw.length>12000)throw new AuthFailure(413);const payload=JSON.parse(raw) as Record<string,unknown>;if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new AuthFailure(400);
    if(url.pathname==='/auth/pending')return reply(200,await store.pending(cookie(req,challengeCookie)));
    if(url.pathname==='/auth/providers')return reply(200,provider.oauth?await provider.oauth.enabled():{google:false,apple:false});
    if(url.pathname==='/auth/oauth/start'){
     if(!isSocialProvider(payload.provider))throw new AuthFailure(400);
     await store.limitOAuth(req.headers.get('cf-connecting-ip')??'unknown');
     if(!provider.oauth||!(await provider.oauth.enabled())[payload.provider])throw new AuthFailure(503);
     const state=await flow.start(payload.provider,safeReturn(typeof payload.returnTo==='string'?payload.returnTo:null),payload.english===true,sid);
     return reply(200,{url:provider.oauth.authorizationUrl(payload.provider,origin+'/auth/oauth/callback',state.challenge)},[oauthCookieValue(state.value)]);
    }
    if(url.pathname==='/auth/send'){const r=await store.send(String(payload.email??''),req.headers.get('cf-connecting-ip')??'unknown');return reply(200,{sent:true},[setCookie(challengeCookie,r.challenge,600)]);}
    if(url.pathname==='/auth/verify'){const r=await store.verify(cookie(req,challengeCookie),String(payload.code??''));if(sid)await store.logout(sid);return reply(200,{authenticated:true,linked:!!r.user,...capabilities},[setCookie(sessionCookie,r.sid,43200),setCookie(challengeCookie,'',0)]);}
    if(url.pathname==='/auth/status'||url.pathname==='/auth/refresh'){const r=await store.current(sid);return reply(200,{authenticated:true,linked:!!r.user,email:r.email,...capabilities});}
    if(url.pathname==='/auth/register'){if(payload.confirmed!==true)throw new AuthFailure(400);await store.register(sid);return reply(200,{linked:true});}
    if(url.pathname==='/auth/link/start'){if(!settings.externalPrivateKey)throw new AuthFailure(503,'Account linking not configured');const r=await store.current(sid);if(r.user)throw new AuthFailure(409);if(at()-r.authenticatedAt>10*60000)throw new AuthFailure(401);const proof=await signLink({iss:origin,aud:settings.legacyIssuer,sub:r.subject,target:r.subject,email:r.email,nonce:random(),iat:at(),exp:at()+5*60000},settings.externalPrivateKey);return reply(200,{proof,...(capabilities.linkingReady?{handoffUrl:linkUrl!.href+'#request='+encodeURIComponent(proof)}:{})});}
    if(url.pathname==='/auth/link/inspect')return reply(200,await store.inspectLink(sid,String(payload.proof??'')));
    if(url.pathname==='/auth/link'){await store.link(sid,String(payload.proof??''),payload.confirmed===true);return reply(200,{linked:true});}
    if(url.pathname==='/auth/logout'){await store.logout(sid);return reply(200,{signedOut:true},[setCookie(sessionCookie,'',0),setCookie(challengeCookie,'',0),oauthCookieValue('',0)]);}
    return reply(404,{error:'Not found'});
   }catch(e){const status=e instanceof AuthFailure?e.status:(e as {status?:number}).status??401;return reply(status>=400&&status<=599?status:401,{error:status===429?'Too many attempts. Try later.':status===409?'Existing account needs ownership verification.':status===503?'Sign-in configuration is incomplete.':'Sign-in failed. Check the code or sign in again.'});}
  }
  let user=null;try{if(sid){user=(await store.current(sid)).user;if(!user&&url.pathname.startsWith('/api/'))console.warn('DC_AUTH_DIAG account_unmapped');}}catch(e){if(url.pathname.startsWith('/api/'))console.warn('DC_AUTH_DIAG session_validation_denied');if((e as {status?:number}).status===503&&url.pathname.startsWith('/api/'))return reply(503,{error:'Sign-in service temporarily unavailable. Try again.'});/* Invalid sessions never fall back to browser headers. */}
  if(settings.userManagementEnabled){
   const management=userManagement(db,settings.managementConfig);
   const managementPath=url.pathname==='/api/user-management';
   try{
    if(user){await management.assertActive(user);}
    if(managementPath){
     if(!user)return reply(401,{error:'Sign in required'});
     if(req.method==='GET'){
      if(url.searchParams.has('history'))return reply(200,await management.history(user,url.searchParams.get('history')!,Number(url.searchParams.get('page')??0)));
      return reply(200,await management.list(user,{search:url.searchParams.get('search')??'',filter:url.searchParams.get('filter')??'all',page:url.searchParams.get('page')??0}));
     }
     if(req.method!=='POST')return reply(405,{error:'GET or POST required'});
     if(!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')??''))return reply(400,{error:'JSON required'});
     const raw=await req.text();if(raw.length>8000)return reply(413,{error:'Request too large'});
     let payload;try{payload=JSON.parse(raw);}catch{return reply(400,{error:'Invalid JSON'});}
     const {action,...change}=payload??{};
     if(action==='update')return reply(200,await management.update(user,change));
     if(action==='secretary')return reply(200,await management.grant(user,change));
     return reply(400,{error:'Unknown action'});
    }
    if(user&&url.pathname.startsWith('/api/')){
     const grant=await management.permission(user);
     // Administrative delegation never implies clinical access, even if the
     // secretary also has a physician label or legacy email allowlist entry.
     if(grant==='secretary')return reply(403,{error:'Administrative account: use user management'});
     const protectedAdmin=['/api/admin/','/api/google-calendar','/api/nutrition-credentials'];
     if(grant!=='owner'&&protectedAdmin.some(p=>url.pathname.startsWith(p)))return reply(403,{error:'Owner permission required'});
     if(req.method==='POST'&&['/api/care/team','/api/care'].includes(url.pathname)){
      const raw=await req.clone().text();if(raw.length>64000)return reply(413,{error:'Request too large'});
      let body;try{body=JSON.parse(raw);}catch{return reply(400,{error:'Invalid JSON'});}
      if(body?.action==='staff'||body?.action==='teamAssignment')return reply(403,{error:'Use confirmed user management'});
     }
    }
   }catch(e){const status=(e as {status?:number}).status??503;return reply(status,{error:status===503?'Management service unavailable':(e as Error).message});}
  }else if(url.pathname==='/api/user-management')return reply(503,{error:'User management is awaiting approved activation'});
  // This is the ONLY public Worker entrypoint. All request identity headers are
  // stripped above; the existing 51 APIs consume this server-verified principal.
  if(user){const h=new Headers(req.headers);if(settings.userManagementEnabled){h.set('x-dc-identity-management-mode','uid');h.set('x-dc-identity-management-permission',(await userManagement(db,settings.managementConfig).permission(user))??'none');}h.set('oai-authenticated-user-id',user.userId);h.set('oai-authenticated-user-email',user.email);h.set('oai-authenticated-user-full-name',encodeURIComponent(user.displayName));h.set('oai-authenticated-user-full-name-encoding','percent-encoded-utf-8');return next(new Request(req,{headers:h}));}
  return next(req);
 }};
}
