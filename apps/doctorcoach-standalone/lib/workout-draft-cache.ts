import type {CachedSetDraft} from './workout-drafts.ts';
const table='set-edits';
let opening:Promise<IDBDatabase>|null=null;
function database() {
 if(!opening){
  const pending=new Promise<IDBDatabase>((resolve,reject)=>{
  if(typeof indexedDB==='undefined'){reject(new Error('Device draft storage unavailable'));return;}
  let settled=false;
  const request=indexedDB.open('doctorcoach-pending-workouts',1);
  request.onupgradeneeded=()=>{const store=request.result.createObjectStore(table,{keyPath:'key'});store.createIndex('ownerSession',['ownerId','sessionId']);};
  request.onsuccess=()=>{if(settled){request.result.close();return;}settled=true;request.result.onversionchange=()=>{request.result.close();opening=null;};resolve(request.result);};
  request.onerror=()=>{settled=true;reject(request.error??new Error('Device draft storage unavailable'));};
  request.onblocked=()=>{settled=true;reject(new Error('Device draft storage is blocked'));};
  });
  opening=pending;
  void pending.catch(()=>{if(opening===pending)opening=null;});
 }
 return opening;
}
async function write(work:(store:IDBObjectStore)=>void) {
 const db=await database();
 await new Promise<void>((resolve,reject)=>{
  const tx=db.transaction(table,'readwrite');
  tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error??new Error('Device draft write failed'));tx.onerror=()=>reject(tx.error??new Error('Device draft write failed'));
  work(tx.objectStore(table));
 });
}
export const rememberWorkoutDraft=(record:CachedSetDraft)=>write(store=>{store.put(record);});
/** Acknowledgement cannot delete a newer edit written while its HTTP request was in flight. */
export async function acknowledgeWorkoutDraft(key:string,revision:string) {
 let exact=false;
 await write(store=>{
  const request=store.get(key);request.onsuccess=()=>{exact=!request.result||request.result.revision===revision;if(request.result?.revision===revision)store.delete(key);};
 });
 return exact;
}
export async function loadWorkoutDrafts(ownerId:string,sessionId:string):Promise<CachedSetDraft[]> {
 const db=await database();
 return new Promise((resolve,reject)=>{
  const request=db.transaction(table,'readonly').objectStore(table).index('ownerSession').getAll(IDBKeyRange.only([ownerId,sessionId]));
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });
}
export const clearWorkoutDrafts=(ownerId:string,sessionId:string)=>write(store=>{
 const request=store.index('ownerSession').openCursor(IDBKeyRange.only([ownerId,sessionId]));
 request.onsuccess=()=>{const cursor=request.result;if(cursor){cursor.delete();cursor.continue();}};
});
