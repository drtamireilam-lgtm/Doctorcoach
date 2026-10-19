import React, { Component, Suspense, lazy, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { muscles, relatedExercises } from './data';
import { muscleFromHash } from './interaction';
import './style.css';
import {labels,languageDirection,readLanguage,muscleText,exerciseLabel,type Language} from './i18n';

const AnatomyViewer=lazy(()=>import('./viewer'));
class ViewerBoundary extends Component<{children:React.ReactNode;failure:string},{error:boolean}>{state={error:false};static getDerivedStateFromError(){return {error:true};}render(){return this.state.error?<p role="alert">{this.props.failure}</p>:this.props.children;}}
function App(){
 const [language,setLanguage]=useState<Language>(()=>{try{return readLanguage(localStorage);}catch{return 'he';}});
 const t=labels[language];
 const [webglFailed,setWebglFailed]=useState(false);
 useEffect(()=>{document.documentElement.lang=language;document.documentElement.dir=languageDirection(language);try{localStorage.setItem('dc-anatomy-language',language);}catch{}},[language]);
 const focus=(id:string)=>{const el=document.getElementById(id);el?.focus({preventScroll:true});el?.scrollIntoView({block:'start'});};
 const [selected,setSelected]=useState(()=>muscleFromHash(location.hash, muscles.map(m=>m.id)));
 const [layers,setLayers]=useState<Record<string,boolean>>({superficial:true,deep:false,frame:true}); const [view,setView]=useState(0),[zoom,setZoom]=useState(0),[playing,setPlaying]=useState(false),[reset,setReset]=useState(0);
 useEffect(()=>{const f=()=>setSelected(muscleFromHash(location.hash,muscles.map(m=>m.id)));addEventListener('hashchange',f);addEventListener('popstate',f);return()=>{removeEventListener('hashchange',f);removeEventListener('popstate',f);};},[]);
 useEffect(()=>{const m=muscles.find(m=>m.id===selected);if(m)setLayers(l=>({...l,[m.layer]:true}));},[selected]);
 const select=(id:string)=>{setSelected(id);if(location.hash!==`#${id}`)history.pushState(null,'',`#${id}`);const m=muscles.find(x=>x.id===id);if(m)setLayers(l=>({...l,[m.layer]:true}));};
 const muscle=muscles.find(m=>m.id===selected);
 useEffect(()=>{const q=matchMedia('(prefers-reduced-motion: reduce)');const f=()=>{if(q.matches)setPlaying(false);};q.addEventListener('change',f);return()=>q.removeEventListener('change',f);},[]);
 const content=muscle?muscleText(muscle,language):null;
 return <main><header><span>DOCTOR<span className="red">COACH</span> / LAB</span><span>{t.subtitle}</span><fieldset className="language-toggle"><legend>{t.language}</legend>{(['he','en'] as const).map(value=><button key={value} lang={value} aria-pressed={language===value} onClick={()=>setLanguage(value)}>{value==='he'?'עברית':'English'}</button>)}</fieldset></header><h1>{t.title}</h1><p className="warning" role="note">{t.warning}</p>
 <button className="skip-link" onClick={()=>focus('muscle-list')}>{t.skip}</button><div className="layout"><section id="anatomy-viewer" tabIndex={-1} className="viewer" aria-label={t.viewer}><div className="toolbar"><button onClick={()=>setView(v=>v%2===0?v+2:v+1)}>{t.front}</button><button onClick={()=>setView(v=>v%2===1?v+2:v+1)}>{t.back}</button><button aria-label={t.zoomIn} onClick={()=>setZoom(z=>z+1)}>＋</button><button aria-label={t.zoomOut} onClick={()=>setZoom(z=>z-1)}>−</button></div>
 <div className="canvas" role="group" aria-label={t.canvas}>{webglFailed?<p role="alert">{t.failure}</p>:<ViewerBoundary failure={t.failure}><Suspense fallback={<p role="status">{language==='he'?'טוען מודל…':'Loading model…'}</p>}><AnatomyViewer view={view} zoom={zoom} selected={selected} onSelect={select} layers={layers} playing={playing&&!webglFailed} reset={reset} onFailure={()=>setWebglFailed(true)} failure={t.failure}/></Suspense></ViewerBoundary>}</div>
 <div className="selected-muscle"><strong>{content?.name}</strong><button onClick={()=>focus('muscle-information')}>{t.details}</button></div><p>{t.gestures}</p><fieldset><legend>{t.layers}</legend>{(['superficial','deep','frame'] as const).map(key=><label key={key}><input type="checkbox" checked={layers[key]} onChange={e=>setLayers(l=>({...l,[key]:e.target.checked}))}/>{t[key]}</label>)}</fieldset>
 <div className="animation"><strong>{t.animation}</strong><button disabled={webglFailed} aria-pressed={playing&&!webglFailed} onClick={()=>setPlaying(p=>!p)}>{playing?t.pause:t.play}</button><button onClick={()=>{setPlaying(false);setReset(r=>r+1);}}>{t.reset}</button><p>{t.motionNote}</p></div></section>
 <aside><nav id="muscle-list" tabIndex={-1} aria-label={t.choose}><h2>{t.upper}</h2><button className="details-link" onClick={()=>focus('muscle-information')}>{t.details}</button><div className="muscles">{muscles.map(m=><button key={m.id} aria-pressed={selected===m.id} onClick={()=>select(m.id)}>{language==='he'?m.he:m.en}<small lang={language==='he'?'en':'he'}>{language==='he'?m.en:m.he}</small></button>)}</div></nav></aside>
 <article id="muscle-information" tabIndex={-1} aria-live="polite" aria-atomic="true">{muscle&&content?<><span className="red">{t.draft}</span><h2>{content.name}</h2><h3 lang={language==='he'?'en':'he'}>{content.otherName}</h3><p>{content.simple}</p><dl>{(['location','origin','insertion','innervation','actions'] as const).map(k=><React.Fragment key={k}><dt>{t[k]}</dt><dd>{content[k]}</dd></React.Fragment>)}</dl><h3>{t.professional}</h3><p>{content.professional}</p><h3>{t.exercises}</h3>{relatedExercises(muscle.id).map(l=><p key={l.exerciseId}>{exerciseLabel(l.exercise,language)} · {t[l.role]}</p>)}{!relatedExercises(muscle.id).length&&<p>{t.none}</p>}<p className="muted">{t.selection}</p><button onClick={()=>focus('anatomy-viewer')}>{t.return}</button><details><summary>{t.sources}</summary><a href="https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-upper-limb/" target="_blank" rel="noopener noreferrer">UAMS — Upper limb anatomy tables</a></details></>:<p>{t.select}</p>}</article></div></main>;
}
createRoot(document.getElementById('anatomy-root')!).render(<App/>);
