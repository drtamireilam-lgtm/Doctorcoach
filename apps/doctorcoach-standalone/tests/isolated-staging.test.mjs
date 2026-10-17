import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStaging,stagingAuthFetch,STAGING_PROJECT} from '../standalone/staging-policy.ts';
const config={DC_DEPLOYMENT_ENV:'isolated-staging',DC_AUTH_ORIGIN:'https://staging.drtamireilam.com',DC_SUPABASE_URL:STAGING_PROJECT,DC_SUPABASE_PUBLIC_KEY:'sb_publishable_test',DC_LEGACY_ISSUER:'doctorcoach:isolated-staging',DC_LEGACY_BRIDGE_ENABLED:'false',DOCTORCOACH_BILLING_MODE:'manual'};
test('isolated staging fails closed on wrong project, bridge or live integrations',()=>{
 validateStaging(config);
 for(const patch of [{DC_SUPABASE_URL:'https://production.supabase.co'},{DC_SUPABASE_PUBLIC_KEY:'sb_secret_test'},{DC_AUTH_ORIGIN:'https://pilot.drtamireilam.com'},{DC_LEGACY_BRIDGE_ENABLED:'true'},{DC_LEGACY_PUBLIC_JWK:'{}'},{DOCTORCOACH_CALENDAR_CLIENT_ID:'live'},{DOCTORCOACH_PUSH_PUBLIC_KEY:'live'},{DOCTORCOACH_BILLING_MODE:'live'}])assert.throws(()=>validateStaging({...config,...patch}));
});
test('staging identity transport denies other origins and endpoints before making requests',async()=>{
 const calls=[];const f=stagingAuthFetch(async(input,init)=>{calls.push({input,init});return new Response('{}');});
 for(const u of ['https://production.supabase.co/auth/v1/user',STAGING_PROJECT+'/rest/v1/patients',STAGING_PROJECT+'/auth/v1/admin/users'])await assert.rejects(()=>f(u));
 assert.equal(calls.length,0);await f(STAGING_PROJECT+'/auth/v1/user');assert.equal(calls[0].init.redirect,'manual');
});
