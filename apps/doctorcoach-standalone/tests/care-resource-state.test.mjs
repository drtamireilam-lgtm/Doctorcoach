import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyResource,resourceForUrl,failedResource} from '../lib/care-resource-state.ts';
const a={url:'/api/care?client=A',data:{name:'A',medical:'private A'},error:'',status:200,loading:false};
test('switching client URL immediately hides all previous data and status before the next response',()=>{
 const view=resourceForUrl(a,'/api/care?client=B');
 assert.deepEqual(view,emptyResource('/api/care?client=B'));
 assert.ok(!JSON.stringify(view).includes('private A'));
 assert.equal(resourceForUrl(a,a.url),a);
});
test('network failure for a different client never exposes the prior client snapshot',()=>{
 const view=failedResource(a,'/api/care?client=B','offline',0);
 assert.equal(view.data,null);assert.equal(view.error,'offline');assert.equal(view.loading,false);
});
test('revoked, signed-out and deleted resources discard cached data, while transient same-resource failures retain it explicitly',()=>{
 for(const status of [401,403,404])assert.equal(failedResource(a,a.url,'denied',status).data,null);
 assert.deepEqual(failedResource(a,a.url,'offline',0).data,a.data);
});
test('story consent/version conflicts discard public and management cached content only',()=>{
 for(const url of ['/api/stories','/api/stories?mode=public','/api/stories?mode=manage'])assert.equal(failedResource({...a,url},url,'changed',409).data,null);
 const own='/api/stories?mode=mine';assert.deepEqual(failedResource({...a,url:own},own,'conflict',409).data,a.data);
 assert.deepEqual(failedResource(a,a.url,'conflict',409).data,a.data);
});
