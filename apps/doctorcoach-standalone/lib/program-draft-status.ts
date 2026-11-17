type DraftStatus={ready:boolean;saving:boolean;blocked:''|'existing'|'conflict';dirty:boolean;updatedAt:string|null;pendingFields:boolean;error:string};
/** One status vocabulary for the editor header and its save/preview controls. */
export function programDraftStatusMessage(state:DraftStatus,english:boolean){
 const t=(he:string,en:string)=>english?en:he;
 return state.pendingFields?t('יש שדה שטרם אושר. תקנו או בטלו את העריכה לפני שמירה ותצוגה מקדימה.','A field is still being edited. Correct or discard it before saving or previewing.'):
 state.saving?t('שומרים טיוטה…','Saving draft…'):!state.ready?t('מצב הטיוטה טרם נטען. אפשר לצפות בתוכנית בלי לפרסם אותה.','Draft state has not loaded. You can still preview without publishing.'):
 state.blocked==='conflict'?t('הטיוטה השתנתה או שהגישה השתנתה. טענו את הטיוטה העדכנית לפני שמירה.','The draft or access changed. Load the latest draft before saving.'):
 state.blocked==='existing'?t('קיימת טיוטה שמורה. החלפתה דורשת אישור מפורש.','A saved draft exists. Replacing it requires explicit confirmation.'):
 state.error?t('השמירה נכשלה. השינויים נשארו בעורך; אפשר לנסות שוב.','Saving failed. Your edits remain in the editor; you can retry.'):
 state.dirty?t('יש שינויים שטרם נשמרו.','Some changes have not been saved.'):state.updatedAt?t('הטיוטה נשמרה בחשבון.','The draft was saved to your account.'):t('אין שינויים לשמירה.','There are no changes to save.');
}
