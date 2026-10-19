/** Candidate bridge for the OLD Sites runtime. Not installed or published there.
 * getLegacyUser must be the existing trusted Sites server adapter, not headers
 * supplied to the standalone Worker. No query-string identity is ever accepted.
 */
import {signLink,verifyLink,random} from './crypto.ts';
import {legacyLinkPage} from './legacy-link-page.ts';
export function legacyLinkBridge(options:{oldOrigin:string;standaloneOrigin:string;legacyIssuer:string;externalPublicKey:JsonWebKey;legacyPrivateKey:JsonWebKey;getLegacyUser:()=>Promise<{userId:string;email:string}|null>;now?:()=>number}){
 const now=options.now??Date.now;
 return async(request:Request)=>{
  if(new URL(request.url).origin!==options.oldOrigin)return Response.json({error:'Forbidden'},{status:403});
  if(request.method==='GET')return legacyLinkPage(options.standaloneOrigin,new URL(request.url).searchParams.get('lang')==='en');
  if(request.method!=='POST'||request.headers.get('origin')!==options.oldOrigin)return Response.json({error:'Forbidden'},{status:403});
  const user=await options.getLegacyUser();if(!user)return Response.json({error:'Authentication required'},{status:401});
  try{const text=await request.text();if(text.length>12000)throw new Error('Too large');const payload=JSON.parse(text);if(payload.action!=='inspect'&&payload.confirmed!==true)throw new Error('Confirmation required');const proof=await verifyLink(payload.proof,options.externalPublicKey,options.standaloneOrigin,options.legacyIssuer,now());if(proof.sub!==proof.target)throw new Error('Wrong target');
   if(payload.action==='inspect')return Response.json({existingEmail:user.email,signInEmail:proof.email},{headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
   const token=await signLink({iss:options.legacyIssuer,aud:options.standaloneOrigin,sub:user.userId,target:proof.sub,email:user.email.toLowerCase(),nonce:random(),iat:now(),exp:now()+5*60000},options.legacyPrivateKey);
   return Response.json({proof:token},{headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  }catch{return Response.json({error:'Invalid or expired proof'},{status:403,headers:{'Cache-Control':'no-store'}});}
 };
}
