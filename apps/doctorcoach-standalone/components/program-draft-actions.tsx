'use client';
import {useLanguage} from './language-provider';
export function ProgramDraftActions({ready,saving,blocked,dirty,updatedAt,pendingFields,busy,error,itemCount,onSave,onPreview}:{ready:boolean;saving:boolean;blocked:''|'existing'|'conflict';dirty:boolean;updatedAt:string|null;pendingFields:boolean;busy:boolean;error:string;itemCount:number;onSave:()=>void|Promise<void>;onPreview:()=>void}){
 const en=useLanguage().language==='en',t=(he:string,english:string)=>en?english:he;
 const status=pendingFields?t('יש שדה שטרם אושר. תקנו או בטלו את העריכה לפני שמירה ותצוגה מקדימה.','A field is still being edited. Correct or discard it before saving or previewing.'):
  saving?t('שומרים טיוטה…','Saving draft…'):!ready?t('מצב הטיוטה טרם נטען. אפשר לצפות בתוכנית בלי לפרסם אותה.','Draft state has not loaded. You can still preview without publishing.'):
  blocked==='conflict'?t('הטיוטה השתנתה או שהגישה השתנתה. טענו את הטיוטה העדכנית לפני שמירה.','The draft or access changed. Load the latest draft before saving.'):
  blocked==='existing'?t('קיימת טיוטה שמורה. החלפתה דורשת אישור מפורש.','A saved draft exists. Replacing it requires explicit confirmation.'):
  error?t('השמירה נכשלה. השינויים נשארו בעורך; אפשר לנסות שוב.','Saving failed. Your edits remain in the editor; you can retry.'):
  dirty?t('יש שינויים שטרם נשמרו.','Some changes have not been saved.'):updatedAt?t('הטיוטה נשמרה בחשבון.','The draft was saved to your account.'):t('אין שינויים לשמירה.','There are no changes to save.');
 return <section className="panel care-form program-draft-actions" aria-label={t('שמירה ותצוגה מקדימה','Save and preview')}>
  <p role="status">{status}</p>
  <div className="care-actions"><button type="button" className="button secondary" disabled={!ready||saving||busy||pendingFields||blocked==='conflict'} onClick={onSave}>{error?t('ניסיון שמירה נוסף','Retry saving draft'):t('שמירת טיוטה פרטית','Save private draft')}</button><button type="button" className="button secondary" disabled={busy||pendingFields||itemCount===0} onClick={onPreview}>{t('תצוגה מקדימה למתאמן','Trainee preview')}</button></div>
  <small className="care-muted">{t('הטיוטה והתצוגה המקדימה אינן משנות את התוכנית הפעילה. הפרסום נשאר פעולה נפרדת.','Saving a draft or opening the preview does not change the active program. Publishing remains a separate action.')}</small>
 </section>;
}
