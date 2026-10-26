'use client';
import {Localize,useLanguage} from "../components/language-provider";
import {useState} from 'react';
import {anatomyImageFor} from '../lib/anatomy-images';
export function AnatomyIllustration({slug}:{slug:string}){
 const {language}=useLanguage();const he=language==='he';const sourceLabels:Record<string,string>={'deltoid':'DELTOID','biceps-brachii':'BICEPS BRACHII','coracobrachialis':'CORACO-BRACHIALIS'};
 const illustration=anatomyImageFor(slug);const [failed,setFailed]=useState(false);
 if(!illustration)return null;
 return <Localize>{<figure className="anatomy-illustration"><h3>{he?'איור אנטומי מהמקור':'Original anatomical plate'}</h3>{sourceLabels[slug]&&<p>{he?'תווית השריר באיור: ':'Muscle label in this plate: '}<strong lang="en" dir="ltr">{sourceLabels[slug]}</strong></p>}{failed?<div role="status"><p>האיור אינו נטען כרגע. אפשר לפתוח אותו באתר המקור.</p><button className="button secondary" onClick={()=>setFailed(false)}>ניסיון נוסף</button></div>:<img src={illustration.url} alt={illustration.alt} width={illustration.width} height={illustration.height} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>}
 <figcaption><strong>{illustration.title}</strong><p>{illustration.credit}</p><div className="care-actions"><a className="text-button" href={illustration.source} target="_blank" rel="noopener noreferrer">מקור ופרטי האיור</a><a className="text-button" href={illustration.url} target="_blank" rel="noopener noreferrer">פתיחת האיור בגודל המקורי</a><a className="text-button" href={illustration.licenseUrl} target="_blank" rel="noopener noreferrer">{illustration.license}</a></div><p className="care-muted">האיור מוצג ללא שינוי, עם תוויות המקור. הוא עשוי לכלול שרירים נוספים. זהו איור ללמידה, ולא הדמיה אישית.</p></figcaption></figure>}</Localize>;
}
