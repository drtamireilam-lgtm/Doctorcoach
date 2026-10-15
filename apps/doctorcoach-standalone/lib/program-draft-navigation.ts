/** Only dirty flags are global; program contents remain in their scoped editor. */
const editors=new Map<object,boolean>();
export function setProgramDraftDirty(token:object,dirty:boolean){editors.set(token,dirty);}
export function removeProgramDraft(token:object){editors.delete(token);}
export function hasUnsavedProgramDraft(){return [...editors.values()].some(Boolean);}
export function confirmProgramDraftLeave(confirm:()=>boolean){
 if(!hasUnsavedProgramDraft())return true;
 if(!confirm())return false;
 for(const token of editors.keys())editors.set(token,false);
 return true;
}
export function allowProgramDraftLeave(){return confirmProgramDraftLeave(()=>window.confirm(document.documentElement.lang==='en'?'Some program changes have not been saved. Leave and discard those changes?':'יש שינויים בתוכנית שטרם נשמרו. לצאת ולוותר על השינויים האלה?'));}
