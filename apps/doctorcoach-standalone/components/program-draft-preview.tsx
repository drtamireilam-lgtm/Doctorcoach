'use client';
import type {PlanItem} from '../lib/training';
import {targetRpeForSet} from '../lib/training';
import {assignedDays,planItemKey,workoutDayId} from '../lib/workout-days';
import {exercises} from '../lib/content';
import {useLanguage} from './language-provider';
import {WorkoutPrescription} from './workout-prescription';
import {WorkoutSections} from './workout-sections';
import {TempoDetails} from './exercise-tempo';
import {RestPrescription} from './rest-prescription';
import {CardioPrescriptionSummary} from './cardio-editor';

/** A passive view of the current editor state; incomplete drafts need no publication validation. */
export function ProgramDraftPreview({title,items,onBack,onEditDay}:{
 title:string;items:PlanItem[];onBack:()=>void;onEditDay?:(id:string)=>void;
}){
 const en=useLanguage().language==='en',t=(he:string,english:string)=>en?english:he;
 const days=assignedDays(items);
 const unit=(item:PlanItem)=>item.unit==='reps'?t('חזרות','reps'):item.unit==='seconds'?t('שניות','seconds'):t('דקות','minutes');
 const nameOf=(item:PlanItem)=>{
  const exercise=exercises.find(exercise=>exercise.id===item.exerciseId);
  return item.customExercise?.name??(en?exercise?.en:exercise?.name)??item.exerciseId;
 };
 // Warm-up prescriptions store kg and carry no separate load-basis metadata.
 const warmupLoad=(weight:number)=>new Intl.NumberFormat(en?'en-GB':'he-IL',{maximumFractionDigits:4}).format(weight)+' kg';
 return <section className="panel care-form program-draft-preview" data-no-translate dir={en?'ltr':'rtl'} aria-label={t('תצוגה מקדימה של טיוטת התוכנית','Program draft preview')}>
  <header className="care-row"><div><span className="eyebrow">{t('תצוגת טיוטה — לא הוקצתה','Draft preview — not assigned')}</span><h2 dir="auto">{title||t('תוכנית ללא שם','Untitled program')}</h2><p className="care-muted">{t('כך נראים פרטי האימון בטיוטה. התצוגה אינה שומרת או מקצה תוכנית למתאמן.','Review the workout details in this draft. Previewing does not save or assign a program.')}</p></div><button type="button" className="button secondary" onClick={onBack}>{t('חזרה לעורך','Back to editor')}</button></header>
  <p>{days.length} {t('ימי אימון','workout days')} · {items.length} {t('תרגילים','exercises')}</p>
  {!items.length&&<p className="note">{t('עדיין אין תרגילים. חזרו לעורך כדי להוסיף לתוכנית.','No exercises yet. Return to the editor to add to your program.')}</p>}
  <div className="care-stack">{days.map(id=>{
   const dayItems=items.filter(item=>workoutDayId(item)===id),dayLabel=t(`יום אימון ${id}`,`Workout day ${id}`);
   return <section className="care-program-edit" key={id} aria-label={dayLabel}>
    <header className="care-row"><div><h3>{dayLabel}</h3><p className="care-muted">{dayItems.length} {t('תרגילים','exercises')} · {dayItems.reduce((sum,item)=>sum+(item.cardio?0:item.sets),0)} {t('סטים','sets')}</p></div>{onEditDay&&<button type="button" className="button secondary" aria-label={t(`עריכת יום אימון ${id}`,`Edit workout day ${id}`)} onClick={()=>onEditDay(id)}>{t('עריכת היום','Edit day')}</button>}</header>
    <div className="care-dose-list"><WorkoutSections items={dayItems}>{item=><article className="panel care-form" data-no-translate key={planItemKey(item)}>
     {item.cardio?<CardioPrescriptionSummary value={item.cardio}/>:<>
      <h4 dir="auto">{nameOf(item)}</h4>
      {item.side&&<p>{t('צד','Side')}: {item.side==='left'?t('שמאל','Left'):item.side==='right'?t('ימין','Right'):t('שני הצדדים','Both sides')}</p>}
      {!!item.warmupSets?.length&&<section aria-label={t('סטים לחימום','Warm-up sets')}><h5>{t('סטים לחימום','Warm-up sets')}</h5><ol>{item.warmupSets.map((set,index)=><li key={index}>{t('חימום','Warm-up')} {index+1}: <bdi>{warmupLoad(set.weight)}</bdi> × {set.amount} {unit(item)}</li>)}</ol></section>}
      {item.setReps||item.targetRpes?<><p>{item.sets} {t('סטים','sets')}</p><ol className="care-dose-list">{Array.from({length:item.sets},(_,index)=>{
       const range=item.setReps?.[index],target=targetRpeForSet(item,index);
       return <li key={index}><strong>{t('סט','Set')} {index+1}</strong><WorkoutPrescription item={{...item,sets:1,reps:range?.min??item.reps,repsMax:range?.max??item.repsMax,setReps:undefined,targetRpe:target,targetRpes:undefined}}/>{target==null&&<p className="care-muted">{t('חסר יעד מאמץ לסט הזה.','Missing effort target for this set.')}</p>}</li>;
      })}</ol></>:<><WorkoutPrescription item={item}/>{targetRpeForSet(item,0)==null&&<p className="care-muted">{t('חסר יעד מאמץ לתרגיל הזה.','Missing effort target for this exercise.')}</p>}</>}
      {item.weightUnspecified&&<p className="care-muted">{t('לא הוגדר משקל. המתאמן יתעד את המשקל בפועל.','Weight not specified. The trainee will record the actual weight.')}</p>}
      <TempoDetails item={item}/>
      {item.customExercise&&<details className="panel"><summary>{t('הוראות לתרגיל האישי','Custom exercise instructions')} · <bdi>{item.customExercise.name}</bdi></summary><p dir="auto">{item.customExercise.en} · {item.customExercise.equipment}</p><p className="care-preserve" dir="auto">{item.customExercise.desc}</p>{item.customExercise.videoUrl&&<a href={item.customExercise.videoUrl} target="_blank" rel="noopener noreferrer">{t('צפייה בסרטון הביצוע','Watch exercise video')}</a>}</details>}
     </>}
     <RestPrescription item={item}/>
     {item.notes&&<p className="care-preserve" dir="auto"><strong>{t('הערת המאמן','Coach note')}: </strong>{item.notes}</p>}
     {!!item.approvedSubstitutions?.length&&<p>{t('חלופות מאושרות','Approved alternatives')}: {item.approvedSubstitutions.map(exerciseId=>nameOf(items.find(other=>other.exerciseId===exerciseId)??{...item,exerciseId,customExercise:undefined})).join(' · ')}</p>}
    </article>}</WorkoutSections></div>
   </section>;
  })}</div>
 </section>;
}
