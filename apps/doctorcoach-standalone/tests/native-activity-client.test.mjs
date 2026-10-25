import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeActivityRequest} from '../lib/native-activity-client.ts';

function surface(){const events=new EventTarget(),messages=[];return {events,messages,transport:{request(p){messages.push(p);}},reply(p){events.dispatchEvent(new CustomEvent('doctorcoach:native-result',{detail:p}));}};}
test('native request rejects an unavailable bridge instead of fabricating steps',async()=>{
 await assert.rejects(nativeActivityRequest({command:'sync',accountScope:'a'},undefined,new EventTarget()),/native/i);
});
test('native callbacks require matching request and account, ignoring a switched account',async()=>{
 const f=surface(),p=nativeActivityRequest({command:'sync',accountScope:'a'},f.transport,f.events,1000);
 const request=f.messages[0];f.reply({...request,accountScope:'b',status:'ok',days:[{steps:999}]});
 f.reply({...request,status:'no-readable-data',platform:'healthkit',days:[]});
 const result=await p;assert.equal(result.status,'no-readable-data');assert.deepEqual(result.days,[]);
});
test('native request can abort and a late reply cannot resolve it',async()=>{
 const f=surface(),controller=new AbortController(),p=nativeActivityRequest({command:'sync',accountScope:'a'},f.transport,f.events,1000,controller.signal);
 controller.abort();await assert.rejects(p,/abort/i);f.reply({...f.messages[0],status:'ok'});
});
test('native request times out without manufacturing a successful observation',async()=>{
 const f=surface();await assert.rejects(nativeActivityRequest({command:'sync',accountScope:'a'},f.transport,f.events,5),/timed out/i);
});
