'use client';
import {useState} from 'react';
import {ImportExerciseMemory} from './import-exercise-memory';
import {CareFeedback} from './care-ui';
import {careRequest,useCareResource,useCareAction} from '../hooks/use-care';
import {rememberedImportMapping,type ImportMapping} from '../lib/import-mapping-types';
import type {Exercise} from '../lib/content';
import type {PlanItem} from '../lib/training';
import {customId} from '../lib/custom-exercise-types';
import {ExerciseNameSelect} from './exercise-name-select';
import {useLanguage} from './language-provider';
export function ImportedExerciseDetails({item,catalog,onChange}:{item:PlanItem;catalog:Exercise[];onChange:(patch:Partial<PlanItem>)=>void}){
 const [open,setOpen]=useState(false);
 const english=useLanguage().language==='en',source=item.importSource;if(!source)return null;const t=(he:string,en:string)=>english?en:he;
 return <details className="panel" onToggle={e=>setOpen(e.currentTarget.open)}><summary>{t('מקור הייבוא והתאמה לספרייה','Import source and library matching')}</summary><p dir="auto">{source.originalName}</p><p dir="auto">{source.fileName} · {source.sheet} · {t('שורה','Row')} {source.row} · {source.workoutSection}</p><p className="care-muted">{t('שינוי ההתאמה שומר את השם והנתונים המקוריים. תוצאות מאימונים קודמים נשארות ללא שינוי.','Changing the match preserves the original name and source data. Previous workout results remain unchanged.')}</p><ExerciseNameSelect label={t('החלפה בתרגיל מהספרייה','Replace with a library exercise')} value={catalog.some(e=>e.id===item.exerciseId)?item.exerciseId:''} items={catalog} onChange={exerciseId=>{const e=catalog.find(e=>e.id===exerciseId);if(!e)return;onChange({exerciseId,customExercise:customId(exerciseId)?e as PlanItem['customExercise']:undefined,importSource:{...source,matchingStatus:'MATCHED',matchedLibraryId:exerciseId}});}}/>{open&&<ImportedAliasMemory source={source.originalName} exerciseId={item.exerciseId} catalog={catalog} onUse={exerciseId=>{const e=catalog.find(e=>e.id===exerciseId);if(e)onChange({exerciseId,customExercise:customId(exerciseId)?e as PlanItem['customExercise']:undefined,importSource:{...source,matchingStatus:'MATCHED',matchedLibraryId:exerciseId}});}}/>}<pre className="care-preserve" dir="auto" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{t('סטים','Sets')}: {source.raw.sets} · {t('חזרות','Reps')}: {source.raw.reps} · {t('משקל','Weight')}: {source.raw.weight} · RPE: {source.raw.rpe}{source.raw.notes?'\n'+source.raw.notes:''}</pre></details>;
}

// Load personal aliases only when provenance is opened, rather than once for every imported row.
function ImportedAliasMemory({source,exerciseId,catalog,onUse}:{source:string;exerciseId:string;catalog:Exercise[];onUse:(id:string)=>void}){
 const memory=useCareResource<{items:ImportMapping[]}>('/api/import-mappings'),action=useCareAction();
 const knownId=catalog.some(e=>e.id===exerciseId)?exerciseId:'';
 const write=async(kind:'save'|'delete',mapping?:ImportMapping)=>{const saved=mapping??rememberedImportMapping(memory.data?.items??[],source);const result=await action.run(()=>careRequest<{items:ImportMapping[]}>('/api/import-mappings',{action:kind,source,exerciseId:knownId,version:saved?.version??0}));if(result)memory.setData(result);};
 return <><ImportExerciseMemory source={source} exerciseId={knownId} catalog={catalog} items={memory.data?.items??[]} loading={memory.loading||!!memory.error} busy={action.busy} onUse={onUse} onSave={()=>void write('save')} onDelete={mapping=>void write('delete',mapping)}/><CareFeedback error={memory.error||action.error} message={action.message}/></>;
}
