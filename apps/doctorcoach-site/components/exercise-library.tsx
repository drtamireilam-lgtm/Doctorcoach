'use client';
import {Localize} from "../components/language-provider";
import { useId, useMemo, useState } from 'react';
import { ArrowLeft, Check, Dumbbell, Heart, Plus, Search, X } from 'lucide-react';
import { exercises } from '../lib/content';
import {demoExerciseIds,filterLibraryExercises} from '../lib/exercise-library';
import {useCareResource} from '../hooks/use-care';
import type {VideoAsset} from '../lib/media-store';
import type { TrainingController } from '../hooks/use-training';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type Exercise = typeof exercises[number];
type LibraryProps = { controller:TrainingController; onDetails:(id:string)=>void };

export function FavoriteButton({ exercise, controller, inline=false }: { exercise:Exercise; controller:TrainingController; inline?:boolean }) {
  const favorite = controller.favorites.includes(exercise.id);
  return <Localize>{<button className={inline ? 'button secondary favorite-inline' : 'favorite-button'} aria-pressed={favorite} aria-label={`${favorite ? 'הסרה מהמועדפים' : 'שמירה במועדפים'}: ${exercise.name}`} title={favorite ? 'הסרה מהמועדפים' : 'שמירה במועדפים'} disabled={controller.busy || controller.auth === 'loading'} onClick={()=>controller.toggleFavorite(exercise.id)}>
    <Heart size={18} fill={favorite ? 'currentColor' : 'none'}/>{inline && (favorite ? 'נשמר במועדפים' : 'שמירה במועדפים')}
  </button>}</Localize>;
}

export function ExerciseCard({ exercise:e, controller, onDetails,hasDemo }: LibraryProps & { exercise:Exercise;hasDemo?:boolean }) {
  const inPlan = controller.plan.some(item => item.exerciseId === e.id);
  return <Localize>{<article className="exercise-card">
    <div className="exercise-art"><div className="exercise-symbol" aria-hidden="true">{e.symbol}</div><span className="exercise-kind">{e.kind}</span><FavoriteButton exercise={e} controller={controller}/></div>
    <div className="exercise-content"><div className="exercise-meta">{e.group} <span>•</span> {e.level}</div><h3>{e.name}</h3><small lang="en" dir="ltr">{e.en}</small><p>{e.desc}</p>
      {hasDemo&&<span className="care-pill">כולל סרטון הדגמה</span>}
      <div className="card-bottom"><button className="text-button" onClick={()=>onDetails(e.id)}>{hasDemo?'לפרטים ולהדגמה':'לפרטים'} <ArrowLeft size={16}/></button>{controller.access?.canBuild?<button className="small-add" disabled={controller.busy || inPlan} onClick={()=>controller.add(e.id)}>{inPlan ? <><Check size={15}/> בתוכנית</> : <><Plus size={15}/> הוספה</>}</button>:inPlan?<span className="care-pill"><Check size={15}/> בתוכנית שלי</span>:null}</div>
    </div>
  </article>}</Localize>;
}

function LibraryFilter({ label, value, onChange, options, allLabel }: { label:string; value:string; onChange:(value:string)=>void; options:string[]; allLabel:string }) {
  const id = useId();
  return <Localize>{<div className="library-filter"><label htmlFor={id}>{label}</label><Select dir="rtl" value={value} onValueChange={onChange}><SelectTrigger className="service-select" id={id}><SelectValue/></SelectTrigger><SelectContent className="service-select-options"><SelectItem value="all">{allLabel}</SelectItem>{options.map(option=><SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>}</Localize>;
}

export function ExerciseLibrary({ controller, onDetails }: LibraryProps) {
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('all');
  const [kind, setKind] = useState('all');
  const [level, setLevel] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [videosOnly,setVideosOnly]=useState(false);
  const demos=useCareResource<{videos:VideoAsset[]}>('/api/media?kind=demo');
  const demoIds=useMemo(()=>demoExerciseIds(demos.error?null:demos.data?.videos??null),[demos.data,demos.error]);
  const filtered = useMemo(()=>filterLibraryExercises(exercises,{search,area,kind,level,favoritesOnly,favorites:controller.favorites,videosOnly,demoIds}),[search,area,kind,level,favoritesOnly,controller.favorites,videosOnly,demoIds]);
  const hasFilters = !!search || area !== 'all' || kind !== 'all' || level !== 'all'||videosOnly;
  const clearFilters = () => { setSearch(''); setArea('all'); setKind('all'); setLevel('all');setVideosOnly(false); };
  const favoritesUnavailable = favoritesOnly && controller.auth !== 'ready';
  const noFavorites = favoritesOnly && !controller.favorites.length;
  return <Localize>{<>
    <div className="page-heading"><span className="eyebrow">לנוע טוב יותר</span><h1>ספריית התרגילים</h1><p>{controller.access?.canBuild?'מוצאים תרגיל, צופים בדגשי הביצוע ובונים את התוכנית העצמאית.':'מכירים את התרגילים, צופים בדגשי הביצוע ושומרים למועדפים. בליווי אישי המאמן בוחר את התרגילים בתוכנית.'}</p></div>
    <div className="library-toolbar"><div className="library-mode" aria-label="תצוגת הספרייה"><button aria-pressed={!favoritesOnly} onClick={()=>setFavoritesOnly(false)}><Dumbbell size={17}/> כל התרגילים</button><button aria-pressed={favoritesOnly} onClick={()=>setFavoritesOnly(true)}><Heart size={17}/> המועדפים שלי {controller.auth === 'ready' && <span>({controller.favorites.length})</span>}</button><button aria-pressed={videosOnly} disabled={demoIds===null} onClick={()=>setVideosOnly(!videosOnly)}>עם סרטון הדגמה</button></div></div>
    {demos.error&&<p className="care-muted" role="status">לא ניתן לעדכן את זמינות סרטוני ההדגמה כרגע. עדיין אפשר לעיין בתרגילים. <button className="text-button" disabled={demos.loading} onClick={demos.reload}>ניסיון נוסף</button></p>}
    <div className="library-filter-row">
      <div className="search-box"><Search size={19}/><input type="search" placeholder="שם תרגיל או אזור בגוף…" aria-label="חיפוש תרגילים" value={search} onChange={event=>setSearch(event.target.value)}/></div>
      <LibraryFilter label="קבוצת שרירים" allLabel="כל הקבוצות" value={area} onChange={setArea} options={[...new Set(exercises.map(e=>e.group))]}/>
      <LibraryFilter label="סוג התרגיל" allLabel="כל הסוגים" value={kind} onChange={setKind} options={['רגיל','סביב פציעה','שיקום']}/>
      <LibraryFilter label="רמת קושי" allLabel="כל הרמות" value={level} onChange={setLevel} options={[...new Set(exercises.map(e=>e.level))]}/>
    </div>
    <div className="library-result-line"><p role="status" aria-live="polite">{videosOnly&&demoIds===null?'זמינות הסרטונים עדיין לא אומתה':favoritesUnavailable ? 'המועדפים נשמרים בחשבון האישי' : <><strong>{filtered.length}</strong> תרגילים {favoritesOnly ? 'במועדפים' : 'בספרייה'}</>}</p>{hasFilters && <button className="text-button" onClick={clearFilters}><X size={15}/> איפוס סינון</button>}</div>
    {videosOnly&&demoIds===null?<div className="panel care-empty" role="status"><p>{demos.error?'לא ניתן לבדוק את סרטוני ההדגמה כרגע.':'טוענים את סרטוני ההדגמה…'}</p><button className="button secondary" disabled={demos.loading} onClick={demos.reload}>ניסיון נוסף</button><button className="text-button" onClick={()=>setVideosOnly(false)}>הצגת תרגילים ללא סינון סרטונים</button></div>:favoritesUnavailable ? <div className="empty-state library-empty"><Heart size={30}/><h2>{controller.auth === 'loading' ? 'טוענים את המועדפים…' : controller.auth === 'error' ? 'לא הצלחנו לטעון את המועדפים' : 'התרגילים האהובים, במקום אחד'}</h2><p>{controller.auth === 'required' ? 'מתחברים לחשבון ושומרים תרגילים בלחיצה על הלב.' : 'המועדפים שלך יוצגו כאן לאחר טעינת החשבון.'}</p>{controller.auth === 'required' && <a className="button primary library-login" href="/signin-with-chatgpt?return_to=%2F%23library" target="_top">התחברות לחשבון <ArrowLeft size={16}/></a>}{controller.auth === 'error' && <button className="button secondary" onClick={()=>controller.refresh()}>ניסיון נוסף</button>}</div> : filtered.length ? <div className="exercise-grid">{filtered.map(exercise=><ExerciseCard key={exercise.id} exercise={exercise} controller={controller} onDetails={onDetails} hasDemo={demoIds?.has(exercise.id)}/>)}</div> : <div className="empty-state library-empty">{noFavorites ? <Heart size={30}/> : <Search size={30}/>}<h2>{noFavorites ? 'המועדפים שלך מתחילים כאן' : 'לא נמצאו תרגילים מתאימים'}</h2><p>{noFavorites ? 'לחצו על הלב בכרטיס תרגיל כדי לשמור אותו כאן.' : 'אפשר לשנות את החיפוש או לאפס את הסינון.'}</p><button className="button secondary" onClick={()=>{clearFilters();if(noFavorites)setFavoritesOnly(false);}}>{noFavorites ? 'לכל התרגילים' : 'איפוס סינון'}</button></div>}
  </>}</Localize>;
}
