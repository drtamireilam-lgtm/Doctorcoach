'use client';
import {useState,useEffect} from 'react';
import {exerciseFor} from '../lib/anatomy-catalog';
import {painHistoryScopes,painComparison,painModelVersionLabel} from '../lib/anatomy-pain-history';
import {painStructures,painModelVersion,type AnatomyPainRecord,type AnatomyPainData} from '../lib/anatomy-pain';
export function AnatomyPainHistoryComparison({records,language}:{records:AnatomyPainRecord[];language:'he'|'en'}){
 const he=language==='he',scopes=painHistoryScopes(records);
 const [scopeKey,setScopeKey]=useState(()=>scopes[0]?.key??''),[exercise,setExercise]=useState('*'),[timing,setTiming]=useState('*');
 const scope=scopes.find(s=>s.key===scopeKey)??scopes[0];
 useEffect(()=>{if(scopeKey!==(scope?.key??'')){setScopeKey(scope?.key??'');setExercise('*');setTiming('*');}else if(exercise!=='*'&&scope&&!painComparison(records,scope).records.some(r=>r.data.exerciseId===exercise))setExercise('*');},[scope?.key,scopeKey,exercise,records]);
 if(!scope)return null;
 const scoped=painComparison(records,scope).records,exerciseIds=[...new Set(scoped.map(r=>r.data.exerciseId))];
 const effectiveExercise=scope.key===scopeKey&&(exercise==='*'||exerciseIds.includes(exercise))?exercise:'*',effectiveTiming=scope.key===scopeKey?timing:'*';
 const comparison=painComparison(records,{...scope,...effectiveExercise!=='*'?{exerciseId:effectiveExercise}:{},...effectiveTiming!=='*'?{timing:effectiveTiming as AnatomyPainData['timing']}:{}});
 const timingLabel=(v:string)=>({before:he?'לפני אימון':'Before workout',during:he?'במהלך אימון':'During workout',after:he?'אחרי אימון':'After workout',other:he?'ללא קשר לאימון':'Other / no workout'})[v]??v;
 const rowName=(r:AnatomyPainRecord)=>{const id=r.data.exerciseId;if(!id)return he?'ללא תרגיל':'No exercise';return (he?r.data.exerciseNameHe:r.data.exerciseNameEn)||(he?exerciseFor(id)?.name:exerciseFor(id)?.en)||(he?'תרגיל היסטורי':'Historical exercise');};
 // Filter labels use the latest available snapshot; table rows retain their own names.
 const name=(id:string)=>{const row=scoped.filter(r=>r.data.exerciseId===id&&(he?r.data.exerciseNameHe:r.data.exerciseNameEn)).at(-1)??scoped.filter(r=>r.data.exerciseId===id).at(-1);return row?rowName(row):'';};
 const exact=effectiveExercise!=='*'&&effectiveTiming!=='*';
 return <section className="care-stack anatomy-pain-comparison" aria-label={he?'השוואת דיווחי כאב':'Compare pain reports'}>
  <h3>{he?'השוואה לאורך זמן':'Compare over time'}</h3>
  <p>{he?'תצפיות מתוך עד 100 הדיווחים האחרונים שלך. ההשוואה מתייחסת לאותו מבנה, צד וגרסת מודל, אך לא בהכרח לאותה נקודה. היא אינה אבחנה או הסבר לסיבת הכאב.':'Observations from up to your latest 100 reports. Comparison uses the same structure, side and model version, but not necessarily the same point. It is not a diagnosis or an explanation of pain.'}</p>
  <label className="care-field">{he?'אזור להשוואה':'Comparison location'}<select value={scope.key} onChange={e=>{setScopeKey(e.target.value);setExercise('*');setTiming('*');}}>{scopes.map(s=><option key={s.key} value={s.key}>{painStructures.find(p=>p.id===s.structureId)?.[language]??(he?'מבנה היסטורי':'Historical structure')} · {s.side==='left'?(he?'שמאל':'Left'):s.side==='right'?(he?'ימין':'Right'):(he?'קו אמצע':'Midline')} · {painModelVersionLabel(s.modelVersion,scopes.map(scope=>scope.modelVersion),painModelVersion,language)}</option>)}</select></label>
  <label className="care-field">{he?'סינון השוואה לפי תרגיל':'Comparison exercise filter'}<select value={effectiveExercise} onChange={e=>setExercise(e.target.value)}><option value="*">{he?'כל התרגילים':'All exercises'}</option>{exerciseIds.map(id=><option key={id} value={id}>{name(id)}</option>)}</select></label>
  <label className="care-field">{he?'סינון השוואה לפי הקשר לאימון':'Comparison workout timing filter'}<select value={effectiveTiming} onChange={e=>setTiming(e.target.value)}><option value="*">{he?'כל העיתויים':'All timings'}</option>{(['before','during','after','other'] as const).map(v=><option key={v} value={v}>{timingLabel(v)}</option>)}</select></label>
  <p role="status">{he?'דיווחים בהשוואה: ':'Reports in comparison: '}{comparison.records.length}</p>
  {!exact?<p>{he?'לחישוב הפרש מספרי בחרו תרגיל אחד והקשר אחד לאימון.':'Choose one exercise and one workout timing to calculate a numerical difference.'}</p>:comparison.difference===null?<p>{he?'אין עדיין הפרש חד־משמעי בין שני מועדים נפרדים.':'A difference between two distinct dates is not yet unambiguous.'}</p>:<p>{he?'עוצמה אחרונה פחות עוצמה ראשונה: ':'Latest intensity minus earliest intensity: '}<b dir="ltr">{comparison.difference>0?'+':''}{comparison.difference}</b> / 10 · <bdi dir="ltr">{new Date(comparison.records[0].data.occurredAt).toLocaleString(he?'he-IL':'en-GB')} → {new Date(comparison.records.at(-1)!.data.occurredAt).toLocaleString(he?'he-IL':'en-GB')}</bdi></p>}
  {!!comparison.records.length&&<div style={{overflowX:'auto'}}><table><caption>{he?'דיווחים לפי מועד הופעת הכאב':'Reports ordered by when pain occurred'}</caption><thead><tr><th scope="col">{he?'מועד':'Date'}</th><th scope="col">{he?'עוצמה':'Intensity'}</th><th scope="col">{he?'תרגיל והקשר':'Exercise and timing'}</th></tr></thead><tbody>{comparison.records.map(r=><tr key={r.id}><td><time dir="ltr" dateTime={r.data.occurredAt}>{new Date(r.data.occurredAt).toLocaleString(he?'he-IL':'en-GB')}</time></td><td dir="ltr">{r.data.intensity}/10</td><td>{rowName(r)} · {timingLabel(r.data.timing)}{r.data.setIndex!==undefined&&` · ${he?'סט עבודה בזמן הדיווח':'Working set at report time'} ${r.data.setIndex+1}`}</td></tr>)}</tbody></table></div>}
 </section>;
}
