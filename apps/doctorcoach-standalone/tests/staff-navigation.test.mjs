import test from 'node:test';
import assert from 'node:assert/strict';
import {staffClientHref,staffClientTarget,visibleStaffClients} from '../lib/staff-navigation.ts';
test('staff links preserve encoded client identity and restrict destinations to known file sections',()=>{
 const id='test+person&tab=documents';
 assert.deepEqual(staffClientTarget(staffClientHref(id,'messages')),{client:id,tab:'messages'});
 assert.deepEqual(staffClientTarget('#team?client=abc&tab=admin'),{client:'abc',tab:'summary'});
 assert.deepEqual(staffClientTarget('#care?client=abc'),{client:null,tab:'summary'});
});
test('pending filter searches only supplied authorized roster and orders by pending work without mutating it',()=>{
 const base={goal:'Strength',updatedAt:'2026-10-14',pendingCheckins:0,pendingVideos:0};
 const clients=[{...base,userId:'1',name:'First'},{...base,userId:'2',name:'Second',pendingCheckins:1},{...base,userId:'3',name:'Third',pendingVideos:2}];
 assert.deepEqual(visibleStaffClients(clients,' strength ',true).map(c=>c.userId),['3','2']);
 assert.deepEqual(visibleStaffClients(clients,' SECOND ',true).map(c=>c.userId),['2']);
 assert.deepEqual(clients.map(c=>c.userId),['1','2','3']);
 assert.equal(visibleStaffClients(clients,'missing').length,0);
});
