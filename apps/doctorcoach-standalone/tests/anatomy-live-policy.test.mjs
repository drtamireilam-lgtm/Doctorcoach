import test from 'node:test';
import assert from 'node:assert/strict';
import {allowPublicRequest,LAB_ORIGIN} from '../scripts/anatomy/live-public-policy.mjs';
test('live probe permits only anonymous read methods on the exact LAB origin',()=>{
 for(const method of ['GET','HEAD'])assert.ok(allowPublicRequest(LAB_ORIGIN+'/anatomy/shoulder.glb',method));
 for(const url of ['https://example.com/','http://doctorcoach-isolated-staging.dr-tamireilam.workers.dev/','https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev.evil.com/',LAB_ORIGIN+'/api/auth/login',LAB_ORIGIN+'/logout','invalid'])assert.equal(allowPublicRequest(url,'GET'),false,url);
 for(const method of ['POST','PUT','PATCH','DELETE'])assert.equal(allowPublicRequest(LAB_ORIGIN+'/',method),false);
});
