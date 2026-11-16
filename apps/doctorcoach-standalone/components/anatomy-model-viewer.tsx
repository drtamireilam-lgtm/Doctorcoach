'use client';
import {useEffect,useRef,useState} from 'react';
import type {createAnatomyCanvas,AnatomyCamera} from '../lib/anatomy-canvas';
import {modelForRegion,detailModelForStructure,readCameraState,type AnatomyModel,type AtlasLayer,type CameraState} from '../lib/anatomy-models';
import {learningCard,anatomyLabels,anatomyMatches} from '../lib/anatomy-learning';
import {positionAnnotation} from '../lib/anatomy-annotations';
import {MuscleExercises} from './anatomy-exercises';
import './anatomy-4.css';
import {anatomyHiddenStructures,type MuscleDepth} from '../lib/anatomy-depth';

/** One owned scene at a time. Only validated bundled assets; no remote URLs or uploads. */
export function AnatomyModelViewer({model,language,onExercise,onMuscle,onRegion,initialSelection,autoOpen=false}:{model:AnatomyModel;language:'he'|'en';onExercise:(id:string)=>void;onMuscle:(slug:string)=>void;onRegion?:(id:string)=>void;initialSelection?:string;autoOpen?:boolean}){
 const he=language==='he',t=anatomyLabels[language],key='dc-'+model.id+'-view';
 const layers=[...new Set(model.structures.map(s=>s.layer))];
 const host=useRef<HTMLDivElement|null>(null),controller=useRef<Awaited<ReturnType<typeof createAnatomyCanvas>>|null>(null),camera=useRef<CameraState|null>(null);
 const [hydrated,setHydrated]=useState(false),[started,start]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState(false),[attempt,retry]=useState(0);
 const [selection,select]=useState<string|null>(null),[visible,setVisible]=useState<Set<AtlasLayer>>(new Set(layers)),[isolated,isolate]=useState(false);
 const [hidden,setHidden]=useState<Set<string>>(new Set()),[query,setQuery]=useState('');
 const [depths,setDepths]=useState<Set<MuscleDepth>>(new Set(['superficial','deep'])),[bodySide,setBodySide]=useState<'both'|'left'|'right'>('both'),[hideHistory,setHideHistory]=useState<string[]>([]);
 const effectiveHidden=anatomyHiddenStructures(model.structures,hidden,depths,bodySide);
 const [hover,setHover]=useState<string|null>(null),[detailsOpen,setDetailsOpen]=useState(false);
 const [anchor,setAnchor]=useState<{x:number;y:number;width:number;height:number;obscured:boolean}|null>(null);
 const annotationRef=useRef<HTMLDivElement|null>(null);
 const [labelSize,setLabelSize]=useState({width:216,height:124});
 useEffect(()=>{if(!annotationRef.current)return;const observer=new ResizeObserver(()=>{const bounds=annotationRef.current?.getBoundingClientRect();if(bounds)setLabelSize({width:Math.ceil(bounds.width),height:Math.ceil(bounds.height)});});observer.observe(annotationRef.current);return()=>observer.disconnect();},[selection,hover,loaded,language,!!anchor]);
 useEffect(()=>{setDetailsOpen(false);},[selection]);
 const state=useRef({started,selection,visible:[...visible],isolated,hidden:[...hidden]});state.current={started,selection,visible:[...visible],isolated,hidden:[...hidden]};
 const persist=useRef(()=>{});persist.current=()=>{try{sessionStorage.setItem(key,JSON.stringify({...state.current,camera:camera.current}));}catch{}};
 useEffect(()=>{
  try{const saved=JSON.parse(sessionStorage.getItem(key)??'null');if(saved?.started)start(true);if(model.structures.some(s=>s.id===saved?.selection))select(saved.selection);if(Array.isArray(saved?.visible))setVisible(new Set(layers.filter(l=>saved.visible.includes(l))));isolate(saved?.isolated===true);camera.current=readCameraState(saved?.camera);}catch{}
  try{const saved=JSON.parse(sessionStorage.getItem(key)??'null');if(Array.isArray(saved?.hidden))setHidden(new Set(model.structures.filter(s=>saved.hidden.includes(s.id)).map(s=>s.id)));}catch{}
  if(autoOpen)start(true);setHydrated(true);
 },[key]); // Each model is keyed by its catalog ID in the parent.
 const requestedSelection=useRef(initialSelection);
 useEffect(()=>{
  const newlyRequested=requestedSelection.current!==initialSelection;requestedSelection.current=initialSelection;
  if(initialSelection&&model.structures.some(s=>s.id===initialSelection)){
   // A reload preserves deliberate hiding; a new navigation request reveals its target.
   let savedHidden=false;try{savedHidden=JSON.parse(sessionStorage.getItem(key)??'null')?.hidden?.includes(initialSelection)===true;}catch{}
   if(!newlyRequested&&savedHidden){select(null);isolate(false);return;}
   select(initialSelection);start(true);setVisible(new Set(layers));isolate(false);
   setHidden(previous=>{const next=new Set(previous);next.delete(initialSelection);return next;});
  }else if(initialSelection){select(null);isolate(false);}
 },[initialSelection,model,key]);
 useEffect(()=>{if(hydrated)persist.current();},[started,selection,visible,isolated,hidden,hydrated]);
 const selected=model.structures.find(s=>s.id===selection),learningId=selected?.learningId??selection,card=learningId&&!model.overview?learningCard(learningId):undefined;
 const combined=model.id==='musculoskeletal'||model.id==='detailed';
 const detailedRegion=(model.id==='skeleton'||combined)&&selected?detailModelForStructure(selected):undefined;
 const innervationSource=typeof card?.innervationReference==='string'?card.innervationReference:card?.innervationReference?.source;
 useEffect(()=>{
  if(!started)return;const abort=new AbortController();setLoaded(false);setError(false);
  import('../lib/anatomy-canvas').then(async module=>{
   if(!host.current||abort.signal.aborted)return;
   const scene=await module.createAnatomyCanvas(host.current,id=>select(id),abort.signal,{model,camera:camera.current,onAnchor:setAnchor,onHover:setHover,onCameraChange:value=>{camera.current=value;persist.current();}});
   if(abort.signal.aborted){scene.dispose();return;}controller.current=scene;setLoaded(true);
  }).catch(()=>{if(!abort.signal.aborted)setError(true);});
  return()=>{if(controller.current){camera.current=controller.current.snapshot();persist.current();}abort.abort();controller.current?.dispose();controller.current=null;};
 },[started,attempt,model]);
 useEffect(()=>{controller.current?.update(selection??hover,visible,isolated?selection:null,effectiveHidden);},[selection,hover,visible,isolated,hidden,depths,bodySide,loaded]);
 function openExercise(id:string){
  if(window.location.hash.startsWith('#learn')){const query=new URLSearchParams(window.location.hash.split('?')[1]??'');query.set('exercise',id);window.history.replaceState(null,'','#learn?'+query.toString());}
  // Replace the current learning entry before leaving, so back navigation reflects the latest mesh selection.
  if(!combined&&selected?.layer==='muscle'&&window.location.hash.startsWith('#learn')){
   const query=new URLSearchParams(window.location.hash.split('?')[1]??'');const region=query.get('region');query.set('region',region&&model.regions.includes(region)?region:model.regions[0]);query.set('muscle',selected.id);query.delete('atlas');
   window.history.replaceState(null,'','#learn?'+query.toString());
  }
  onExercise(id);
 }
 function view(value:AnatomyCamera){controller.current?.setView(value);}
 function toggle(layer:AtlasLayer){setVisible(previous=>{const next=new Set(previous);next.has(layer)?next.delete(layer):next.add(layer);return next;});if(selected?.layer===layer){select(null);isolate(false);}}
 function showGroup(){if(!selected)return;setHideHistory([]);const region=selected.regionId??learningCard(selected.learningId??selected.id)?.region??model.regions[0];if(!region)return;setVisible(new Set(layers));isolate(false);setHidden(new Set(model.structures.filter(s=>s.layer!=='muscle'||(s.regionId??learningCard(s.learningId??s.id)?.region??model.regions[0])!==region).map(s=>s.id)));}
 const annotated=selected??model.structures.find(s=>s.id===hover);
 const annotation=anchor?positionAnnotation(anchor,{width:anchor.width,height:anchor.height},labelSize,he?'rtl':'ltr'):null;
 const regionNote=model.id==='detailed'?(he?'מודל לימודי משולב: Écorché / BodyParts3D / Z-Anatomy. סקירה קלינית ממתינה.':'Combined educational model: Écorché / BodyParts3D / Z-Anatomy. Clinical review pending.'):model.overview?(he?'מעטפת גוף מקורית לניווט. האזורים משוערים ואינם גבולות שרירים.':'Original body surface for navigation. Regions are approximate, not muscle boundaries.'):(he?'מודל לימודי מ־BodyParts3D. סקירה קלינית של המודל והתוכן טרם הושלמה.':'Educational BodyParts3D model. Clinical review of this model and content is pending.');
 return <section className="panel care-stack anatomy-model-viewer" dir={he?'rtl':'ltr'} aria-label={model[language]} data-model-id={model.id} data-no-translate>
  <div className="section-heading"><h2>{model[language]}</h2>{!model.overview&&<small>{model.sideNote?.[language]??(he?'צד ימין':'Right side')}</small>}</div>
  <p className="care-muted">{regionNote}</p>
  {model.coverageNote&&<p role="note">{model.coverageNote[language]}</p>}
  {initialSelection&&!model.structures.some(s=>s.id===initialSelection)&&<p role="status">{he?'לשריר שנבחר אין גאומטריה במודל הזה. כרטיס הלמידה שלו מופיע בהמשך.':'The selected muscle has no geometry in this model. Its learning card is available below.'}</p>}
  {!started?<button className="primary-button" disabled={!hydrated} onClick={()=>start(true)}>{model.id==='shoulder'?(he?'פתיחת מודל הכתף':'Open shoulder model'):(he?'פתיחת המודל':'Open model')}</button>:<>
   {!loaded&&!error&&<p role="status">{he?'טוען מודל…':'Loading model…'}</p>}
   {error&&<div role="alert"><p>{he?'לא ניתן לטעון את המודל. רשימת האזורים והמידע עדיין זמינה.':'Unable to load the model. The region list and learning information remain available.'}</p><button onClick={()=>retry(n=>n+1)}>{he?'ניסיון נוסף':'Retry'}</button></div>}
   <div className="anatomy-viewer-stage" onPointerLeave={()=>setHover(null)} style={{display:error?'none':'block'}}>
    <div ref={host} className="anatomy-model-canvas" />
    {annotated&&annotation&&<><svg className="anatomy-annotation-lines" aria-hidden="true" width="100%" height="100%"><line x1={annotation.anchor.x} y1={annotation.anchor.y} x2={annotation.end.x} y2={annotation.end.y} stroke="currentColor" strokeWidth="1.5" strokeDasharray={anchor?.obscured?'4 4':undefined}/><circle cx={annotation.anchor.x} cy={annotation.anchor.y} r="4" fill="currentColor"/></svg><div ref={annotationRef} className="anatomy-annotation-card" data-selected-structure={annotated.id} style={{left:annotation.left,top:annotation.top,width:216,maxWidth:'calc(100% - 24px)'}}>
     <strong>{annotated[language]}</strong>
     {(anchor?.obscured||annotation.offscreen)&&<small>{he?'מוסתר חלקית · להתמקדות':'Partly obscured · Focus to inspect'}</small>}
     {selection?<><button type="button" onClick={()=>setDetailsOpen(v=>!v)} aria-expanded={detailsOpen}>{he?'מידע ותרגילים':'Explore & exercises'} <span aria-hidden="true">→</span></button><button type="button" onClick={()=>controller.current?.focus(selection)}>{he?'התמקדות':'Focus'}</button></>:<button type="button" onClick={()=>select(annotated.id)}>{he?'בחירת המבנה':'Select structure'}</button>}
    </div></>}
   </div>
   <p className="care-muted">{he?'גרירה לסיבוב • צביטה להגדלה • גלילה אנכית להמשך העמוד':'Drag to rotate • Pinch to zoom • Swipe vertically to scroll'}</p>
   <div className="anatomy-region-list anatomy-viewer-toolbar" aria-label={he?'מצלמה':'Camera'}>{[['front',t.front],['back',t.back],['right',he?'מבט מימין':'Right view'],['left',he?'מבט משמאל':'Left view']].map(([orbit,label])=><button disabled={!loaded} key={orbit} onClick={()=>view(orbit as AnatomyCamera)}>{label}</button>)}<button disabled={!loaded} onClick={()=>{view(model.initialView??'front');select(null);isolate(false);setVisible(new Set(layers));setHidden(new Set());setHideHistory([]);setDepths(new Set(['superficial','deep']));setBodySide('both');setQuery('');}}>{t.reset}</button><button onClick={()=>{select(null);isolate(false);}}>{he?'ניקוי הבחירה':'Clear selection'}</button></div>
   <div className="anatomy-region-list" role="group" aria-label={he?'הזזת המודל':'Pan model'}>{([[-1,0,'←'],[1,0,'→'],[0,1,'↑'],[0,-1,'↓']] as const).map(([x,y,label])=><button key={label} disabled={!loaded} aria-label={(he?'הזזת המודל ':'Pan model ')+label} onClick={()=>controller.current?.pan(x,y)}>{label}</button>)}</div>
   {!model.overview&&<div className="anatomy-region-list"><button disabled={!selection||!loaded} onClick={()=>{if(selection){setHidden(previous=>new Set([...previous,selection]));setHideHistory(previous=>[...previous,selection]);}select(null);isolate(false);}}>{he?'הסתרת המבנה':'Hide structure'}</button><button disabled={!hidden.size} onClick={()=>{setHidden(new Set());setHideHistory([]);}}>{he?'החזרת מבנים מוסתרים':'Restore hidden structures'} ({hidden.size})</button><button type="button" disabled={!hideHistory.length} onClick={()=>{const id=hideHistory.at(-1);if(id)setHidden(previous=>{const next=new Set(previous);next.delete(id);return next;});setHideHistory(previous=>previous.slice(0,-1));}}>{he?'ביטול ההסתרה האחרונה':'Undo last hide'}</button></div>}
   <div className="anatomy-viewer-toolbar" aria-label={he?'הגדלה':'Zoom'}><button type="button" disabled={!loaded} onClick={()=>controller.current?.zoom(.8)} aria-label={he?'הגדלה':'Zoom in'}>+</button><button type="button" disabled={!loaded} onClick={()=>controller.current?.zoom(1.25)} aria-label={he?'הקטנה':'Zoom out'}>−</button><button type="button" disabled={!selection} onClick={()=>setDetailsOpen(v=>!v)} aria-expanded={detailsOpen}>{he?'מידע ותרגילים':'Explore & exercises'}</button></div>
   {!model.overview&&<button type="button" disabled={!selected||selected.layer!=='muscle'||!(selected.regionId??card?.region??model.regions[0])} onClick={showGroup}>{he?'הצגת קבוצת השריר':'Show muscle group'}</button>}
   {model.structures.some(s=>s.depth)&&<div className="anatomy-viewer-depth care-stack"><div className="anatomy-region-list" role="group" aria-label={he?'עומק השרירים':'Muscle depth'}>{(['superficial','deep'] as const).map(depth=><button type="button" key={depth} aria-pressed={depths.has(depth)} onClick={()=>{setDepths(previous=>{const next=new Set(previous);next.has(depth)?next.delete(depth):next.add(depth);return next;});select(null);isolate(false);}}>{depth==='superficial'?(he?'שכבה שטחית':'Superficial layer'):(he?'שכבה עמוקה':'Deep layer')}</button>)}</div><label>{he?'צד לתצוגה':'Visible side'}<select value={bodySide} onChange={e=>{setBodySide(e.target.value as 'both'|'left'|'right');select(null);isolate(false);}}><option value="both">{he?'שני הצדדים':'Both sides'}</option><option value="left">{he?'שמאל':'Left'}</option><option value="right">{he?'ימין':'Right'}</option></select></label><small>{he?'אפשר להסתיר את השכבה השטחית, לבחור שריר עמוק ולהחזיר כל מבנה בלחיצה.':'Hide the superficial layer, select deeper structures and undo each hide.'}</small></div>}
   <label>{he?'חיפוש מבנה במודל':'Search structures in model'}<input type="search" value={query} onChange={e=>setQuery(e.target.value)} /></label>
   {!model.overview&&<><div className="anatomy-region-list" aria-label={he?'שכבות':'Layers'}>{layers.map(layer=><button key={layer} aria-pressed={visible.has(layer)} onClick={()=>toggle(layer)}>{layer==='bone'?(model.id==='detailed'?(he?'עצמות ושיניים':'Bones & teeth'):(he?'עצמות':'Bones')):layer==='cartilage'?(model.id==='detailed'?(he?'סחוס ודיסקים':'Cartilage & discs'):(he?'סחוסי צלעות':'Costal cartilage')):layer==='surface'?(he?'מבנים נוספים':'Other structures'):(he?'שרירים':'Muscles')}</button>)}<button disabled={!selection||!loaded} onClick={()=>{if(selection)controller.current?.focus(selection);}}>{he?'התמקדות במבנה':'Focus structure'}</button><button disabled={!selection} aria-pressed={isolated} onClick={()=>isolate(!isolated)}>{isolated?(he?'הצגת כל המבנים':'Show all structures'):(he?'בידוד המבנה':'Isolate structure')}</button></div></>}
   <label>{model.overview?(he?'בחירת אזור בגוף':'Select body region'):(he?'בחירת מבנה':'Select structure')}<select value={selection??''} onChange={e=>select(e.target.value||null)} style={{display:'block',width:'100%',minHeight:44}}><option value="">{he?'בחרו מהרשימה':'Choose from the list'}</option>{model.structures.filter(s=>visible.has(s.layer)&&!effectiveHidden.has(s.id)&&(s.id===selection||anatomyMatches({name:s.he,en:s.en,slug:s.id},query))).map(s=><option key={s.id} value={s.id}>{s[language]}</option>)}</select></label>
   {selected&&detailsOpen&&<article aria-live="polite" className="care-stack anatomy-selection-details"><h3>{selected[language]}</h3>{model.overview?<>{selected.regionId?<><p>{modelForRegion(selected.regionId)?(he?'מודל תלת־ממדי מפורט זמין':'Detailed 3D model available'):(he?'תוכן לימודי זמין; המודל המפורט עדיין חסר':'Learning content available; detailed model pending')}</p><button className="button primary" onClick={()=>onRegion?.(selected.regionId!)}>{he?'פתיחת האזור':'Open region'}</button></>:<p>{he?'הראש מוצג להתמצאות בלבד. מודול מפורט טרם זמין.':'The head is shown for context. A detailed module is not available yet.'}</p>}</>:<><p dir={he?'ltr':'rtl'} lang={he?'en':'he'}>{selected[he?'en':'he']}</p><small>{selected.side==='midline'?(he?'קו האמצע':'Midline'):selected.side==='left'?(he?'צד שמאל':'Left side'):(he?'צד ימין':'Right side')}</small>{card?<><dl className="atlas-definitions">{(['location','action','training'] as const).map(field=><div key={field}><dt>{t[field]}</dt><dd>{card[field][language]}</dd></div>)}</dl><details><summary>{he?'אנטומיה מתקדמת':'Advanced anatomy'}</summary><dl className="atlas-definitions">{(['origin','insertion','joints'] as const).map(field=><div key={field}><dt>{t[field]}</dt><dd>{card[field][language]}</dd></div>)}</dl><p><strong>{he?'עצבוב: ':'Innervation: '}</strong>{card.innervation?.[language]??(he?'טרם נבדק':'Not yet checked')}</p>{innervationSource&&innervationSource!==card.source&&<a href={innervationSource} target="_blank" rel="noopener noreferrer">{he?'מקור לעצבוב ולשונות אנטומית':'Innervation and anatomical variation reference'}</a>}</details><MuscleExercises language={language} key={learningId} slug={learningId!} onExercise={openExercise}/><a href={card.source} target="_blank" rel="noopener noreferrer">{t.source}</a></>:<p>{he?'מידע מפורט למבנה זה טרם הושלם.':'Detailed information for this structure is not yet complete.'}</p>}{model.id!=='detailed'&&(model.id==='skeleton'||combined)&&(detailedRegion?<button className="button primary" onClick={()=>onRegion?.(selected.regionId!)}>{he?'פתיחת האזור':'Open region'}</button>:<p>{he?'מודל אזורי מפורט למבנה ולצד זה עדיין אינו זמין.':'A detailed regional model for this structure and side is not available yet.'}</p>)}{selected.layer==='muscle'&&(!combined||detailedRegion||model.id==='detailed'&&card)&&<button onClick={()=>onMuscle(selected.learningId??selected.id)}>{he?'פתיחת כרטיס השריר':'Open muscle learning card'}</button>}</>}</article>}
  </>}
  <details><summary>{he?'מקור ומבנים חסרים':'Source and unavailable structures'}</summary><p>{model.asset.attribution}</p>{model.availabilityNote&&<p>{model.availabilityNote[language]}</p>}<a href={model.asset.licenseEvidence} target="_blank" rel="noopener noreferrer">{model.id==='detailed'?'Écorché · CC BY-SA 4.0':'BodyParts3D · CC BY 4.0'}</a>{model.id==='detailed'&&<a href="/anatomy/detailed-attribution.md">{he?'ייחוס ושינויים במקור':'Attribution and upstream modifications'}</a>}<p>{model.overview?(he?'זו מעטפת לניווט בלבד. שרירים ועצמות מפורטים נטענים בנפרד באזורים הזמינים.':'This is a navigation surface only. Detailed muscles and bones load separately in available regions.'):(he?'רק המבנים שבתפריט כלולים. גאומטריה נפרדת של מפרקים, גידים, רצועות ועצבים אינה כלולה. יתר שרירי האזור עשויים להיות חסרים.':'Only the listed structures are included. Separate joint, tendon, ligament and nerve geometry is unavailable. Other regional muscles may be absent.')} {he?'הסקירה הקלינית ממתינה.':'Clinical review is pending.'}</p><a href={'/anatomy/'+(model.id==='shoulder'?'source-and-license.json':model.id+'-source-and-license.json')}>{he?'פרטי מקור ועיבוד':'Source and conversion metadata'}</a></details>
 </section>;
}
