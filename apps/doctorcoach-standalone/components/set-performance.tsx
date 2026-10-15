'use client';
import {Localize} from "../components/language-provider";
import {WorkoutContext} from './workout-context';
import {effortName,effortValue,effortTarget} from '../lib/effort';
import type {TrainingFeed} from '../lib/training';
import {setEstimated1RM,nextSetLoad} from '../lib/set-load';
import {careDate} from './care-ui';
import {NextSetCalculation} from './next-set-calculation';
export function SetPerformance({feed}:{feed:TrainingFeed}){const sessions=[...(feed.active?[feed.active]:[]),...feed.history.slice(0,5)];return <Localize>{<section className="panel care-form"><h2>מאמץ ו־1RM לפי סט</h2><p>הנתונים שנשמרו מוצגים כאן, כולל האימון הפעיל. לחצו ״רענון התיק״ לקבלת הדיווח האחרון.</p>{sessions.map(s=><details key={s.id} open={s.status==='active'}><summary>{s.status==='active'?'אימון פעיל':'אימון שהסתיים'} · {careDate(s.startedAt)}</summary><WorkoutContext session={s}/>{s.items.map(i=><section key={i.exerciseId}><h3>{i.name} · {effortTarget(i)}</h3>{i.results.map((r,index)=>{if(!r.done)return null;const est=setEstimated1RM(r,i.unit),next=nextSetLoad(i,index,s);return <div className="review-exercise" key={index}><strong>סט {index+1}: {r.amount} {i.unit==='reps'?'חזרות':i.unit==='seconds'?'שניות':'דקות'} · {r.weight} ק״ג · {effortName(i.effortScale)} {effortValue(r.actualRpe,i.effortScale)??'לא דווח'}</strong><p>כאב במהלך הסט: {r.painDuring==null?'לא דווח':r.painDuring+'/10'}</p><p>1RM משוער מותאם {effortName(i.effortScale)}: {est===null?'לא ניתן לחישוב':est+' ק״ג'}</p>{s.status==='active'&&<NextSetCalculation item={i} index={index} suggestion={next}/>}</div>;})}</section>)}</details>)}{!sessions.length&&<p>עדיין לא נשמרו סטים.</p>}</section>}</Localize>;}
