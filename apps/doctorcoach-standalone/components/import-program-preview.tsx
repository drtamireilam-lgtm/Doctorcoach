'use client';
import type {Exercise} from '../lib/content';
import {importRowItem,type ImportRow} from '../lib/program-import';
import {importRowReview} from '../lib/import-review';
import {useLanguage} from './language-provider';
export function ImportProgramPreview({rows,catalog}:{rows:ImportRow[];catalog:Exercise[]}){
 const english=useLanguage().language==='en',t=(he:string,en:string)=>english?en:he;
 const active=rows.filter(r=>!r.ignored),days=[...new Set(active.map(r=>r.dayId))].sort((a,b)=>Number(a)-Number(b));
 const states=active.map(row=>importRowReview(row,catalog));
 const accepted=states.filter(state=>state.level==='matched').length;
 const labels={matched:t('התאמה מאושרת','Confirmed match'),review:t('נדרש אישור מאמן','Coach review required'),unmatched:t('לא נמצאה התאמה','No match'),invalid:t('יש לתקן נתונים','Correct prescription'),ignored:t('דולג','Skipped')};
 return <section className="panel import-preview" dir={english?'ltr':'rtl'}><h3>{t('תצוגה מקדימה של התוכנית','Program preview')}</h3><p>{days.length} {t('ימי אימון','workout days')} · {active.length} {t('הופעות תרגיל','exercise occurrences')} · {accepted} {t('מאושרות','confirmed')} · {active.length-accepted} {t('לבדיקה','to review')}</p>
 <p role="status">{rows.length-active.length} {t('שורות דולגו במפורש ולא ייכללו בתוכנית.','rows explicitly skipped and excluded from the program.')}</p><p className="care-muted">{t('ירוק: התאמה מאושרת. צהוב: נדרשת בחירה. אדום: חסרה התאמה או שיש לתקן נתוני תוכנית. הצבע מלווה תמיד בתווית.','Green: confirmed. Yellow: choose a match. Red: unmatched or invalid prescription. Every color has a text label.')}</p>
 {days.map(day=><section key={day}><h4>{t('יום אימון','Workout day')} {day}</h4>{(['preparation','main'] as const).map(section=>{const group=active.filter(r=>r.dayId===day&&(section==='main'?r.section==='main':r.section!=='main'));if(!group.length)return null;return <div key={section}><h5>{section==='main'?t('האימון המרכזי','Main workout'):t('חימום ומוביליטי','Warm-up & Mobility')}</h5><div className="import-preview-scroll"><table><caption>{t('יום','Day')} {day} · {section==='main'?t('עבודה','Work'):t('הכנה','Preparation')}</caption><thead><tr>{[t('מקור','Source'),t('תרגיל','Exercise'),t('סטים וחימום','Sets & warm-ups'),t('חזרות / זמן','Reps / duration'),t('משקל','Load'),t('מאמץ','Effort'),t('הערות','Notes'),t('בדיקה','Review')].map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{group.map(row=>{
 let item;try{item=importRowItem(row,catalog);}catch{}
 const review=importRowReview(row,catalog),selected=catalog.find(e=>e.id===row.exerciseId);
 const unit=item?.unit??row.unit;
 const units=english?{reps:'reps',seconds:'sec',minutes:'min'}:{reps:'חזרות',seconds:'שניות',minutes:'דקות'};
 return <tr key={row.row}><th scope="row">{row.row}</th><td dir="auto">{selected?(english?selected.en:selected.name):t('טרם נבחר תרגיל','Choose an exercise')}<br/><small>{row.name} · {row.sourceDay}</small>{row.side&&<small>{english?row.side:{left:'שמאל',right:'ימין',both:'שני הצדדים'}[row.side]}</small>}</td><td>{item?.sets??row.sets} {row.section==='main'?t('עבודה','work'):t('הכנה','preparation')}{!!row.warmupSets?.length&&<ul>{row.warmupSets.map((set,index)=><li key={index}>{t('חימום','Warm-up')} {index+1}: {set.weight} {t('ק״ג','kg')} × {set.amount}</li>)}</ul>}</td><td>{item?`${item.reps}${item.repsMax?'–'+item.repsMax:''} ${units[unit as keyof typeof units]??unit}`:row.reps}</td><td>{item?item.weightUnspecified?t('לא הוגדר','Not set'):`${item.weight} ${t('ק״ג','kg')}`:row.weight||t('לא הוגדר','Not set')}</td><td>{row.rir?'RIR '+row.rir:row.rpe?'RPE '+row.rpe:'—'}</td><td className="care-preserve">{row.notes||'—'}{row.tempo&&<small>{t('טמפו','Tempo')}: {row.tempo}</small>}</td><td><span className="import-match-badge" data-level={review.level}>{review.level==='matched'?'✓ ':review.level==='review'?'! ':'× '}{labels[review.level]}</span>{review.error&&<small className="care-error">{review.error}</small>}</td></tr>;
 })}</tbody></table></div></div>;})}</section>)}</section>;
}
