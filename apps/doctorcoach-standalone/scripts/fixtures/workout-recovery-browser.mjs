import assert from 'node:assert/strict';
import {join} from 'node:path';
/** Real IndexedDB + actual Page/SetLine/controller, disposable SQLite server. */
export async function verifyWorkoutRecovery({page,fixture,owner,started,language,width,evidence,setFailure,pausePatch,readCount}) {
 const first=()=>page.locator('.set-line').first(),inputs=()=>first().locator('.smart-set-fields input');
 const expand=async()=>{const toggle=page.locator('.session-exercise .exercise-disclosure-toggle').first();if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();};
 const cached=async()=>page.evaluate(async id=>(await window.__workoutDraftTest.loadWorkoutDrafts('client',id)),started.id);
 setFailure(true);
 await inputs().nth(0).fill('33.125');await inputs().nth(1).fill('9');await inputs().nth(2).fill('7');
 await page.waitForFunction(async id=>(await window.__workoutDraftTest.loadWorkoutDrafts('client',id)).some(r=>r.fields.weight===33.125&&r.fields.amount===9&&r.fields.actualRpe===7),started.id);
 await page.waitForTimeout(1300);
 assert.equal((await fixture.training.feed(owner)).active.items[0].results[0].weight,20);
 setFailure('all');await page.reload();
 await page.waitForTimeout(300);assert.equal(await page.locator('.set-line').count(),0,'Unavailable server context cannot display cached workout fields');
 setFailure(true);await page.evaluate(()=>window.dispatchEvent(new Event('online')));await expand();
 await page.waitForFunction(()=>document.querySelector('.set-line .smart-set-fields input')?.value==='33.125');
 assert.equal(await inputs().nth(1).inputValue(),'9');assert.equal(await inputs().nth(2).inputValue(),'7');
 assert.equal((await fixture.training.feed(owner)).active.items[0].results[0].done,false);
 await page.waitForTimeout(1300);
 // A different tab saved a new value while this device's edit was unconfirmed.
 const active=(await fixture.training.feed(owner)).active,item=active.items[0];
 await fixture.training.patch(owner,{id:active.id,version:active.version,action:'set',exerciseId:item.exerciseId,occurrenceId:item.occurrenceId,setIndex:0,done:false,amount:10,weight:25,actualRpe:null});
 await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 await page.getByText(language==='en'?'Recovered device edits differ from the saved server values. Review and save manually, or discard the recovery.':'שוחזרה עריכה מהמכשיר, אך הביצוע בשרת השתנה. בדקו את הערכים ושמרו ידנית או בטלו את השחזור.',{exact:true}).waitFor({timeout:3000});
 setFailure(false);await page.waitForTimeout(1500);
 assert.equal((await fixture.training.feed(owner)).active.items[0].results[0].weight,25,'Conflicting recovered data must not auto-replay');
 assert.equal(await inputs().nth(0).inputValue(),'33.125');
 await inputs().nth(1).fill('8');await page.waitForTimeout(1300);
 assert.equal((await fixture.training.feed(owner)).active.items[0].results[0].weight,25,'Editing a conflicted draft must not silently overwrite another saved field');
 assert.equal((await cached())[0].base.weight,20,'Local edits must not rebase a still-unresolved conflict');
 await page.screenshot({path:join(evidence,`recovery-conflict-${language}-${width}.png`),fullPage:true});
 await page.evaluate(()=>{
  const controller=window.__workoutController,discard=controller.discardSetDraft;
  const gate=new Promise(resolve=>{window.__releaseDiscard=resolve;});window.__discardStorageDone=false;
  controller.discardSetDraft=async(...args)=>{const result=await discard(...args);window.__discardStorageDone=true;await gate;return result;};
 });
 // Hold a real readwrite transaction so discard cannot finish immediately.
 await page.evaluate(async()=>{
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('doctorcoach-pending-workouts',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  window.__releaseDraftTransaction=false;
  const tx=db.transaction('set-edits','readwrite'),store=tx.objectStore('set-edits');
  const loop=()=>{const r=store.get('__synthetic-discard-hold__');r.onsuccess=()=>{if(!window.__releaseDraftTransaction)loop();};};
  tx.oncomplete=()=>db.close();loop();
 });
 await first().getByRole('button',{name:language==='en'?'Discard recovery and load server values':'ביטול השחזור וטעינת הערכים מהשרת',exact:true}).click();
 assert.equal(await inputs().nth(0).isDisabled(),true,'Editing must be disabled while device discard is pending');
 await page.evaluate(()=>{window.__releaseDraftTransaction=true;});
 await page.waitForFunction(()=>window.__discardStorageDone);
 const beforeDiscard=(await fixture.training.feed(owner)).active,discardItem=beforeDiscard.items[0];
 await fixture.training.patch(owner,{id:beforeDiscard.id,version:beforeDiscard.version,action:'set',exerciseId:discardItem.exerciseId,occurrenceId:discardItem.occurrenceId,setIndex:0,done:false,amount:10,weight:45,actualRpe:null});
 await page.evaluate(async()=>window.__workoutController.refresh());
 await page.waitForFunction(()=>window.__workoutController.feed.active.items[0].results[0].weight===45);
 await page.waitForTimeout(100);
 await page.evaluate(()=>window.__releaseDiscard());
 await page.waitForFunction(()=>document.querySelector('.set-line .smart-set-fields input')?.value==='45',undefined,{timeout:3000});
 assert.equal((await fixture.training.feed(owner)).active.items[0].results[0].weight,45,'Discard must restore latest server values, not its click-time snapshot');
 assert.equal((await cached()).length,0);
 // Verify the adapter's CAS transaction and exact owner/session index with real IndexedDB.
 const adapter=await page.evaluate(async()=>{
  const c=window.__workoutDraftTest,context={ownerId:'cas-owner',sessionId:'cas-session',exerciseId:'bench',occurrenceId:'slot',setIndex:0};
  const base={done:false,amount:10,weight:20,actualRpe:null,targetRpe:8,painDuring:null};
  const a={...context,key:c.cachedSetKey(context),revision:'a',updatedAt:1,base,fields:c.setDraftFields({...base,weight:33.125})};
  await c.rememberWorkoutDraft(a);await c.rememberWorkoutDraft({...a,revision:'b',fields:c.setDraftFields({...base,weight:40})});
  await c.acknowledgeWorkoutDraft(a.key,'a');
  const own=await c.loadWorkoutDrafts('cas-owner','cas-session'),foreign=await c.loadWorkoutDrafts('foreign','cas-session');
  await c.clearWorkoutDrafts('cas-owner','cas-session');
  return {revision:own[0]?.revision,weight:own[0]?.fields.weight,foreign:foreign.length};
 });
 assert.deepEqual(adapter,{revision:'b',weight:40,foreign:0});
 // An online event must not start an older GET snapshot during an acquired PATCH.
 const reads=readCount();pausePatch(true);await inputs().nth(0).fill('26');
 await first().locator('.set-save').click();await page.waitForFunction(()=>document.querySelector('.set-line .smart-set-fields input')?.disabled);
 await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.waitForTimeout(250);
 assert.equal(readCount(),reads,'Online refresh must not overlap an acquired session mutation');
 pausePatch(false);await first().locator('.set-save.saved').waitFor();
 assert.equal((await fixture.training.feed(owner)).active.items[0].results[0].weight,26);
 console.log('PASS real IndexedDB pending fields → failed save → reload → conflict → explicit discard; owner/CAS isolation',language);
 return {failedWrite:true,disconnection:true,reload:true,refreshedConflict:true,conflictEditsBlocked:true,discardInputLock:true,latestServerDiscard:true,serializedOnlineRefresh:true,ownerIsolation:true,revisionCas:true};
}
