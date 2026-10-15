'use client';
import type {ExerciseTempo,PlanItem} from '../lib/training';
const phases=[['eccentric','ירידה / הארכה'],['bottom','עצירה בסוף הירידה'],['concentric','עלייה / קיצור'],['top','עצירה בסוף העלייה']] as const;
export function TempoEditor({item,onChange}:{item:PlanItem;onChange:(tempo:ExerciseTempo|null)=>void}){
 if(item.unit!=='reps')return null;
 return <div className="tempo-editor"><label className="care-check"><input type="checkbox" checked={!!item.tempo} onChange={e=>onChange(e.target.checked?{eccentric:3,bottom:0,concentric:2,top:0}:null)}/><span>קביעת טמפו לתרגיל (אופציונלי)</span></label>{item.tempo&&<><p className="care-muted">זמן בשניות לכל שלב בחזרה. למשל בסקוואט: 3 שניות ירידה, ללא עצירה בתחתית, 2 שניות עלייה.</p><div className="form-grid">{phases.map(([key,label])=><label className="care-field" key={key}>{label}<input type="number" min={0} max={60} step={0.1} required value={item.tempo![key]} onChange={e=>onChange({...item.tempo!,[key]:Number(e.target.value)})}/></label>)}</div></>}</div>;
}
export function TempoDetails({item}:{item:Pick<PlanItem,'tempo'|'unit'>}){
 if(item.unit!=='reps'||!item.tempo)return null;
 return <div className="exercise-tempo"><p><strong>טמפו: <bdi dir="ltr">{phases.map(([key])=>item.tempo![key]).join('–')}</bdi></strong></p><p className="care-muted">{phases.map(([key,label])=><span key={key}>{label}: {item.tempo![key]} שניות{key!=='top'?' · ':''}</span>)}</p></div>;
}
