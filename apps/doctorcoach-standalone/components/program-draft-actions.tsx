'use client';
import {programDraftStatusMessage} from '../lib/program-draft-status';
import {useLanguage} from './language-provider';
export function ProgramDraftActions({ready,saving,blocked,dirty,updatedAt,pendingFields,busy,error,itemCount,onSave,onPreview}:{ready:boolean;saving:boolean;blocked:''|'existing'|'conflict';dirty:boolean;updatedAt:string|null;pendingFields:boolean;busy:boolean;error:string;itemCount:number;onSave:()=>void|Promise<void>;onPreview:()=>void}){
 const en=useLanguage().language==='en',t=(he:string,english:string)=>en?english:he;
 const status=programDraftStatusMessage({ready,saving,blocked,dirty,updatedAt,pendingFields,error},en);
 return <section className="panel care-form program-draft-actions" aria-label={t('שמירה ותצוגה מקדימה','Save and preview')}>
  <p role="status">{status}</p>
  <div className="care-actions"><button type="button" className="button secondary" disabled={!ready||saving||busy||pendingFields||blocked==='conflict'} onClick={onSave}>{error?t('ניסיון שמירה נוסף','Retry saving draft'):t('שמירת טיוטה פרטית','Save private draft')}</button><button type="button" className="button secondary" disabled={busy||pendingFields||itemCount===0} onClick={onPreview}>{t('תצוגה מקדימה למתאמן','Trainee preview')}</button></div>
  <small className="care-muted">{t('הטיוטה והתצוגה המקדימה אינן משנות את התוכנית הפעילה. הפרסום נשאר פעולה נפרדת.','Saving a draft or opening the preview does not change the active program. Publishing remains a separate action.')}</small>
 </section>;
}
