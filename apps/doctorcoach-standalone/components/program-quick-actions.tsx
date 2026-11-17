'use client';
import type {PlanItem} from '../lib/training';
import {planItemKey,workoutDayId} from '../lib/workout-days';
import {workoutSection} from '../lib/workout-sections';
import {useLanguage} from './language-provider';
export function ProgramQuickActions({item,items,disabled,onDuplicate,onMove,onAdvanced}:{item:PlanItem;items:PlanItem[];disabled:boolean;onDuplicate:()=>void;onMove:(direction:-1|1)=>void;onAdvanced:()=>void}){
 const en=useLanguage().language==='en',t=(he:string,english:string)=>en?english:he;
 const peers=items.filter(row=>workoutDayId(row)===workoutDayId(item)&&workoutSection(row)===workoutSection(item)),index=peers.findIndex(row=>planItemKey(row)===planItemKey(item));
 return <div className="program-quick-actions" aria-label={t('פעולות לתרגיל בטיוטה','Draft exercise actions')}>
  <button type="button" className="button secondary" data-program-action="duplicate" disabled={disabled||items.length>=30} onClick={onDuplicate}>{t('שכפול תרגיל','Duplicate exercise')}</button>
  <button type="button" className="button secondary" data-program-action="advanced" disabled={disabled} onClick={onAdvanced}>{t('החלפה והגדרות','Replace and settings')}</button>
  <button type="button" className="button secondary" data-program-action="up" disabled={disabled||index<=0} onClick={()=>onMove(-1)}>{t('העברה למעלה','Move up')}</button>
  <button type="button" className="button secondary" data-program-action="down" disabled={disabled||index<0||index>=peers.length-1} onClick={()=>onMove(1)}>{t('העברה למטה','Move down')}</button>
 </div>;
}
