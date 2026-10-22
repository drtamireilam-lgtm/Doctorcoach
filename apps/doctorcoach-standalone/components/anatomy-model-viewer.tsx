'use client';
import {useEffect,useRef,useState} from 'react';
import type {createAnatomyCanvas,AnatomyCamera} from '../lib/anatomy-canvas';
import {modelForRegion,readCameraState,type AnatomyModel,type AtlasLayer,type CameraState} from '../lib/anatomy-models';
import {learningCard,anatomyLabels} from '../lib/anatomy-learning';
import {exerciseFor} from '../lib/anatomy';

/** One owned scene at a time. Only validated bundled assets; no remote URLs or uploads. */
export function AnatomyModelViewer({model,language,onExercise,onMuscle,onRegion,initialSelection,autoOpen=false}:{model:AnatomyModel;language:'he'|'en';onExercise:(id:string)=>void;onMuscle:(slug:string)=>void;onRegion?:(id:string)=>void;initialSelection?:string;autoOpen?:boolean}){
 const he=language==='he',t=anatomyLabels[language],key='dc-'+model.id+'-view';
 const layers=[...new Set(model.structures.map(s=>s.layer))];
 const host=useRef<HTMLDivElement|null>(null),controller=useRef<Awaited<ReturnType<typeof createAnatomyCanvas>>|null>(null),camera=useRef<CameraState|null>(null);
 const [hydrated,setHydrated]=useState(false),[started,start]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState(false),[attempt,retry]=useState(0);
 const [selection,select]=useState<string|null>(null),[visible,setVisible]=useState<Set<AtlasLayer>>(new Set(layers)),[isolated,isolate]=useState(false);
 const state=useRef({started,selection,visible:[...visible],isolated});state.current={started,selection,visible:[...visible],isolated};
 const persist=useRef(()=>{});persist.current=()=>{try{sessionStorage.setItem(key,JSON.stringify({...state.current,camera:camera.current}));}catch{}};
 useEffect(()=>{
  try{const saved=JSON.parse(sessionStorage.getItem(key)??'null');if(saved?.started)start(true);if(model.structures.some(s=>s.id===saved?.selection))select(saved.selection);if(Array.isArray(saved?.visible))setVisible(new Set(layers.filter(l=>saved.visible.includes(l))));isolate(saved?.isolated===true);camera.current=readCameraState(saved?.camera);}catch{}
  if(autoOpen)start(true);setHydrated(true);
 },[key]); // Each model is keyed by its catalog ID in the parent.
 useEffect(()=>{if(initialSelection&&model.structures.some(s=>s.id===initialSelection)){select(initialSelection);start(true);setVisible(new Set(layers));isolate(false);}else if(initialSelection){select(null);isolate(false);}},[initialSelection,model]);
 useEffect(()=>{if(hydrated)persist.current();},[started,selection,visible,isolated,hydrated]);
 const selected=model.structures.find(s=>s.id===selection),card=selection&&!model.overview?learningCard(selection):undefined;
 const innervationSource=typeof card?.innervationReference==='string'?card.innervationReference:card?.innervationReference?.source;
 useEffect(()=>{
  if(!started)return;const abort=new AbortController();setLoaded(false);setError(false);
  import('../lib/anatomy-canvas').then(async module=>{
   if(!host.current||abort.signal.aborted)return;
   const scene=await module.createAnatomyCanvas(host.current,id=>select(id),abort.signal,{model,camera:camera.current,onCameraChange:value=>{camera.current=value;persist.current();}});
   if(abort.signal.aborted){scene.dispose();return;}controller.current=scene;setLoaded(true);
  }).catch(()=>{if(!abort.signal.aborted)setError(true);});
  return()=>{if(controller.current){camera.current=controller.current.snapshot();persist.current();}abort.abort();controller.current?.dispose();controller.current=null;};
 },[started,attempt,model]);
 useEffect(()=>{controller.current?.update(selection,visible,isolated?selection:null);},[selection,visible,isolated,loaded]);
 function openExercise(id:string){
  // Replace the current learning entry before leaving, so back navigation reflects the latest mesh selection.
  if(selected?.layer==='muscle'&&window.location.hash.startsWith('#learn')){
   const query=new URLSearchParams(window.location.hash.split('?')[1]??'');const region=query.get('region');query.set('region',region&&model.regions.includes(region)?region:model.regions[0]);query.set('muscle',selected.id);query.delete('atlas');
   window.history.replaceState(null,'','#learn?'+query.toString());
  }
  onExercise(id);
 }
 function view(value:AnatomyCamera){controller.current?.setView(value);}
 function toggle(layer:AtlasLayer){setVisible(previous=>{const next=new Set(previous);next.has(layer)?next.delete(layer):next.add(layer);return next;});if(selected?.layer===layer){select(null);isolate(false);}}
 const regionNote=model.overview?(he?'מעטפת גוף מקורית לניווט. האזורים משוערים ואינם גבולות שרירים.':'Original body surface for navigation. Regions are approximate, not muscle boundaries.'):(he?'מודל לימודי מ־BodyParts3D. סקירה קלינית של המודל והתוכן טרם הושלמה.':'Educational BodyParts3D model. Clinical review of this model and content is pending.');
 return <section className="panel care-stack anatomy-model-viewer" dir={he?'rtl':'ltr'} aria-label={model[language]} data-model-id={model.id} data-no-translate>
  <div className="section-heading"><h2>{model[language]}</h2>{!model.overview&&<small>{he?'צד ימין':'Right side'}</small>}</div>
  <p className="care-muted">{regionNote}</p>
  {initialSelection&&!model.structures.some(s=>s.id===initialSelection)&&<p role="status">{he?'לשריר שנבחר אין גאומטריה במודל הזה. כרטיס הלמידה שלו מופיע בהמשך.':'The selected muscle has no geometry in this model. Its learning card is available below.'}</p>}
  {!started?<button className="primary-button" disabled={!hydrated} onClick={()=>start(true)}>{model.id==='shoulder'?(he?'פתיחת מודל הכתף':'Open shoulder model'):(he?'פתיחת המודל':'Open model')}</button>:<>
   {!loaded&&!error&&<p role="status">{he?'טוען מודל…':'Loading model…'}</p>}
   {error&&<div role="alert"><p>{he?'לא ניתן לטעון את המודל. רשימת האזורים והמידע עדיין זמינה.':'Unable to load the model. The region list and learning information remain available.'}</p><button onClick={()=>retry(n=>n+1)}>{he?'ניסיון נוסף':'Retry'}</button></div>}
   <div ref={host} className="anatomy-model-canvas" style={{display:error?'none':'block',width:'100%',height:'min(55vh, 480px)',minHeight:280,borderRadius:20,overflow:'hidden',background:'radial-gradient(ellipse at center, #273247, #101622)'}} />
   <p className="care-muted">{he?'גרירה לסיבוב • צביטה להגדלה • גלילה אנכית להמשך העמוד':'Drag to rotate • Pinch to zoom • Swipe vertically to scroll'}</p>
   <div className="anatomy-region-list" aria-label={he?'מצלמה':'Camera'}>{[['front',t.front],['back',t.back],['right',he?'מבט מימין':'Right view'],['left',he?'מבט משמאל':'Left view']].map(([orbit,label])=><button disabled={!loaded} key={orbit} onClick={()=>view(orbit as AnatomyCamera)}>{label}</button>)}<button disabled={!loaded} onClick={()=>{view(model.initialView??'front');select(null);isolate(false);setVisible(new Set(layers));}}>{t.reset}</button><button onClick={()=>{select(null);isolate(false);}}>{he?'ניקוי הבחירה':'Clear selection'}</button></div>
   {!model.overview&&<><div className="anatomy-region-list" aria-label={he?'שכבות':'Layers'}>{layers.map(layer=><button key={layer} aria-pressed={visible.has(layer)} onClick={()=>toggle(layer)}>{layer==='bone'?(he?'עצמות':'Bones'):(he?'שרירים':'Muscles')}</button>)}<button disabled={!selection||!loaded} onClick={()=>{if(selection)controller.current?.focus(selection);}}>{he?'התמקדות במבנה':'Focus structure'}</button><button disabled={!selection} aria-pressed={isolated} onClick={()=>isolate(!isolated)}>{isolated?(he?'הצגת כל המבנים':'Show all structures'):(he?'בידוד המבנה':'Isolate structure')}</button></div></>}
   <label>{model.overview?(he?'בחירת אזור בגוף':'Select body region'):(he?'בחירת מבנה':'Select structure')}<select value={selection??''} onChange={e=>select(e.target.value||null)} style={{display:'block',width:'100%',minHeight:44}}><option value="">{he?'בחרו מהרשימה':'Choose from the list'}</option>{model.structures.filter(s=>visible.has(s.layer)).map(s=><option key={s.id} value={s.id}>{s[language]}</option>)}</select></label>
   {selected&&<article aria-live="polite" className="care-stack"><h3>{selected[language]}</h3>{model.overview?<>{selected.regionId?<><p>{modelForRegion(selected.regionId)?(he?'מודל תלת־ממדי מפורט זמין':'Detailed 3D model available'):(he?'תוכן לימודי זמין; המודל המפורט עדיין חסר':'Learning content available; detailed model pending')}</p><button className="button primary" onClick={()=>onRegion?.(selected.regionId!)}>{he?'פתיחת האזור':'Open region'}</button></>:<p>{he?'הראש מוצג להתמצאות בלבד. מודול מפורט טרם זמין.':'The head is shown for context. A detailed module is not available yet.'}</p>}</>:<><p dir={he?'ltr':'rtl'} lang={he?'en':'he'}>{selected[he?'en':'he']}</p><small>{he?'צד ימין':'Right side'}</small>{card?<><dl className="atlas-definitions">{(['location','origin','insertion','action','joints','training'] as const).map(field=><div key={field}><dt>{t[field]}</dt><dd>{card[field][language]}</dd></div>)}</dl><p><strong>{he?'עצבוב: ':'Innervation: '}</strong>{card.innervation?.[language]??(he?'טרם נבדק':'Not yet checked')}</p>{innervationSource&&innervationSource!==card.source&&<a href={innervationSource} target="_blank" rel="noopener noreferrer">{he?'מקור לעצבוב ולשונות אנטומית':'Innervation and anatomical variation reference'}</a>}{!card.links.length&&<p>{t.noExercises}</p>}<div className="atlas-exercises">{card.links.map(link=>{const exercise=exerciseFor(link.id);return exercise?<button key={link.id} className="panel" onClick={()=>openExercise(exercise.id)}><strong>{he?exercise.name:exercise.en}</strong><small>{t[link.role]}</small></button>:null;})}</div><a href={card.source} target="_blank" rel="noopener noreferrer">{t.source}</a></>:<p>{he?'מידע מפורט למבנה זה טרם הושלם.':'Detailed information for this structure is not yet complete.'}</p>}{selected.layer==='muscle'&&<button onClick={()=>onMuscle(selected.id)}>{he?'פתיחת כרטיס השריר':'Open muscle learning card'}</button>}</>}</article>}
  </>}
  <details><summary>{he?'מקור ומבנים חסרים':'Source and unavailable structures'}</summary><p>{model.asset.attribution}</p>{model.availabilityNote&&<p>{model.availabilityNote[language]}</p>}<a href={model.asset.licenseEvidence} target="_blank" rel="noopener noreferrer">BodyParts3D · CC BY 4.0</a><p>{model.overview?(he?'זו מעטפת לניווט בלבד. שרירים ועצמות מפורטים נטענים בנפרד באזורים הזמינים.':'This is a navigation surface only. Detailed muscles and bones load separately in available regions.'):(he?'רק המבנים שבתפריט כלולים. גאומטריה נפרדת של מפרקים, גידים, רצועות ועצבים אינה כלולה. יתר שרירי האזור עשויים להיות חסרים.':'Only the listed structures are included. Separate joint, tendon, ligament and nerve geometry is unavailable. Other regional muscles may be absent.')} {he?'הסקירה הקלינית ממתינה.':'Clinical review is pending.'}</p><a href={'/anatomy/'+(model.id==='shoulder'?'source-and-license.json':model.id+'-source-and-license.json')}>{he?'פרטי מקור ועיבוד':'Source and conversion metadata'}</a></details>
 </section>;
}
