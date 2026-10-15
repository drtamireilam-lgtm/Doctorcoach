import test from 'node:test';
import assert from 'node:assert/strict';
import {ProgramAutosave,draftContentKey} from '../lib/program-autosave.ts';
import {setProgramDraftDirty,removeProgramDraft,hasUnsavedProgramDraft,confirmProgramDraftLeave} from '../lib/program-draft-navigation.ts';
const draft=title=>({requestId:'id',title,items:[],revisionOf:null});
const state=(version,d)=>({version,draft:d,updatedAt:'2026-10-14T10:00:00Z'});
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
test('late acknowledgement saves only its snapshot; a queued save uses the new content and new server version',async()=>{
 const one=deferred(),two=deferred(),calls=[],saved=[];
 const c=new ProgramAutosave(draft('initial'),(d,v)=>{calls.push([d.title,v]);return calls.length===1?one.promise:two.promise;},()=>{},s=>saved.push(s));
 c.receive(state(0,null));c.setContent(draft('first'));const p=c.save();await Promise.resolve();
 c.setContent(draft('second'));const q=c.save();one.resolve(state(1,draft('first')));await p;
 assert.equal(c.dirty,true);await Promise.resolve();assert.deepEqual(calls,[['first',0],['second',1]]);
 two.resolve(state(2,draft('second')));await q;assert.equal(c.dirty,false);assert.equal(c.version,2);assert.equal(saved.length,2);
});
test('a persisted draft is never overwritten on editor opening, and request identity alone is not an edit',async()=>{
 let writes=0;const c=new ProgramAutosave(draft('initial'),async(d,v)=>{writes++;return state(v+1,d);},()=>{},()=>{});
 c.receive(state(4,draft('saved elsewhere')));c.setContent(draft('new local'));assert.equal(await c.save(),false);assert.equal(writes,0);
 c.adopt(state(4,draft('saved elsewhere')),draft('saved elsewhere'));c.setContent({...draft('saved elsewhere'),requestId:'new-request'});assert.equal(c.dirty,false);
 c.setContent(draft('edited'));assert.equal(await c.save(),true);assert.equal(writes,1);
});
test('conflict preserves local content and stops retries until explicit recovery with the latest server draft',async()=>{
 let writes=0;const c=new ProgramAutosave(draft('initial'),async(d,v)=>{if(++writes===1)throw Object.assign(new Error('conflict'),{status:409});return state(v+1,d);},()=>{},()=>{});
 c.receive(state(0,null));c.setContent(draft('unsaved'));assert.equal(await c.save(),false);assert.equal(c.dirty,true);assert.equal(c.current.title,'unsaved');assert.equal(await c.save(true),false);assert.equal(writes,1);
 c.adopt(state(3,draft('server winner')),draft('server winner'));c.setContent(draft('revised'));assert.equal(await c.save(),true);assert.equal(c.version,4);
});
test('network failure stays unsaved and manual retry saves it; deletion is not immediately undone by autosave',async()=>{
 let writes=0;const c=new ProgramAutosave(draft('initial'),async(d,v)=>{if(++writes===1)throw Object.assign(new Error('offline'),{status:0});return state(v+1,d);},()=>{},()=>{});
 c.receive(state(0,null));c.setContent(draft('edited'));assert.equal(await c.save(),false);assert.equal(await c.save(),false);assert.equal(writes,1);
 assert.equal(await c.save(true),true);c.discarded(state(2,null));assert.equal(c.dirty,true);assert.equal(await c.save(),false);assert.equal(writes,2);
 c.setContent(draft('another edit'));assert.equal(await c.save(),true);assert.equal(c.version,3);
});
test('closed editors ignore old acknowledgements and reset after publishing cannot recreate the published draft',async()=>{
 const pending=deferred();let acknowledgements=0;
 const c=new ProgramAutosave(draft('initial'),()=>pending.promise,()=>{},()=>acknowledgements++);c.receive(state(0,null));c.setContent(draft('edited'));const saving=c.save();await Promise.resolve();c.close();pending.resolve(state(1,draft('edited')));assert.equal(await saving,false);assert.equal(acknowledgements,0);
 const fresh=new ProgramAutosave(draft('initial'),async(d,v)=>state(v+1,d),()=>{},()=>{});fresh.receive(state(0,null));fresh.setContent(draft('program'));await fresh.save();fresh.reset(draft('empty editor'));assert.equal(fresh.dirty,false);assert.equal(await fresh.save(),false);fresh.receive(state(2,null));assert.equal(await fresh.save(),true);assert.equal(fresh.version,2);
});
test('navigation guards cancel leaving, allow saved edits, and hold only dirty metadata for separate editors',()=>{
 const a={},b={};setProgramDraftDirty(a,true);setProgramDraftDirty(b,false);
 assert.equal(confirmProgramDraftLeave(()=>false),false);assert.equal(hasUnsavedProgramDraft(),true);
 assert.equal(confirmProgramDraftLeave(()=>true),true);assert.equal(hasUnsavedProgramDraft(),false);
 setProgramDraftDirty(a,true);removeProgramDraft(a);assert.equal(hasUnsavedProgramDraft(),false);removeProgramDraft(b);
});

test('restored server exercise definitions do not count as unsaved edits while coach prescriptions still do',()=>{
 const item={exerciseId:'custom-example',sets:2,reps:8,unit:'reps',weight:10,notes:'cue'};
 const stored={...draft('custom plan'),items:[{...item,customExercise:{id:'custom-example',name:'Server definition'}}]};
 const editor={...stored,items:[item]};
 assert.equal(draftContentKey(stored),draftContentKey(editor));
 assert.notEqual(draftContentKey(stored),draftContentKey({...editor,items:[{...item,notes:'new cue'}]}));
});
