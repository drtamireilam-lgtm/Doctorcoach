'use client';
import {Localize} from './language-provider';
import type {Exercise} from '../lib/content';
import type {ImportMapping} from '../lib/import-mapping-types';
import {rememberedImportMapping} from '../lib/import-mapping-types';
export function ImportExerciseMemory({source,exerciseId,items,catalog,busy,loading,onUse,onSave,onDelete}:{source:string;exerciseId:string;items:ImportMapping[];catalog:Exercise[];busy:boolean;loading:boolean;onUse:(id:string)=>void;onSave:()=>void;onDelete:(mapping:ImportMapping)=>void}){
 const saved=rememberedImportMapping(items,source),available=saved&&catalog.find(e=>e.id===saved.exerciseId);
 return <Localize><div className="panel"><p>זיכרון התאמות אישי למאמן · שם המקור בלבד, ללא משקלים או פרטי המתאמן.</p>{available&&<><p>ל־<b dir="auto" data-no-translate>{source}</b> שמרתם: {available.name} · {available.en}. בדקו שזו אותה וריאציה גם בקובץ הזה.</p><div className="care-actions"><button type="button" className="button secondary" disabled={busy||loading} onClick={()=>onUse(available.id)}>שימוש בהתאמה ששמרתי</button><button type="button" className="text-button" disabled={busy||loading} onClick={()=>onDelete(saved!)}>מחיקת ההתאמה השמורה</button></div></>}{exerciseId&&<button type="button" className="text-button" disabled={busy||loading||source.trim().length>100||saved?.exerciseId===exerciseId} onClick={onSave}>{saved?'עדכון ההתאמה ליבוא הבא':'זכור את הבחירה שלי ליבוא הבא'}</button>}{source.trim().length>100&&<p className="care-muted">שם המקור ארוך מדי לשמירת התאמה; אפשר להמשיך ביבוא ללא זיכרון.</p>}</div></Localize>;
}
