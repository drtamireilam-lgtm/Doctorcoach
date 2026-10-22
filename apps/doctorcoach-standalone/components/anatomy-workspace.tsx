'use client';
import {BrowseResults} from './browse-results';
import {Localize,useLanguage} from './language-provider';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ArrowLeft,Search,BookOpen} from 'lucide-react';
import {FeedbackButton} from './community-workspace';
import {regions,muscles,regionMuscles,muscleMovements,anatomicalSources,injuryMappings,injuryTopics,exerciseFor} from '../lib/anatomy';
import type {Muscle} from '../lib/anatomy';
import {AnatomyReference} from './anatomy-reference';
import {anatomyImageFor} from '../lib/anatomy-images';
import {AnatomyIllustration} from './anatomy-illustration';
import {muscleRegionId} from '../lib/anatomy-navigation';
import {translateText} from '../lib/localization';
import {AnatomyBodyMap} from './anatomy-body-map';
import {anatomyLabels,anatomyHash,readAnatomyHash,anatomyMatches,learningCard,regionNames,type AnatomySide,type AnatomyView} from '../lib/anatomy-learning';
import {anatomy3dLabEnabled} from '../lib/anatomy-lab';
import {modelForRegion,modelRegionForMuscle} from '../lib/anatomy-models';
import {AnatomyAtlasViewer} from './anatomy-atlas-viewer';
import {LearningMotion} from './anatomy-learning-motion';
const muscleRegions=regions.map(r=>({id:r.id,muscleSlugs:regionMuscles(r.id).map(m=>m.slug)}));
export function AnatomyWorkspace({onExercise}:{onExercise:(id:string)=>void}){
 const {language}=useLanguage();const t=anatomyLabels[language];
 const [state,setState]=useState(()=>readAnatomyHash('',regions.map(r=>r.id),muscles.map(m=>m.slug)));
 const [overview,setOverview]=useState(true),[expandedCard,setExpandedCard]=useState(false);
 const [topic,setTopic]=useState('');const detail=useRef<HTMLElement>(null);const pendingFocus=useRef(false);
 useEffect(()=>{function sync(){setExpandedCard(false);const query=new URLSearchParams(window.location.hash.split('?')[1]??'');setOverview(query.get('atlas')==='body'||!query.has('region')&&!query.has('muscle'));const next=readAnatomyHash(window.location.hash,regions.map(r=>r.id),muscles.map(m=>m.slug));if(next.muscle)next.region=modelRegionForMuscle(next.muscle,muscleRegionId(next.muscle,next.region,muscleRegions)??next.region,anatomy3dLabEnabled);setState(next);setTopic('');}sync();window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);return()=>{window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync);};},[]);
 useEffect(()=>{if(pendingFocus.current&&state.muscle){detail.current?.focus({preventScroll:true});detail.current?.scrollIntoView({block:'start',behavior:'instant'});pendingFocus.current=false;}},[state.muscle]);
 const update=(patch:Partial<typeof state>,replace=false,keepBody=false)=>{const next={...state,...patch};window.history[replace?'replaceState':'pushState'](null,'',anatomyHash(next)+(keepBody?'&atlas=body':''));setState(next);};
 const region=state.region;const muscle=muscles.find(m=>m.slug===state.muscle)??null;
 const name=(m:Muscle)=>language==='en'?m.en:m.name;
 const regionLabel=(id:string)=>language==='en'?regionNames[id]??id:regions.find(r=>r.id===id)?.label??id;
 function showBody(){window.history.pushState(null,'','#learn?atlas=body');setState(previous=>({...previous,muscle:undefined,search:''}));setExpandedCard(false);setTopic('');setOverview(true);}
 function openRegion(id:string,side?:AnatomySide){setOverview(false);setExpandedCard(false);update({region:id,muscle:undefined,search:'',...(side?{side}:{}),view:['upper_back_scapula','lower_back_spine','hip_glute'].includes(id)?'back':['chest','core_abdomen','groin'].includes(id)?'front':state.view});setTopic('');}
 function openMuscle(m:Muscle){setOverview(false);setExpandedCard(true);pendingFocus.current=true;const card=learningCard(m.slug);update({region:modelRegionForMuscle(m.slug,muscleRegionId(m.slug,region,muscleRegions)??region,anatomy3dLabEnabled),muscle:m.slug,...(card?{view:card.view}:{})});setTopic('');}
 const listed=state.search.trim()?muscles.filter(m=>anatomyMatches(m,state.search)):regionMuscles(region);
 const mappings=injuryMappings(region,muscle?.slug);const card=muscle?learningCard(muscle.slug):undefined;
 return <section className="anatomy-workspace care-stack anatomy-atlas" dir={language==='en'?'ltr':'rtl'} data-no-translate>
  <div className="workspace-heading"><div><span className="eyebrow">DoctorCoach · {language==='he'?'אנטומיה ולמידה':'Anatomy & learning'}</span><h1>{t.title}</h1><p>{t.intro}</p><small>{muscles.length} {t.count}</small></div><BookOpen size={28}/></div>
  <div className="browse-search-panel"><div className="search-box"><Search size={20} aria-hidden="true"/><input type="search" maxLength={120} value={state.search} placeholder={t.search} aria-label={t.search} onChange={e=>update({search:e.target.value,muscle:undefined},true,overview)}/></div><label className="library-filter">{t.region}<select value={anatomy3dLabEnabled&&overview?"__body":region} onChange={e=>e.target.value==="__body"?showBody():openRegion(e.target.value)}>{anatomy3dLabEnabled&&<option value="__body">{language==='he'?'הגוף המלא':'Full body'}</option>}{regions.map(r=><option value={r.id} key={r.id}>{regionLabel(r.id)}{anatomy3dLabEnabled?(modelForRegion(r.id)?' · 3D':(language==='he'?' · תוכן לימודי':' · Learning content')):''}</option>)}</select></label>{state.search&&<button className="text-button" onClick={()=>update({search:''},true,overview)}>{t.clear}</button>}</div>
  {anatomy3dLabEnabled&&<AnatomyAtlasViewer language={language} region={region} muscle={state.muscle} overview={overview} onOverview={showBody} onRegion={openRegion} onExercise={onExercise} onMuscle={slug=>{const m=muscles.find(m=>m.slug===slug);if(m)openMuscle(m);}}/>}
  {(!anatomy3dLabEnabled||(!overview||!!state.search.trim())&&(!modelForRegion(region)?.structures.some(s=>s.id===state.muscle)||expandedCard))&&<div className="atlas-layout"><div className="atlas-map-column">{anatomy3dLabEnabled?<details><summary>{language==='he'?'מפת ניווט דו־ממדית':'Two-dimensional navigation map'}</summary><AnatomyBodyMap language={language} region={region} side={state.side} view={state.view} onRegion={openRegion} onSide={side=>update({side})} onView={(view:AnatomyView)=>update({view})}/></details>:<AnatomyBodyMap language={language} region={region} side={state.side} view={state.view} onRegion={openRegion} onSide={side=>update({side})} onView={(view:AnatomyView)=>update({view})}/>}{!anatomy3dLabEnabled&&<nav className="anatomy-region-list" aria-label={t.region}>{regions.map(r=><button key={r.id} onClick={()=>openRegion(r.id)} aria-pressed={region===r.id}>{regionLabel(r.id)}</button>)}</nav>}</div>
   <div className="care-stack" data-tour="region-muscles">{muscle?<>
    <button className="back-link" onClick={()=>update({muscle:undefined})}>{language==='he'?<ArrowRight size={18}/>:<ArrowLeft size={18}/>} {t.return}</button>
    <article ref={detail} tabIndex={-1} className="panel muscle-detail atlas-detail" aria-labelledby="atlas-muscle-title">
     <span className="eyebrow">{regionLabel(region)} · {t[state.side]}</span><h2 id="atlas-muscle-title">{name(muscle)}</h2><p lang={language==='he'?'en':'he'} dir={language==='he'?'ltr':'rtl'} className="muscle-english">{language==='he'?muscle.en:muscle.name}</p>
     {card?<><dl className="atlas-definitions">{(['location','origin','insertion','action','joints'] as const).map(key=><div key={key}><dt>{t[key]}</dt><dd>{card[key][language]}</dd></div>)}</dl><h3>{t.training}</h3><p>{card.training[language]}</p></>:<><p>{translateText(muscle.action,language)}</p><p className="note">{t.missing}</p></>}
     <div className="atlas-region-context"><strong>{t.illustration}: </strong>{regionLabel(card?.region??region)} · {t[card?.view??state.view]}</div>
     {anatomyImageFor(muscle.slug)?<AnatomyIllustration key={muscle.slug} slug={muscle.slug}/>:<AnatomyReference key={muscle.slug+(card?.view??state.view)} view={card?.view??state.view}/>}
     <LearningMotion slug={muscle.slug}/>
     {muscleMovements(muscle).length>0&&<details className="browse-advanced"><summary>{language==='he'?'תנועות שבהן השריר משתתף':'Movements involving this muscle'}</summary>{muscleMovements(muscle).map(m=><div className="movement-row" key={m.movement_id}><strong>{language==='en'?m.name_en:m.animation_action_he}</strong><span>{translateText(m.animation_start_he,language)}</span></div>)}</details>}
     <h3>{t.exercises}</h3><div className="atlas-exercises">{card?.links.map(link=>{const e=exerciseFor(link.id);return e?<button type="button" className="panel" key={link.id} onClick={()=>onExercise(e.id)}><strong>{language==='en'?e.en:e.name}</strong><small>{t[link.role]}</small><span aria-hidden="true">↗</span></button>:null;})}</div>{!card?.links.length&&<p className="care-muted">{t.noExercises}</p>}
     {card&&<a className="text-button" href={card.source} target="_blank" rel="noopener noreferrer">{t.source} ↗</a>}
     <details className="browse-advanced"><summary>{language==='he'?'מקורות נוספים':'More references'}</summary><div className="anatomy-sources">{muscle.source&&<a href={muscle.source} target="_blank" rel="noopener noreferrer">{language==='he'?'קטלוג איורים במקור':'Original illustration catalog'}</a>}{anatomicalSources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{translateText(source.title,language)}</a>)}</div></details>
     <p className="care-muted">{t.learnOnly}</p><h3>{t.feedback}</h3><FeedbackButton key={muscle.slug+language} context={'anatomy:'+muscle.slug+' | lang:'+language+' | side:'+state.side} displayContext={name(muscle)} section="anatomy" bodyRegion={region==='wrist_hand'?'wrist':region}/>
     <details className="browse-advanced"><summary>{t.motion}</summary><InjuryMapping mappings={mappings} topic={topic} setTopic={setTopic} onExercise={onExercise}/></details>
    </article>
   </>:<><div className="section-heading"><h2>{state.search?t.results:regionLabel(region)}</h2><span aria-live="polite">{listed.length}</span></div><BrowseResults key={region+':'+state.search} items={listed}>{visible=><div className="muscle-list">{visible.map(m=><button className="panel muscle-card" key={m.slug} onClick={()=>openMuscle(m)}><span><strong>{name(m)}</strong><small lang={language==='he'?'en':'he'} dir="auto">{language==='he'?m.en:m.name}</small></span>{language==='he'?<ArrowLeft size={18}/>:<ArrowRight size={18}/>}</button>)}</div>}</BrowseResults>{!listed.length&&<div className="panel care-empty" role="status">{t.empty}</div>}
    <details className="panel browse-advanced"><summary>{t.motion}</summary><InjuryMapping mappings={mappings} topic={topic} setTopic={setTopic} onExercise={onExercise}/></details>
    {injuryTopics(region).length>0&&<Localize><details className="panel anatomy-topics"><summary>נושאים נוספים באזור</summary><p>שמות הנושאים אינם אבחנה. לבירור אישי פנו לרופא דרך ההודעות.</p><div className="care-tags">{injuryTopics(region).map(i=><span key={i.slug} className="care-pill">{i.name_he}</span>)}</div></details></Localize>}
   </>}
   {['cervical_neck','upper_back_scapula','lower_back_spine'].includes(region)&&<aside className="panel"><h3>{t.spine}</h3><p>{t.spineNote}</p><div className="anatomy-region-list">{['cervical_neck','upper_back_scapula','lower_back_spine'].map(id=><button key={id} aria-pressed={id===region} onClick={()=>openRegion(id)}>{regionLabel(id)}</button>)}</div></aside>}
   </div>
  </div>}
 </section>;
}
function InjuryMapping({mappings,topic,setTopic,onExercise}:{mappings:ReturnType<typeof injuryMappings>;topic:string;setTopic:(v:string)=>void;onExercise:(id:string)=>void}){if(!mappings.length)return <Localize>{<div className="note">להתאמת שיקום או אימון סביב פציעה, העבירו לצוות את האבחנה וההגבלות בתיק האישי.</div>}</Localize>;const selected=mappings.find(m=>m.injury_id===topic)??mappings[0];const groups=[{key:'train_around_recommended',title:'Recommended · אפשרות לשקילה'},{key:'train_around_modify',title:'Modify · דורש התאמה'},{key:'rehab',title:'Rehabilitation · שיקום'},{key:'avoid_if_provocative',title:'Avoid · להימנע אם מעורר תסמינים'}] as const;return <Localize>{<section className="panel injury-mapping"><h3>פציעות ותרגילים קשורים</h3><div className="mapping-topics">{mappings.map(m=><button key={m.injury_id} onClick={()=>setTopic(m.injury_id)} className={m.injury_id===selected.injury_id?'selected':''}>{m.name_he}</button>)}</div><p className="note">מיפוי לימודי שהוכן לצוות, לפני אישור תוכן קליני סופי. אין כאן אבחון או אישור לבצע תרגיל. בחירה ומינון דורשים התאמה לפי בדיקה, הגבלות ותגובה.</p><div className="mapping-groups">{groups.map(g=><div key={g.key} className={'mapping-group '+g.key}><h4>{g.title}</h4>{selected[g.key].map(id=>{const e=exerciseFor(id);return e?<button className="text-button" key={id} onClick={()=>onExercise(e.id)}>{e.name}<ArrowLeft size={14}/></button>:null;})}{!selected[g.key].length&&<span className="care-muted">לא הוגדר במיפוי</span>}</div>)}</div><FeedbackButton context={'פציעה: '+selected.name_he}/></section>}</Localize>;}
