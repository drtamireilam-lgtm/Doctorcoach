'use client';
import {useEffect,useRef,useState} from 'react';
import type {createAnatomyCanvas,AnatomyCamera} from '../lib/anatomy-canvas';
import {shoulderAsset,shoulderStructures,type AnatomyLayer} from '../lib/anatomy-shoulder';
import {learningCard,anatomyLabels} from '../lib/anatomy-learning';
import {exerciseFor} from '../lib/anatomy';


/** Curated, bundled educational LAB asset. Clinical review remains pending. No uploads. */
export function AnatomyShoulderViewer({language,onExercise,onMuscle}:{language:'he'|'en';onExercise:(id:string)=>void;onMuscle:(slug:string)=>void}){
 const he=language==='he';const t=anatomyLabels[language];
 const host=useRef<HTMLDivElement|null>(null);const controller=useRef<Awaited<ReturnType<typeof createAnatomyCanvas>>|null>(null);
 const [interactive,setInteractive]=useState(false);
 useEffect(()=>setInteractive(true),[]);
 const [started,start]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState(false);
 const [selection,select]=useState<string|null>(null),[visible,setVisible]=useState<Set<AnatomyLayer>>(new Set(['bone','muscle']));
 const [attempt,retry]=useState(0);
 useEffect(()=>{try{const saved=JSON.parse(sessionStorage.getItem('dc-shoulder-view')??'null');if(saved?.started){start(true);if(shoulderStructures.some(s=>s.id===saved.selection))select(saved.selection);}}catch{}},[]);
 useEffect(()=>{if(started)try{sessionStorage.setItem('dc-shoulder-view',JSON.stringify({started,selection}));}catch{}},[started,selection]);
 const selected=shoulderStructures.find(s=>s.id===selection),card=selection?learningCard(selection):undefined;
 useEffect(()=>{if(!started)return;const abort=new AbortController();setLoaded(false);setError(false);import('../lib/anatomy-canvas').then(async module=>{if(!host.current||abort.signal.aborted)return;controller.current=await module.createAnatomyCanvas(host.current,select,abort.signal);if(!abort.signal.aborted){setLoaded(true);}}).catch(()=>{if(!abort.signal.aborted)setError(true);});return()=>{abort.abort();controller.current?.dispose();controller.current=null;};},[started,attempt]);
 useEffect(()=>{controller.current?.update(selection,visible);},[selection,visible,loaded]);
 function view(camera:AnatomyCamera){controller.current?.setView(camera);}
 function toggle(layer:AnatomyLayer){setVisible(previous=>{const next=new Set(previous);next.has(layer)?next.delete(layer):next.add(layer);return next;});if(selected?.layer===layer)select(null);}

 return <section className="panel care-stack" dir={he?'rtl':'ltr'} aria-label={he?'כתף בתלת־ממד':'3D shoulder'} data-no-translate>
  <div className="section-heading"><h2>{he?'כתף בתלת־ממד':'3D shoulder'}</h2><small>{he?'צד ימין':'Right side'}</small></div>
  <p className="care-muted">{he?'מודל לימודי מ־BodyParts3D. סקירה קלינית של המודל והתוכן טרם הושלמה.':'Educational BodyParts3D model. Clinical review of this model and content is pending.'}</p>
  {!started?<button className="primary-button" disabled={!interactive} onClick={()=>start(true)}>{he?'פתיחת מודל הכתף':'Open shoulder model'}</button>:<>
   {!loaded&&!error&&<p role="status">{he?'טוען מודל…':'Loading model…'}</p>}
   {error&&<div role="alert"><p>{he?'לא ניתן לטעון את המודל. אפשר להמשיך ברשימת השרירים.':'Unable to load the model. The muscle list remains available.'}</p><button onClick={()=>{setError(false);setLoaded(false);retry(n=>n+1);}}>{he?'ניסיון נוסף':'Retry'}</button></div>}
   <div ref={host} style={{display:error?'none':'block',width:'100%',height:'min(55vh, 480px)',minHeight:280,borderRadius:20,overflow:'hidden',background:'radial-gradient(ellipse at center, #273247, #101622)'}} />
   <p className="care-muted">{he?'גרירה לסיבוב • צביטה להגדלה • גלילה אנכית להמשך העמוד':'Drag to rotate • Pinch to zoom • Swipe vertically to scroll'}</p>
   <div className="anatomy-region-list" aria-label={he?'מצלמה':'Camera'}>{[['front',t.front],['back',t.back],['right',he?'מבט מימין':'Right view'],['left',he?'מבט משמאל':'Left view']].map(([orbit,label])=><button disabled={!loaded} key={orbit} onClick={()=>view(orbit as AnatomyCamera)}>{label}</button>)}<button disabled={!loaded} onClick={()=>{view('front');select(null);setVisible(new Set(['bone','muscle']));}}>{t.reset}</button><button onClick={()=>select(null)}>{he?'ניקוי הבחירה':'Clear selection'}</button></div>
   <div className="anatomy-region-list" aria-label={he?'שכבות':'Layers'}>{(['bone','muscle'] as const).map(layer=><button key={layer} aria-pressed={visible.has(layer)} onClick={()=>toggle(layer)}>{layer==='bone'?(he?'עצמות':'Bones'):(he?'שרירים':'Muscles')}</button>)}</div>
   <label>{he?'בחירת מבנה':'Select structure'}<select value={selection??''} onChange={e=>select(e.target.value||null)} style={{display:'block',width:'100%',minHeight:44}}><option value="">{he?'בחרו מבנה':'Choose a structure'}</option>{shoulderStructures.filter(s=>visible.has(s.layer)).map(s=><option key={s.id} value={s.id}>{s[language]}</option>)}</select></label>
   {selected&&<article aria-live="polite" className="care-stack"><h3>{selected[language]}</h3><p dir={he?'ltr':'rtl'} lang={he?'en':'he'}>{selected[he?'en':'he']}</p><small>{he?'חגורת הכתף — ימין':'Shoulder girdle — right'}</small>{card?<><dl className="atlas-definitions">{(['location','origin','insertion','action','joints','training'] as const).map(key=><div key={key}><dt>{t[key]}</dt><dd>{card[key][language]}</dd></div>)}</dl><p><strong>{he?'עצבוב: ':'Innervation: '}</strong>{card.innervation?.[language]??(he?'טרם נבדק':'Not yet checked')}</p><div className="atlas-exercises">{card.links.map(link=>{const exercise=exerciseFor(link.id);return exercise?<button key={link.id} className="panel" onClick={()=>onExercise(exercise.id)}><strong>{he?exercise.name:exercise.en}</strong><small>{t[link.role]}</small></button>:null;})}</div><a href={card.source} target="_blank" rel="noopener noreferrer">{t.source}</a></>:<p>{he?'מידע מפורט למבנה זה טרם הושלם.':'Detailed information for this structure is not yet complete.'}</p>}{selected.layer==='muscle'&&<button onClick={()=>onMuscle(selected.id)}>{he?'פתיחת כרטיס השריר':'Open muscle learning card'}</button>}</article>}
  </>}
  <details><summary>{he?'מקור ומבנים חסרים':'Source and unavailable structures'}</summary><p>{shoulderAsset.attribution}</p><a href={shoulderAsset.licenseEvidence} target="_blank" rel="noopener noreferrer">BodyParts3D · CC BY 4.0</a><p>{he?'המודל כולל רק את המבנים שבתפריט. מפרקים כגאומטריה נפרדת, גידים, רצועות, עצבים והרחב הגבי אינם כלולים.':'Only the structures listed in the selector are included. Separate joint geometry, tendons, ligaments, nerves and latissimus dorsi are unavailable.'}</p><a href="/anatomy/source-and-license.json">{he?'פרטי מקור ועיבוד':'Source and conversion metadata'}</a></details>
 </section>;
}
