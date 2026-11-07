import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

// No network access: this transport is the entire synthetic auth service.
export function syntheticAuthProvider({now=Date.now,code=sequence=>String(100000+sequence),firstExpiry=300}={}){
 const project='https://auth.example.test',identities=new Map(),issuances=new Map(),tokens=new Map(),refreshTokens=new Map(),sessions=new Map();
 let serial=0,issued=0,refreshCount=0;
 const mint=(session,first=false)=>{
  const at=Math.floor(now()/1000),token=[{alg:'ES256'},{iss:project+'/auth/v1',sub:session.subject,session_id:session.sid,aud:'authenticated',role:'authenticated',is_anonymous:false,iat:at,exp:at+300,amr:[{method:'otp',timestamp:session.primary}]}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).concat('synthetic-'+(++serial)).join('.');
  tokens.set(token,session);const refresh='synthetic-refresh-'+serial;refreshTokens.set(refresh,session);
  return {access_token:token,refresh_token:refresh,expires_in:first?firstExpiry:300};
 };
 const fixture={identities,outage:false,get refreshCount(){return refreshCount;},
  // Test-only checkpoint: tokens refer to session IDs so restored logout and
  // refresh state remain shared, rather than becoming independent JSON copies.
  snapshot:()=>({identities:[...identities],issuances:[...issuances],sessions:[...sessions],tokens:[...tokens].map(([token,s])=>[token,s.sid]),refreshTokens:[...refreshTokens].map(([token,s])=>[token,s.sid]),serial,issued,refreshCount,outage:fixture.outage}),
  restore(state){
   const replace=(map,rows)=>{map.clear();for(const [key,value] of rows)map.set(key,value);};
   replace(identities,state.identities);replace(issuances,state.issuances);replace(sessions,state.sessions);
   const references=rows=>rows.map(([token,sid])=>{assert.ok(sessions.has(sid),'Synthetic checkpoint session missing');return [token,sessions.get(sid)];});
   replace(tokens,references(state.tokens));replace(refreshTokens,references(state.refreshTokens));
   serial=state.serial;issued=state.issued;refreshCount=state.refreshCount;fixture.outage=state.outage;
  },
  codeFor:email=>issuances.get(email)?.code,
  sessionFor:token=>tokens.get(token),
  async fetch(req){
   const url=new URL(req.url);assert.equal(url.origin,project,'Blocked synthetic provider destination');
   const raw=['GET','HEAD'].includes(req.method)?'':await req.text(),body=raw?JSON.parse(raw):{};
   if(fixture.outage)return Response.json({error:'synthetic outage'},{status:503});
   if(url.pathname==='/auth/v1/settings')return Response.json({external:{google:false,apple:false}});
   if(url.pathname==='/auth/v1/otp'){
    const {email}=body;issuances.set(email,{id:randomUUID(),code:code(++issued),expiresAt:now()+600000,used:false});return Response.json({});
   }
   if(url.pathname==='/auth/v1/verify'){
    const {email,token}=body,issue=issuances.get(email);
    if(!issue||issue.used||issue.expiresAt<=now()||issue.code!==token)return Response.json({error:'invalid OTP'},{status:401});
    issue.used=true;let identity=identities.get(email);if(!identity){identity={subject:randomUUID()};identities.set(email,identity);}
    const session={subject:identity.subject,email,sid:randomUUID(),primary:Math.floor(now()/1000),revoked:false};sessions.set(session.sid,session);
    return Response.json(mint(session,true));
   }
   if(url.pathname==='/auth/v1/token'){
    const session=refreshTokens.get(body.refresh_token);
    if(!session||session.revoked)return Response.json({error:'invalid refresh'},{status:401});
    refreshTokens.delete(body.refresh_token);refreshCount++;return Response.json(mint(session));
   }
   const session=tokens.get((req.headers.get('authorization')??'').slice(7));
   if(url.pathname==='/auth/v1/user')return session&&!session.revoked?Response.json({id:session.subject,email:session.email,is_anonymous:false,email_confirmed_at:new Date(now()).toISOString()}):Response.json({}, {status:401});
   if(url.pathname.includes('/rpc/'))return Response.json(!!session&&!session.revoked);
   if(url.pathname==='/auth/v1/logout'){if(session)session.revoked=true;return Response.json({});}
   return Response.json({}, {status:404});
  },
 };
 return fixture;
}
