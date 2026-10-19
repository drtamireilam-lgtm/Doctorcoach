import handler from 'vinext/server/fetch-handler';
import {pushStore} from './lib/push-store';
import {pushConfig} from './lib/push-config';
export default {
 async fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){
  const response=await handler.fetch(request,env,ctx);
  // Sites uses a Workers-for-Platforms dispatch namespace, where native cron
  // triggers are unavailable. Successful data changes can wake recipients
  // even when their own app is closed. No browser polling is needed for this.
  if(env.DB&&response.ok&&request.method==='POST'&&new URL(request.url).pathname.startsWith('/api/')){
   ctx.waitUntil(pushStore(env.DB,{adminEmails:env.DOCTORCOACH_ADMIN_EMAILS,clinicianEmails:env.DOCTORCOACH_CLINICIAN_EMAILS},pushConfig(env)).dispatch());
  }
  return response;
 },
};
