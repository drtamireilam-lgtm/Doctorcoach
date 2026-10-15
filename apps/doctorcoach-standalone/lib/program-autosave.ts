import type {CoachDraft,CoachDraftState} from './coach-drafts.ts';
import {programItemsForWrite} from './custom-exercise-types.ts';
export const draftContentKey=(draft:CoachDraft)=>JSON.stringify([draft.title,programItemsForWrite(draft.items),draft.revisionOf]);
/** One editor and one server version; acknowledgements apply only to their captured content. */
export class ProgramAutosave {
 current:CoachDraft; savedKey:string; ready=false; version=0; updatedAt:string|null=null;
 blocked:''|'existing'|'conflict'=''; error=''; failedKey=''; closed=false;
 inFlight:Promise<boolean>|null=null;
 private send:(draft:CoachDraft,version:number)=>Promise<CoachDraftState>;private notify:()=>void;private saved:(state:CoachDraftState)=>void;
 constructor(initial:CoachDraft,send:(draft:CoachDraft,version:number)=>Promise<CoachDraftState>,notify:()=>void,saved:(state:CoachDraftState)=>void){this.current=initial;this.savedKey=draftContentKey(initial);this.send=send;this.notify=notify;this.saved=saved;}
 get dirty(){return draftContentKey(this.current)!==this.savedKey;}
 get saving(){return !!this.inFlight;}
 setContent(draft:CoachDraft){this.current=draft;}
 receive(state:CoachDraftState){if(this.ready)return;this.ready=true;this.version=state.version;this.updatedAt=state.draft?state.updatedAt:null;this.blocked=state.draft?'existing':'';this.notify();}
 adopt(state:CoachDraftState,draft:CoachDraft){this.current=draft;this.savedKey=draftContentKey(draft);this.version=state.version;this.updatedAt=state.updatedAt;this.ready=true;this.blocked='';this.error='';this.failedKey='';this.notify();}
 discarded(state:CoachDraftState){this.version=state.version;this.updatedAt=null;this.blocked='';this.error='';this.savedKey='';this.failedKey=draftContentKey(this.current);this.notify();}
 reset(draft:CoachDraft){this.current=draft;this.savedKey=draftContentKey(draft);this.ready=false;this.blocked='';this.error='';this.failedKey='';this.updatedAt=null;this.notify();}
 async wait(){if(this.inFlight)await this.inFlight;}
 async save(force=false):Promise<boolean>{
  if(this.closed)return false;
  if(this.inFlight){await this.inFlight;return this.closed?false:!this.dirty&&this.blocked!=='existing'?true:this.save(force);}
  if(!this.ready||this.blocked==='conflict'||this.blocked==='existing'&&!force)return false;
  if(!this.dirty&&!force)return true;
  if(!force&&this.failedKey===draftContentKey(this.current))return false;
  const snapshot=JSON.parse(JSON.stringify(this.current)) as CoachDraft,key=draftContentKey(snapshot),version=this.version;
  this.error='';
  // Start on a microtask so the inFlight lock exists before completion callbacks.
  const request=Promise.resolve().then(()=>this.send(snapshot,version)).then(state=>{
   if(this.closed)return false;
   this.savedKey=key;this.version=state.version;this.updatedAt=state.updatedAt;this.blocked='';this.failedKey='';this.saved(state);return true;
  }).catch((error:Error&{status?:number})=>{if(!this.closed){this.error=error.message;this.failedKey=key;if(error.status===409||error.status===403)this.blocked='conflict';}return false;}).finally(()=>{this.inFlight=null;if(!this.closed)this.notify();});
  this.inFlight=request;this.notify();return request;
 }
 close(){this.closed=true;}
}
