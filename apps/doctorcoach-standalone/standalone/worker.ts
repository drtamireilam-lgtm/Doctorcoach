import {validateStaging,stagingAuthFetch} from './staging-policy.ts';
import handler from 'vinext/server/fetch-handler';
import {authGateway} from './gateway.ts';
import {supabaseProvider} from './provider.ts';
import {pushStore} from '../lib/push-store';
import {pushConfig} from '../lib/push-config';
import {legacyHandoffUrl} from './legacy-handoff.ts';
export default {async fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){
 try{
  validateStaging(env);
  if(!env.DB||!env.BUCKET||!env.DC_AUTH_ORIGIN||!env.DC_SUPABASE_URL||!env.DC_SUPABASE_PUBLIC_KEY||!env.DC_SESSION_KEY||!env.DC_LEGACY_ISSUER)throw new Error('Standalone configuration required');
  const provider=supabaseProvider(env.DC_SUPABASE_URL,env.DC_SUPABASE_PUBLIC_KEY,env.DC_DEPLOYMENT_ENV==='isolated-staging'?stagingAuthFetch():fetch);
  const gateway=authGateway(env.DB,provider,{managementConfig:{clinicianEmails:env.DOCTORCOACH_CLINICIAN_EMAILS,operationsEmails:env.DOCTORCOACH_OPERATIONS_EMAILS,ownerProgramEmails:(env.DOCTORCOACH_CLINICIAN_EMAILS??'').split(',').map(e=>e.trim().toLowerCase()).filter(e=>(env.DOCTORCOACH_ADMIN_EMAILS??'').split(',').some(a=>a.trim().toLowerCase()===e)).join(',')},userManagementEnabled:(env as unknown as Record<string,string>).DC_USER_MANAGEMENT_ENABLED==='true',isolatedStaging:env.DC_DEPLOYMENT_ENV==='isolated-staging',legacyLinkUrl:legacyHandoffUrl(env.DC_LEGACY_BRIDGE_ENABLED==='true',env.DC_LEGACY_ORIGIN,env.DC_AUTH_ORIGIN),origin:env.DC_AUTH_ORIGIN,legacyIssuer:env.DC_LEGACY_ISSUER,encryptionKey:env.DC_SESSION_KEY,allowNewAccounts:env.DC_NEW_ACCOUNTS_ENABLED==='true',reservedEmails:[env.DOCTORCOACH_ADMIN_EMAILS,env.DOCTORCOACH_CLINICIAN_EMAILS,env.DOCTORCOACH_OPERATIONS_EMAILS].filter(Boolean).join(',').split(',').map(x=>x.trim()).filter(Boolean),legacyPublicKey:env.DC_LEGACY_PUBLIC_JWK?JSON.parse(env.DC_LEGACY_PUBLIC_JWK):undefined,externalPrivateKey:env.DC_LINK_PRIVATE_JWK?JSON.parse(env.DC_LINK_PRIVATE_JWK):undefined});
  return await gateway.handle(request,async trusted=>{
   const response=await handler.fetch(trusted,env,ctx);
   if(response.ok&&trusted.method==='POST'&&new URL(trusted.url).pathname.startsWith('/api/'))ctx.waitUntil(pushStore(env.DB!,{adminEmails:env.DOCTORCOACH_ADMIN_EMAILS,clinicianEmails:env.DOCTORCOACH_CLINICIAN_EMAILS},pushConfig(env)).dispatch());
   return response;
  });
 }catch{return Response.json({error:'Standalone service is not ready. No identity fallback is allowed.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}};
