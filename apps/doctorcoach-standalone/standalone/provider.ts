import {supabaseGetUserTransport,supabaseIdentityVerifier} from '../lib/supabase-identity.ts';
import type {IdentityClaims} from '../lib/identity-mapping.ts';
import type {SocialProvider} from './oauth.ts';
export type Tokens={access_token:string;refresh_token:string;expires_at:number};
export type AuthProof={claims:IdentityClaims;email:string};
export type AuthProvider={issuer:string;send(email:string):Promise<void>;verify(email:string,code:string):Promise<Tokens>;refresh(token:string):Promise<Tokens>;authenticate(token:string):Promise<AuthProof|null>;logout(token:string):Promise<void>;oauth?:{enabled():Promise<Record<SocialProvider,boolean>>;authorizationUrl(provider:SocialProvider,callback:string,challenge:string):string;exchange(code:string,verifier:string):Promise<Tokens>}};
export class AuthFailure extends Error{status:number;constructor(status:number,message='Authentication failed'){super(message);this.status=status;}}
export function supabaseProvider(projectUrl:string,key:string,request:typeof fetch=fetch,now=Date.now):AuthProvider{
 const getUser=supabaseGetUserTransport(projectUrl,key,request),issuer=new URL('/auth/v1',projectUrl).href;
 async function call(path:string,body:unknown,token?:string){let r:Response;try{r=await request(new URL(path,projectUrl),{method:'POST',headers:{apikey:key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(8000)});}catch{throw new AuthFailure(503,'Provider unavailable');}if(!r.ok)throw new AuthFailure(r.status===429?429:401);return r;}
 async function tokens(r:Response):Promise<Tokens>{const j=await r.json() as Partial<Tokens>&{expires_in?:number};if(typeof j.access_token!=='string'||j.access_token.length>16000||typeof j.refresh_token!=='string'||j.refresh_token.length>8000||!Number.isSafeInteger(j.expires_in)||j.expires_in!<=0)throw new AuthFailure(401);return {access_token:j.access_token,refresh_token:j.refresh_token,expires_at:now()+j.expires_in!*1000};}
 return {issuer,
  oauth:{
   async enabled(){try{const r=await request(new URL('/auth/v1/settings',projectUrl),{headers:{apikey:key},redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(5000)});if(!r.ok)return {google:false,apple:false};const value=await r.json() as {external?:Record<string,unknown>};return {google:value.external?.google===true,apple:value.external?.apple===true};}catch{return {google:false,apple:false};}},
   authorizationUrl(provider,callback,challenge){if(!['google','apple'].includes(provider)||!/^[-\w]{43}$/.test(challenge)||new URL(callback).protocol!=='https:')throw new AuthFailure(400);const url=new URL('/auth/v1/authorize',projectUrl);url.search=new URLSearchParams({provider,redirect_to:callback,code_challenge:challenge,code_challenge_method:'s256'}).toString();return url.href;},
   async exchange(code,verifier){if(!/^[A-Za-z0-9_-]{1,2048}$/.test(code)||!/^[-A-Za-z0-9._~]{43,128}$/.test(verifier))throw new AuthFailure(400);return tokens(await call('/auth/v1/token?grant_type=pkce',{auth_code:code,code_verifier:verifier}));},
  },
  async send(email){await call('/auth/v1/otp',{email,create_user:true});},
  async verify(email,code){return tokens(await call('/auth/v1/verify',{email,token:code,type:'email'}));},
  async refresh(token){return tokens(await call('/auth/v1/token?grant_type=refresh_token',{refresh_token:token}));},
  async authenticate(token){let email='',unavailable=false;const verifier=supabaseIdentityVerifier({issuer,now,primaryMethods:['otp','oauth'],getUser:async proof=>{const r=await getUser(proof);if(r.error==='Provider unavailable')unavailable=true;email=String((r.data.user as {email?:string}|null)?.email??'').trim().toLowerCase();return r;},checkSession:async()=>{try{const r=await call('/rest/v1/rpc/doctorcoach_staging_session_active',{},token);return await r.json()===true;}catch(e){if(e instanceof AuthFailure&&e.status===503)unavailable=true;throw e;}}});const claims=await verifier(token);if(unavailable)throw new AuthFailure(503,'Provider unavailable');return claims&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?{claims,email}:null;},
  async logout(token){await call('/auth/v1/logout?scope=local',{},token);},
 };
}
