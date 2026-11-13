import test from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../lib/workout-drafts.ts';
const saved={done:false,amount:10,weight:20,actualRpe:null,targetRpe:8};
const context={ownerId:'owner-a',sessionId:'session-a',exerciseId:'bench',occurrenceId:'slot-a',setIndex:0};
const record=()=>({...context,key:api.cachedSetKey(context),revision:'revision-a',base:{...saved,painDuring:null},fields:{...saved,weight:35.5,weightSource:'manual'},updatedAt:1});
test('cache keys separate owners, sessions, repeated exercises and set positions without delimiter collisions',()=>{
 assert.equal(typeof api.cachedSetKey,'function');
 const key=api.cachedSetKey(context);
 for(const patch of [{ownerId:'other'},{sessionId:'other'},{exerciseId:'goblet'},{occurrenceId:'slot-b'},{setIndex:1}])assert.notEqual(api.cachedSetKey({...context,...patch}),key);
 assert.notEqual(api.cachedSetKey({...context,ownerId:'a|b',sessionId:'c'}),api.cachedSetKey({...context,ownerId:'a',sessionId:'b|c'}));
});
test('only editable numeric fields are retained; performed state, names and arbitrary payload are excluded',()=>{
 assert.equal(typeof api.setDraftFields,'function');
 assert.deepEqual(api.setDraftFields({...saved,weight:33.125,painDuring:0,name:'private',done:true,token:'secret'}),{amount:10,weight:33.125,actualRpe:null,targetRpe:8,painDuring:0});
});
test('unchanged server values permit recovery; a concurrent saved edit requires explicit review',()=>{
 assert.equal(typeof api.draftRecovery,'function');
 assert.equal(api.draftRecovery(record(),context,saved),'restore');
 assert.equal(api.draftRecovery(record(),context,{...saved,weight:25}),'conflict');
 assert.equal(api.draftRecovery(record(),context,{...saved,done:true}),'conflict');
 assert.equal(api.draftRecovery(record(),context,{...saved,targetRpe:9}),'conflict');
});
test('a lost response already acknowledged by server clears only matching values; other identities never recover',()=>{
 assert.equal(typeof api.draftRecovery,'function');
 assert.equal(api.draftRecovery(record(),context,{...saved,weight:35.5,weightSource:'manual',done:true}),'synced');
 for(const patch of [{ownerId:'other'},{sessionId:'other'},{exerciseId:'goblet'},{occurrenceId:'other'},{setIndex:1}])assert.equal(api.draftRecovery(record(),{...context,...patch},saved),'ignore');
});
test('corrupt persisted fields are ignored without weakening server validation',()=>{
 assert.equal(typeof api.draftRecovery,'function');
 for(const weight of [Infinity,NaN,'35',-1,1001])assert.equal(api.draftRecovery({...record(),fields:{...record().fields,weight}},context,saved),'ignore');
 assert.equal(api.draftRecovery({...record(),revision:''},context,saved),'ignore');
});
test('editing a recovered conflict retains its original server base until explicit resolution',()=>{
 assert.equal(typeof api.makeWorkoutDraft,'function');
 const old=record(),current={...saved,weight:40},desired={...saved,weight:35.5,amount:8};
 const pending=api.makeWorkoutDraft(context,current,desired,old,true);
 assert.equal(pending.base.weight,20);
 assert.equal(pending.fields.amount,8);
 assert.equal(api.draftRecovery(pending,context,current),'conflict');
 assert.equal(api.makeWorkoutDraft(context,current,desired,old,false).base.weight,40);
});
test('unavailable device storage rejects explicitly and can be retried without caching credentials or claiming persistence',async()=>{
 const cache=await import('../lib/workout-draft-cache.ts');
 await assert.rejects(()=>cache.loadWorkoutDrafts(context.ownerId,context.sessionId),/Device draft storage unavailable/);
 await assert.rejects(()=>cache.rememberWorkoutDraft(record()),/Device draft storage unavailable/);
 await assert.rejects(()=>cache.loadWorkoutDrafts(context.ownerId,context.sessionId),/Device draft storage unavailable/);
});
