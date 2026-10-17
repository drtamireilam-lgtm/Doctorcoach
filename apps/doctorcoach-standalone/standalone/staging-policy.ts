// Dedicated synthetic staging only. Never enable this policy on the pilot.
export const STAGING_PROJECT='https://jbfkzkzcznfacsjdawmf.supabase.co';
const authPaths=new Set(['/auth/v1/otp','/auth/v1/verify','/auth/v1/user','/auth/v1/token','/auth/v1/logout','/rest/v1/rpc/doctorcoach_staging_session_active']);
export function validateStaging(env:Cloudflare.Env){
 if(env.DC_DEPLOYMENT_ENV!=='isolated-staging')return;
 const origin=new URL(env.DC_AUTH_ORIGIN??'');
 if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password||origin.origin!=='https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev')throw new Error('Dedicated HTTPS staging origin required');
 if(env.DC_SUPABASE_URL!==STAGING_PROJECT||!/^sb_publishable_[\w-]+$/.test(env.DC_SUPABASE_PUBLIC_KEY??''))throw new Error('Staging identity project required');
 if(env.DC_LEGACY_ISSUER!=='doctorcoach:isolated-staging'||env.DC_LEGACY_BRIDGE_ENABLED!=='false'||env.DC_LEGACY_ORIGIN||env.DC_LEGACY_PUBLIC_JWK||env.DC_LINK_PRIVATE_JWK)throw new Error('Legacy imports disabled in staging');
 if(env.DOCTORCOACH_CALENDAR_CLIENT_ID||env.DOCTORCOACH_CALENDAR_ENCRYPTION_KEY||env.DOCTORCOACH_PUSH_PRIVATE_JWK||env.DOCTORCOACH_PUSH_PUBLIC_KEY||env.DOCTORCOACH_BILLING_MODE!=='manual')throw new Error('External integrations disabled in staging');
}
export function stagingAuthFetch(request:typeof fetch=fetch):typeof fetch{
 return async(input,init)=>{
  const url=new URL(input instanceof Request?input.url:String(input));
  if(url.origin!==STAGING_PROJECT||url.username||url.password||!authPaths.has(url.pathname))throw new Error('Staging identity egress denied');
  return request(input,{...init,redirect:'manual'});
 };
}
