import {authStore,type AuthSettings} from './auth-store.ts';
import {AuthFailure,type AuthProvider} from './provider.ts';
import {authPage} from './page.ts';
import {signLink,random} from './crypto.ts';
export const sessionCookie='__Host-dc_session',challengeCookie='__Host-dc_challenge';
export function cookie(request:Request,name:string){const matches=(request.headers.get('cookie')??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name+'='));return matches.length===1?matches[0].slice(name.length+1):'';}
export function safeReturn(value:string|null){if(!value||!value.startsWith('/')||value.startsWith('//'))return '/';try{const u=new URL(value,'https://app.local');if(u.origin!=='https://app.local'||/^\/(auth(?:\/|$)|sign(?:in|out)-with-chatgpt|callback)/.test(u.pathname))return '/';return u.pathname+u.search+u.hash;}catch{return '/';}}
export function sanitize(request:Request){const h=new Headers(request.headers);for(const key of Array.from(h.keys()))if(key.toLowerCase().startsWith('oai-authenticated-')||key.toLowerCase().startsWith('x-dc-identity-'))h.delete(key);return new Request(request,{headers:h});}
function setCookie(name:string,value:string,maxAge:number){return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;}
export function authGateway(db:D1Database,provider:AuthProvider,settings:AuthSettings&{externalPrivateKey?:JsonWebKey;legacyLinkUrl?:string;isolatedStaging?:boolean}){
 const store=authStore(db,provider,settings),origin=new URL(settings.origin).origin;
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
  if(url.pathname.startsWith('/auth/')){
   if(req.method!=='POST'||req.headers.get('origin')!==origin||req.headers.get('sec-fetch-site')==='cross-site')return reply(403,{error:'Same-origin POST required'});
   try{if(!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')??''))throw new AuthFailure(400);const raw=await req.text();if(raw.length>12000)throw new AuthFailure(413);const payload=JSON.parse(raw) as Record<string,unknown>;if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new AuthFailure(400);
    if(url.pathname==='/auth/pending')return reply(200,await store.pending(cookie(req,challengeCookie)));
    if(url.pathname==='/auth/send'){const r=await store.send(String(payload.email??''),req.headers.get('cf-connecting-ip')??'unknown');return reply(200,{sent:true},[setCookie(challengeCookie,r.challenge,600)]);}
    if(url.pathname==='/auth/verify'){const r=await store.verify(cookie(req,challengeCookie),String(payload.code??''));if(sid)await store.logout(sid);return reply(200,{authenticated:true,linked:!!r.user,...capabilities},[setCookie(sessionCookie,r.sid,43200),setCookie(challengeCookie,'',0)]);}
    if(url.pathname==='/auth/status'||url.pathname==='/auth/refresh'){const r=await store.current(sid);return reply(200,{authenticated:true,linked:!!r.user,email:r.email,...capabilities});}
    if(url.pathname==='/auth/register'){if(payload.confirmed!==true)throw new AuthFailure(400);await store.register(sid);return reply(200,{linked:true});}
    if(url.pathname==='/auth/link/start'){if(!settings.externalPrivateKey)throw new AuthFailure(503,'Account linking not configured');const r=await store.current(sid);if(r.user)throw new AuthFailure(409);if(at()-r.authenticatedAt>10*60000)throw new AuthFailure(401);const proof=await signLink({iss:origin,aud:settings.legacyIssuer,sub:r.subject,target:r.subject,email:r.email,nonce:random(),iat:at(),exp:at()+5*60000},settings.externalPrivateKey);return reply(200,{proof,...(capabilities.linkingReady?{handoffUrl:linkUrl!.href+'#request='+encodeURIComponent(proof)}:{})});}
    if(url.pathname==='/auth/link/inspect')return reply(200,await store.inspectLink(sid,String(payload.proof??'')));
    if(url.pathname==='/auth/link'){await store.link(sid,String(payload.proof??''),payload.confirmed===true);return reply(200,{linked:true});}
    if(url.pathname==='/auth/logout'){await store.logout(sid);return reply(200,{signedOut:true},[setCookie(sessionCookie,'',0),setCookie(challengeCookie,'',0)]);}
    return reply(404,{error:'Not found'});
   }catch(e){const status=e instanceof AuthFailure?e.status:(e as {status?:number}).status??401;return reply(status>=400&&status<=599?status:401,{error:status===429?'Too many attempts. Try later.':status===409?'Existing account needs ownership verification.':status===503?'Sign-in configuration is incomplete.':'Sign-in failed. Check the code or sign in again.'});}
  }
  let user=null;try{if(sid){user=(await store.current(sid)).user;if(!user&&url.pathname.startsWith('/api/'))console.warn('DC_AUTH_DIAG account_unmapped');}}catch(e){if(url.pathname.startsWith('/api/'))console.warn('DC_AUTH_DIAG session_validation_denied');if((e as {status?:number}).status===503&&url.pathname.startsWith('/api/'))return reply(503,{error:'Sign-in service temporarily unavailable. Try again.'});/* Invalid sessions never fall back to browser headers. */}
  // This is the ONLY public Worker entrypoint. All request identity headers are
  // stripped above; the existing 51 APIs consume this server-verified principal.
  if(user){const h=new Headers(req.headers);h.set('oai-authenticated-user-id',user.userId);h.set('oai-authenticated-user-email',user.email);h.set('oai-authenticated-user-full-name',encodeURIComponent(user.displayName));h.set('oai-authenticated-user-full-name-encoding','percent-encoded-utf-8');return next(new Request(req,{headers:h}));}
  return next(req);
 }};
}
