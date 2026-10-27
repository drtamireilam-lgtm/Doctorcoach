'use client';
import {BookOpen,ChevronRight,FlaskConical} from 'lucide-react';
import {useEffect,useRef} from 'react';
import {useLanguage} from './language-provider';
import {clinicalArticles} from '../lib/clinical-learning-content';
import type {ClinicalArticle} from '../lib/clinical-learning-content';
import {learningArticleHref} from '../lib/learning-navigation';

export function ClinicalLearning({section,topic}:{section:'physiology'|'supplements';topic:string|null}){
 const {language}=useLanguage(),en=language==='en';
 const articles=clinicalArticles.filter(a=>a.section===section);
 const selected=articles.find(a=>a.id===topic);
 const title=section==='physiology'?(en?'Physiology':'פיזיולוגיה'):(en?'Supplements':'תוספים');
 return <section className="clinical-learning" dir={en?'ltr':'rtl'} aria-label={title}>
  <header className="clinical-heading"><span className="eyebrow">{en?'LEARN • UNDERSTAND • APPLY':'ללמוד • להבין • ליישם'}</span><h1>{title}</h1><p>{section==='physiology'?(en?'Understand how the body responds to training, one mechanism at a time.':'להבין איך הגוף מגיב לאימון, מנגנון אחד בכל פעם.'):(en?'Start with the mechanism. Then consider the evidence, limitations and safety.':'מתחילים במנגנון. ממשיכים לראיות, למגבלות ולבטיחות.')}</p></header>
  <p className="clinical-context">{en?'Educational information, not an individual recommendation or prescription. This content has not been reviewed or approved by Dr. Tamir.':'מידע לימודי, ללא המלצה אישית או מרשם. תוכן זה טרם נבדק או אושר בידי ד״ר תמיר.'}</p>
  {selected?<><a className="text-button clinical-back" href={'#learn?section='+section}>{en?'All topics':'לכל הנושאים'}</a><ClinicalArticleView key={selected.id} article={selected}/></>:<div className="clinical-grid">{articles.map((a,i)=>{
   const copy=a[language];return <article className="panel clinical-card" key={a.id}><div className="clinical-card-top"><span className="clinical-index">{String(i+1).padStart(2,'0')}</span>{section==='physiology'?<BookOpen size={21} aria-hidden="true"/>:<FlaskConical size={21} aria-hidden="true"/>}</div><h2>{copy.title}</h2><p>{copy.summary}</p><a className="clinical-read" href={learningArticleHref(a.id)} aria-label={(en?'Read: ':'לקריאה: ')+copy.title}>{en?'Explore topic':'לקריאת הנושא'}<ChevronRight size={17} aria-hidden="true"/></a></article>;
  })}</div>}
 </section>;
}

function ClinicalArticleView({article}:{article:ClinicalArticle}){
 const {language}=useLanguage(),en=language==='en',a=article[language];
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus();},[article.id]);
 const supplement=article.section==='supplements';
 const labels=en?{practical:'What this means for training',benefit:'Expected benefit',evidence:'Evidence and limitations',risks:'Risks and side effects',interactions:'Interactions',consult:'When to seek professional advice'}:{practical:'משמעות מעשית לאימון',benefit:'תועלת צפויה',evidence:'איכות הראיות ומגבלותיהן',risks:'סיכונים ותופעות לוואי',interactions:'אינטראקציות',consult:'מתי נדרשת התייעצות מקצועית'};
 return <article className="panel clinical-article" aria-labelledby={'article-'+article.id}>
  <span className="eyebrow">{en?'THE MECHANISM':'המנגנון'}</span><h2 ref={heading} id={'article-'+article.id} tabIndex={-1}>{a.title}</h2><p className="clinical-lead">{a.summary}</p>
  <div className="clinical-practical"><h3>{labels.practical}</h3><p>{a.practical}</p></div>
  {supplement&&<div className="clinical-evidence">{(['benefit','evidence','risks','interactions','consult'] as const).map(field=><section key={field}><h3>{labels[field]}</h3><p>{a[field]}</p></section>)}</div>}
  <nav className="clinical-related" aria-label={en?'Related learning':'למידה קשורה'}><h3>{en?'Connect the mechanism':'מחברים בין המנגנונים'}</h3>{article.related.map(id=>{const linked=clinicalArticles.find(a=>a.id===id)!;return <a className="button secondary" key={id} href={learningArticleHref(id)}>{linked[language].title}</a>;})}</nav>
  <details className="clinical-details"><summary>{en?'More detail and sources':'להרחבה ולמקורות'}</summary><p>{a.details}</p><h3>{en?'Sources':'מקורות'}</h3><ul>{article.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}<span className="sr-only">{en?' (opens in a new tab)':' (נפתח בלשונית חדשה)'}</span></a></li>)}</ul></details>
  <footer className="clinical-review">{en?'Literature reviewed: ':'סקירת מקורות: '}<time dateTime={article.reviewedAt}>{article.reviewedAt}</time><span>{en?'Educational summary • no personal dosing':'סיכום לימודי • ללא התאמת מינון אישית'}</span></footer>
 </article>;
}
