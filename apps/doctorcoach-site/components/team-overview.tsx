'use client';
import {Localize} from "../components/language-provider";
import {useCareResource} from '../hooks/use-care';
import {CareFeedback} from './care-ui';
import type {WellnessBundle} from '../lib/wellness';
export function TeamOverview({clientId}:{clientId:string}){
 const r=useCareResource<WellnessBundle>('/api/wellness?client='+encodeURIComponent(clientId)),b=r.data;
 if(!b)return <Localize>{<CareFeedback error={r.error}/>}</Localize>;
 const pain=b.records.filter(x=>x.kind==='rehab').sort((a,c)=>c.day.localeCompare(a.day)||c.updatedAt.localeCompare(a.updatedAt))[0],ready=b.records.filter(x=>x.kind==='readiness').sort((a,c)=>c.day.localeCompare(a.day))[0],stage=b.records.find(x=>x.kind==='return');
 const pending=b.canNutrition?b.records.filter(x=>x.kind==='weekly'&&!b.records.some(y=>y.kind==='weeklyReview'&&y.slot===x.slot)).length:0;
 return <Localize>{<section className="panel team-overview"><h2>תמונת מצב משותפת</h2><div className="team-overview-grid"><div><span>אימון ומוכנות</span><strong>{ready?`${ready.data.energy}/10 אנרגיה`:'אין דיווח מוכנות'}</strong>{ready&&<small>{ready.day} · {ready.data.sleep} שעות שינה</small>}</div><div><span>רפואה ושיקום</span><strong>{stage?String(stage.data.stage):'טרם נקבע שלב חזרה'}</strong>{pain&&<small>{pain.data.region} · כאב {pain.data.pain}/10 · {pain.day}</small>}</div><div><span>תזונה</span><strong>{b.summary?.weight!==null&&b.summary?.weight!==undefined?`${b.summary.weight} ק״ג`:b.nutritionShared?'טרם נרשמה מדידה':'ללא סיכום משותף'}</strong>{b.summary&&<small>התמדה {b.summary.adherence??'—'}/10 · {b.summary.lastDay}</small>}</div></div>{pending>0&&<p className="inline-note">{pending} דיווחי תזונה שבועיים ממתינים למענה.</p>}{pain&&Number(pain.data.pain)>=7&&<p className="care-error">דווח כאב גבוה במדידה מ־{pain.day}. הדיווח ממתין להתייחסות מקצועית; אין כאן קביעה של דחיפות רפואית.</p>}{ready&&(Number(ready.data.energy)<=3||Number(ready.data.stress)>=8)&&<p className="inline-note">בדיווח המוכנות מ־{ready.day} צוינו אנרגיה נמוכה או עומס מורגש גבוה.</p>}</section>}</Localize>;
}
