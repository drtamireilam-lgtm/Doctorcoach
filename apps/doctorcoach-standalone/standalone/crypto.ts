const bytes=(v:string)=>new TextEncoder().encode(v);
export const digest=async(v:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes(v))),b=>b.toString(16).padStart(2,'0')).join('');
export const random=()=>crypto.randomUUID()+crypto.randomUUID();
const b64=(b:Uint8Array)=>btoa(String.fromCharCode(...b));
const unb64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export function tokenVault(secret:string){const keyBytes=unb64(secret);if(keyBytes.length!==32)throw new Error('32-byte session encryption key required');const key=crypto.subtle.importKey('raw',keyBytes,'AES-GCM',false,['encrypt','decrypt']);return {
 async seal(value:unknown,context:string){const iv=crypto.getRandomValues(new Uint8Array(12)),encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:bytes(context)},await key,bytes(JSON.stringify(value)));return b64(iv)+'.'+b64(new Uint8Array(encrypted));},
 async open<T>(value:string,context:string):Promise<T>{const [iv,payload,...extra]=value.split('.');if(extra.length)throw new Error('Invalid encrypted session');const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv),additionalData:bytes(context)},await key,unb64(payload));return JSON.parse(new TextDecoder().decode(decrypted));},
 };}
const enc=(o:unknown)=>b64(bytes(JSON.stringify(o))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const dec=(s:string)=>JSON.parse(new TextDecoder().decode(unb64(s.replaceAll('-','+').replaceAll('_','/'))));
export type LinkProof={iss:string;aud:string;sub:string;target:string;email:string;nonce:string;iat:number;exp:number};
// Node 24 exports alg=Ed25519; workerd expects the JOSE name EdDSA.
// Normalize only this known equivalent spelling; never discard incompatible algorithms.
function linkingKey(key:JsonWebKey):JsonWebKey{
 if(key.kty!=='OKP'||key.crv!=='Ed25519'||(key.alg!==undefined&&!['Ed25519','EdDSA'].includes(key.alg)))throw new Error('Ed25519 linking key required');
 return {...key,alg:'EdDSA'};
}
export async function signLink(proof:LinkProof,key:JsonWebKey){const k=await crypto.subtle.importKey('jwk',linkingKey(key),{name:'Ed25519'},false,['sign']);const body=enc(proof),sig=await crypto.subtle.sign('Ed25519',k,bytes(body));return body+'.'+b64(new Uint8Array(sig)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}
export async function verifyLink(token:string,key:JsonWebKey,issuer:string,audience:string,now=Date.now()):Promise<LinkProof>{
 if(!token||token.length>8000)throw new Error('Invalid link proof');const [body,sig,...extra]=token.split('.');if(extra.length||!body||!sig)throw new Error('Invalid link proof');const k=await crypto.subtle.importKey('jwk',linkingKey(key),{name:'Ed25519'},false,['verify']);if(!await crypto.subtle.verify('Ed25519',k,unb64(sig.replaceAll('-','+').replaceAll('_','/')),bytes(body)))throw new Error('Invalid link signature');const p=dec(body) as LinkProof;
 if(!p||p.iss!==issuer||p.aud!==audience||typeof p.sub!=='string'||!p.sub||p.sub.length>255||typeof p.target!=='string'||!p.target||p.target.length>255||typeof p.email!=='string'||!p.email||typeof p.nonce!=='string'||!/^[0-9a-f-]{72}$/.test(p.nonce)||!Number.isSafeInteger(p.iat)||!Number.isSafeInteger(p.exp)||p.iat>now+30000||p.exp<=now||p.exp-p.iat>5*60000||now-p.iat>5*60000)throw new Error('Expired or mismatched link proof');return p;
}
