import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleMessageThreads} from '../lib/message-navigation.ts';
const base={channel:'training',unread:0,latestAt:null,available:true};
const threads=[{...base,clientId:'a',name:'Alpha',latestAt:'2026-10-14T10:00:00Z',resolved:true},{...base,clientId:'b',name:'Beta',latestAt:'2026-10-13T10:00:00Z',unread:2},{...base,clientId:'c',name:'Empty'},{...base,clientId:'d',name:'Archived',available:false,latestAt:'2026-10-12T10:00:00Z',resolved:true},{...base,clientId:'e',name:'Revoked',available:false}];
test('inbox filters distinguish unread, open, resolved and empty threads without changing source',()=>{
 assert.deepEqual(visibleMessageThreads(threads,{filter:'unread'}).map(t=>t.clientId),['b']);
 assert.deepEqual(visibleMessageThreads(threads,{filter:'open'}).map(t=>t.clientId),['b']);
 assert.deepEqual(visibleMessageThreads(threads,{filter:'resolved'}).map(t=>t.clientId),['a','d']);
 assert.equal(visibleMessageThreads(threads)[0].clientId,'b');
 assert.deepEqual(threads.map(t=>t.clientId),['a','b','c','d','e']);
});
test('client scope and channel filter cannot leak other clients or invent unavailable conversations',()=>{
 assert.deepEqual(visibleMessageThreads(threads,{clientId:'b',query:' BETA ',channel:'training'}).map(t=>t.clientId),['b']);
 assert.deepEqual(visibleMessageThreads(threads,{clientId:'b',channel:'medical'}),[]);
 assert.deepEqual(visibleMessageThreads(threads,{clientId:'e'}),[]);
});
