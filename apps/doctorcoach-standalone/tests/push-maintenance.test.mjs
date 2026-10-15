import test from 'node:test';
import assert from 'node:assert/strict';
import {pushMaintenance} from '../lib/push-maintenance.ts';
test('unattended dispatch rejects anonymous and non-admin callers before data access',async()=>{
 let calls=0;const ops={status:async()=>{calls++;},dispatch:async()=>{calls++;}};
 for(const user of [null,{userId:'visitor',email:'visitor@example.test'}])await assert.rejects(pushMaintenance(user,'owner@example.test','dispatch_notifications',ops),e=>e.status===403);
 assert.equal(calls,0);
});
test('admin readiness is read-only and dispatch returns only its aggregate result',async()=>{
 let sends=0;const user={userId:'owner',email:'owner@example.test'},ops={status:async()=>({configured:true}),dispatch:async()=>{sends++;return {configured:true,sent:0};}};
 assert.deepEqual(await pushMaintenance(user,user.email,'push_status',ops),{configured:true});assert.equal(sends,0);
 assert.deepEqual(await pushMaintenance(user,user.email,'dispatch_notifications',ops),{configured:true,sent:0});assert.equal(sends,1);
 await assert.rejects(pushMaintenance(user,user.email,'unknown',ops));assert.equal(sends,1);
});
