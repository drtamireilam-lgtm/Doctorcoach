'use client';
import {Localize} from "../components/language-provider";
import {useMemo,useState} from 'react';
import {Download,Search} from 'lucide-react';
import {exercises} from '../lib/content';
import {demoCoverage,filmingBrief} from '../lib/demo-production';
import type {VideoAsset} from '../lib/media-store';
import {CareSelect} from './care-ui';
const labels={published:'פורסם',draft:'טיוטה מוכנה',missing:'ללא סרטון ברשימה'};
export function DemoProduction({videos}:{videos:VideoAsset[]}){
 const [state,setState]=useState('missing'),[group,setGroup]=useState('all'),[search,setSearch]=useState('');
 const coverage=useMemo(()=>demoCoverage(exercises,videos),[videos]);
 const query=search.trim().toLowerCase();
 const filtered=coverage.filter(row=>(state==='all'||row.state===state)&&(group==='all'||row.exercise.group===group)&&`${row.exercise.name} ${row.exercise.en}`.toLowerCase().includes(query));
 const groups=[...new Set(exercises.map(e=>e.group))];
 function download(){const url=URL.createObjectURL(new Blob([filmingBrief(filtered)],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='doctorcoach-exercise-filming.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <Localize>{<section className="panel care-form demo-production"><h2>הדגמות ותוכנית צילום</h2><p className="care-muted">מצב התרגילים לפי הסרטונים המוכנים שנטענו. טיוטה היא סרטון שהועלה ואינו מוצג בספרייה; מצב הפרסום אינו אישור מקצועי לתוכן.</p>
 <div className="care-stats">{(['published','draft','missing'] as const).map(value=><div key={value}><strong>{coverage.filter(row=>row.state===value).length}</strong><span>{labels[value]}</span></div>)}</div>
 {videos.length>=300&&<p role="status" className="note">הרשימה הגיעה למגבלת התצוגה. ייתכן שיש סרטונים נוספים; יש לבדוק לפני צילום חוזר של תרגיל.</p>}
 <div className="care-grid two"><CareSelect label="מצב הדגמה" value={state} onChange={setState} options={[{value:'all',label:'כל התרגילים'},...Object.entries(labels).map(([value,label])=>({value,label}))]}/><CareSelect label="קבוצת שרירים לצילום" value={group} onChange={setGroup} options={[{value:'all',label:'כל הקבוצות'},...groups.map(value=>({value,label:value}))]}/></div>
 <div className="search-box"><Search size={18}/><input type="search" aria-label="חיפוש תרגיל לתוכנית צילום" placeholder="חיפוש בעברית או באנגלית" value={search} onChange={e=>setSearch(e.target.value)}/></div>
 <div className="care-row"><p role="status">{filtered.length} תרגילים בתצוגה</p><button className="button secondary" disabled={!filtered.length} onClick={download}><Download size={17}/>הורדת תדריך צילום לתצוגה הנוכחית</button></div>
 <div className="production-exercises">{filtered.map(({exercise:e,state,published,drafts})=><details className="review-exercise" key={e.id}><summary>{e.name} · {labels[state]}</summary><p lang="en" dir="ltr">{e.en}</p><p>{e.desc}</p><ul>{e.cues.map(c=><li key={c}>{c}</li>)}</ul><p className="care-muted">{published} סרטונים פורסמו · {drafts} טיוטות מוכנות</p><p>שם קובץ מומלץ: <bdi>{e.id}-demo.mp4</bdi></p></details>)}</div>
 {!filtered.length&&<p className="care-muted">אין תרגילים בסינון הזה. אפשר לבחור מצב אחר או קבוצת שרירים אחרת.</p>}
 </section>}</Localize>;
}
