// Development-only route factory. Nothing imports or installs it in the pilot.
// A future old-runtime route must supply its trusted server-session adapter.
import {legacyLinkBridge} from './legacy-bridge.ts';
type LegacyUser={userId:string;email:string};
type Config={enabled:boolean;oldOrigin:string;standaloneOrigin:string;legacyIssuer:string;externalPublicKey:JsonWebKey;legacyPrivateKey:JsonWebKey};
function canonicalOrigin(value:string){const u=new URL(value);if(u.protocol!=='https:'||u.origin!==value||u.username||u.password)throw new Error('Pinned HTTPS origins required');return u.origin;}
export function createLegacyMigrationRoute(config:Config,getTrustedUser:()=>Promise<LegacyUser|null>){
 if(!config.enabled)return async()=>new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
 const oldOrigin=canonicalOrigin(config.oldOrigin),target=canonicalOrigin(config.standaloneOrigin);
 if(oldOrigin===target||!config.legacyIssuer||config.legacyIssuer!==config.legacyIssuer.trim())throw new Error('Distinct origins and an exact legacy issuer required');
 const bridge=legacyLinkBridge({...config,getLegacyUser:async()=>{
  const user=await getTrustedUser();
  if(!user||!user.userId||user.userId!==user.userId.trim()||user.userId.length>255||!/^\S+@\S+\.\S+$/.test(user.email))return null;
  return user;
 }});
 return async(request:Request)=>{
  const url=new URL(request.url);let response:Response;
  if(url.origin!==oldOrigin||url.pathname!=='/account/migrate')response=new Response('Not found',{status:404});
  else if(request.method!=='GET'&&request.method!=='POST')response=new Response('Method not allowed',{status:405,headers:{Allow:'GET, POST'}});
  else if(request.method==='POST'&&(request.headers.get('origin')!==oldOrigin||request.headers.get('sec-fetch-site')==='cross-site'||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')??'')))response=new Response('Forbidden',{status:403});
  else{try{response=await bridge(request);}catch{response=Response.json({error:'Trusted session service unavailable'},{status:503});}}
  const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');headers.set('Referrer-Policy','no-referrer');headers.set('X-Content-Type-Options','nosniff');
  return new Response(response.body,{status:response.status,headers});
 };
}
