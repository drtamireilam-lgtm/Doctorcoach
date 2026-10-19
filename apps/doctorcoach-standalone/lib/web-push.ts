import {TrainingError} from './training.ts';
export type PushConfig={publicKey:string;privateJwk:string;subject:string};
export function pushEndpoint(value:unknown){
 if(typeof value!=='string'||value.length>4096)throw new TrainingError('כתובת Push לא תקינה.');
 let url:URL;try{url=new URL(value);}catch{throw new TrainingError('כתובת Push לא תקינה.');}
 const allowed=url.hostname==='web.push.apple.com'||url.hostname==='fcm.googleapis.com'||url.hostname==='updates.push.services.mozilla.com'||/^updates\.push\.services\.mozilla\.com$/.test(url.hostname);
 if(!allowed||url.protocol!=='https:'||url.port||url.username||url.password||url.hash||url.pathname==='/')throw new TrainingError('שירות Push זה אינו נתמך.');
 return url.href;
}
export const base64url=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
export async function pushDigest(value:string){return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))));}
export async function sendWebPush(endpoint:string,config:PushConfig,fetcher:typeof fetch=fetch){
 const url=pushEndpoint(endpoint),key=await crypto.subtle.importKey('jwk',JSON.parse(config.privateJwk),{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const encode=(value:unknown)=>base64url(new TextEncoder().encode(JSON.stringify(value)));
 const token=encode({typ:'JWT',alg:'ES256'})+'.'+encode({aud:new URL(url).origin,exp:Math.floor(Date.now()/1000)+3600,sub:config.subject});
 const signature=base64url(new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,new TextEncoder().encode(token))));
 // Empty-payload Web Push: no health data or notification content leaves the
 // server. The service worker always displays a fixed generic notification.
 // Workers support manual redirects. Never follow a provider redirect with
 // the VAPID authorization header; callers reject the returned non-2xx status.
 return fetcher(url,{method:'POST',redirect:'manual',signal:AbortSignal.timeout(10000),headers:{Authorization:`vapid t=${token}.${signature}, k=${config.publicKey}`,TTL:'0',Urgency:'normal'},body:null});
}
