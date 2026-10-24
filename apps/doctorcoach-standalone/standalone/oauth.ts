import {random,tokenVault} from './crypto.ts';
import {AuthFailure} from './provider.ts';
export const oauthCookie='__Host-dc_oauth';
export type SocialProvider='google'|'apple';
export type OAuthChallenge={provider:SocialProvider;verifier:string;returnTo:string;english:boolean;previousSid:string;expiresAt:number};
export function isSocialProvider(value:unknown):value is SocialProvider{return value==='google'||value==='apple';}
export function oauthCookieValue(value:string,maxAge=600){return `${oauthCookie}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;}
export function oauthFlow(encryptionKey:string,origin:string,now=Date.now){
 const vault=tokenVault(encryptionKey),context='doctorcoach-oauth-v1:'+origin;
 return {
  async start(provider:SocialProvider,returnTo:string,english:boolean,previousSid:string){
   const verifier=random(),bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
   const challenge=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
   const value=await vault.seal({provider,verifier,returnTo,english,previousSid,expiresAt:now()+600000} satisfies OAuthChallenge,context);
   return {challenge,value};
  },
  async read(value:string):Promise<OAuthChallenge>{
   if(!value||value.length>3500)throw new AuthFailure(401);
   let result:OAuthChallenge;try{result=await vault.open<OAuthChallenge>(value,context);}catch{throw new AuthFailure(401);}
   if(!result||!isSocialProvider(result.provider)||!Number.isSafeInteger(result.expiresAt)||result.expiresAt<=now()||result.expiresAt>now()+600000||!/^[-A-Za-z0-9._~]{43,128}$/.test(result.verifier)||typeof result.returnTo!=='string'||typeof result.english!=='boolean'||typeof result.previousSid!=='string')throw new AuthFailure(401);
   return result;
  },
 };
}
