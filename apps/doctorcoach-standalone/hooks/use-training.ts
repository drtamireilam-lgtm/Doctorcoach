'use client';
import {planItemKey,workoutDayId} from '../lib/workout-days';
import {splitDays,type ProgramSplit} from '../lib/program-split';
import type {WorkoutPreference,WorkoutChoiceMode} from '../lib/workout-choice';
import {apiResponseFailure} from '../lib/api-response';
import type {TrainingAccess} from '../lib/training-access';
import {customId} from '../lib/custom-exercise-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { defaultPrescription } from '../lib/training';
import type { LegacyLog, PlanItem, TrainingFeed, TrainingSession } from '../lib/training';
const emptyFeed: TrainingFeed = { active: null, history: [], stats: { total: 0, week: 0, sets: 0 } };
class ApiError extends Error {
  status: number; session?: TrainingSession;
  constructor(message: string, status: number, session?: TrainingSession) { super(message); this.status = status; this.session = session; }
}
async function request<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch(url, { method, cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }); }
  catch { throw new ApiError('אין חיבור לשרת. השינוי לא אושר; בדקו את החיבור ונסו שוב.', 0); }
  const json = await response.json().catch(() => null) as ({ error?: string; session?: TrainingSession } & T) | null;
  const failure=apiResponseFailure(response,json!==null);
  if(failure)throw new ApiError(failure.message,failure.status);
  if (!response.ok || !json) throw new ApiError(json?.error ?? 'לא ניתן לטעון נתונים כרגע. נסו שוב.', response.status, json?.session);
  return json;
}
export function useTraining() {
 const [split,setSplit]=useState<ProgramSplit|null>(null),[selectedPlanDay,setSelectedPlanDay]=useState('1');
  const [workoutPreference,setWorkoutPreference]=useState<WorkoutPreference>({mode:'fixed',version:0});
  const [access,setAccess]=useState<TrainingAccess|null>(null);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [legacy, setLegacy] = useState<LegacyLog[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [feed, setFeed] = useState<TrainingFeed>(emptyFeed);
  const [auth, setAuth] = useState<'loading'|'ready'|'required'|'error'>('loading');
  const [notice, setNotice] = useState('');
  const [startError,setStartError]=useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const refreshSequence=useRef(0);
  const [refreshing,setRefreshing]=useState(false);
  const notify = useCallback((text: string) => setNotice(text), []);
  const clearAccount = useCallback(() => { setSplit(null);setSelectedPlanDay('1');setWorkoutPreference({mode:'fixed',version:0}); setAuth('required'); setAccess(null); setPlan([]); setLegacy([]); setFavorites([]); setFeed(emptyFeed); }, []);
  const syncSession = useCallback((session: TrainingSession) => setFeed(old => {
    if (session.status === 'active') return { ...old, active: session };
    const known = old.history.some(x => x.id === session.id);
    return { ...old, active: old.active?.id === session.id ? null : old.active,
      history: session.status === 'completed' ? known?old.history.map(x=>x.id===session.id?session:x):[session, ...old.history].slice(0,50) : old.history,
      stats: session.status === 'completed' && !known ? { total: old.stats.total + 1, week: old.stats.week + 1, sets: old.stats.sets + session.completedSets } : old.stats };
  }), []);
  const refresh = useCallback(async () => {
    const sequence=++refreshSequence.current;setRefreshing(true);
    try {
      const [p, t, l, f] = await Promise.all([request<{split:ProgramSplit|null;items:PlanItem[];access:TrainingAccess;workoutPreference:WorkoutPreference}>('/api/program'), request<TrainingFeed>('/api/training'), request<{logs:LegacyLog[]}>('/api/logs'), request<{favorites:string[]}>('/api/favorites')]);
      if(sequence!==refreshSequence.current)return false;
      const effectiveSplit=p.split??(p.items.some(i=>workoutDayId(i)!=='1')?{kind:'custom' as const,days:splitDays('custom',Math.max(...p.items.map(i=>Number(workoutDayId(i))))),version:0}:null);setSplit(effectiveSplit);setSelectedPlanDay(old=>effectiveSplit?.days.some(d=>d.id===old)?old:'1');setWorkoutPreference(p.workoutPreference);setPlan(p.items); setAccess(p.access); setFeed(t); setLegacy(l.logs); setFavorites(f.favorites); setAuth('ready'); return true;
    } catch (error) {
      if(sequence!==refreshSequence.current)return false;
      if (error instanceof ApiError && error.status === 401) clearAccount();
      else { setAuth('error'); setNotice((error as Error).message); }
      return false;
    } finally {if(sequence===refreshSequence.current)setRefreshing(false);}
  }, [clearAccount]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(''), 6000); return () => clearTimeout(id); }, [notice]);
  async function mutate<T>(work: () => Promise<T>,onError?:(error:Error)=>void): Promise<T|null> {
    if (lock.current||refreshing) return null;
    if (auth !== 'ready') { setNotice(auth === 'loading' ? 'הנתונים עדיין נטענים.' : 'יש להתחבר ולטעון את התוכנית כדי לשמור שינויים.'); return null; }
    lock.current = true; setBusy(true);
    try { return await work(); }
    catch (error) {
      if (error instanceof ApiError) { if (error.status === 401) clearAccount(); else if (error.session) syncSession(error.session); }
      setNotice((error as Error).message);onError?.(error as Error); return null;
    } finally { lock.current = false; setBusy(false); }
  }
  const saveWorkoutPreference=async(mode:WorkoutChoiceMode)=>mutate(async()=>{
    const result=await request<{workoutPreference:WorkoutPreference}>('/api/program','PATCH',{mode,version:workoutPreference.version});
    setWorkoutPreference(result.workoutPreference);setNotice('העדפת האימון נשמרה.');return true;
  });
  const savePlan = async (item: PlanItem|Pick<PlanItem,'exerciseId'>) => mutate(async () => {
    const {customExercise,...payload}=item as PlanItem;
    const saved = await request<{item:PlanItem}>('/api/program','POST',payload);
    setPlan(old => old.some(x => planItemKey(x)===planItemKey(saved.item)) ? old.map(x => planItemKey(x)===planItemKey(saved.item) ? saved.item : x) : [...old,saved.item]);
    setNotice('פרטי התרגיל נשמרו.'); return saved.item;
  });
  const add = async (id: string) => {
    if (plan.some(x => x.exerciseId === id&&workoutDayId(x)===selectedPlanDay)) { setNotice('התרגיל כבר בתוכנית.'); return; }
    await savePlan({...customId(id)?{exerciseId:id}:defaultPrescription(id),dayId:selectedPlanDay});
  };
  const remove = async (exerciseId: string,dayId='1') => mutate(async () => { await request('/api/program','DELETE',{exerciseId,dayId}); setPlan(old=>old.filter(x=>x.exerciseId!==exerciseId||workoutDayId(x)!==dayId)); setNotice('התרגיל הוסר מהתוכנית.'); return true; });
  const useTemplate = async (templateId: string) => mutate(async () => { const saved = await request<{items:PlanItem[];access:TrainingAccess}>('/api/program','POST',{templateId,dayId:selectedPlanDay}); setPlan(saved.items); setNotice('התרגילים נוספו. ההתאמות הקיימות נשמרו.'); return true; });
  const toggleFavorite = async (exerciseId: string) => mutate(async () => {
    const favorite = !favorites.includes(exerciseId);
    const saved = await request<{favorites:string[]}>('/api/favorites','PUT',{exerciseId,favorite});
    setFavorites(saved.favorites); setNotice(favorite ? 'התרגיל נשמר במועדפים.' : 'התרגיל הוסר מהמועדפים.');
    return true;
  });
  const start = async (requestId: string, before: number, dayId?:string) => {setStartError('');return mutate(async () => { const result = await request<{session:TrainingSession}>('/api/training','POST',{requestId,before,dayId}); syncSession(result.session); return result.session; },error=>setStartError(error.message));};
  const patch = async (action: Record<string, unknown>) => mutate(async () => {
    if (!feed.active) return null;
    const result = await request<{session:TrainingSession}>('/api/training','PATCH',{id:feed.active.id,version:feed.active.version,...action});
    syncSession(result.session);
    if (action.action === 'finish') setNotice('האימון נשמר בהיסטוריה. כל הכבוד על ההתמדה!');
    else if (action.action === 'cancel') setNotice('האימון בוטל. אפשר להתחיל אימון חדש.');
    return result.session;
  });
  const followup=async(session:TrainingSession,pain:number)=>mutate(async()=>{const result=await request<{session:TrainingSession}>('/api/training','PATCH',{action:'followup',id:session.id,version:session.version,pain});syncSession(result.session);setNotice('הדיווח ליום שאחרי נשמר באימון.');return result.session;});
 const saveSplit=async(value:ProgramSplit)=>mutate(async()=>{const result=await request<{split:ProgramSplit}>('/api/program','POST',{...value,action:'split'});setSplit(result.split);setSelectedPlanDay('1');setNotice('חלוקת האימונים נשמרה. כעת בחרו תרגילים לכל אימון.');return true;});
  return {split,saveSplit,selectedPlanDay,setSelectedPlanDay,workoutPreference,saveWorkoutPreference,access,plan,legacy,favorites,feed,auth,notice,startError,busy:busy||refreshing,notify,refresh,savePlan,add,remove,useTemplate,toggleFavorite,start,patch,followup};
}
export type TrainingController = ReturnType<typeof useTraining>;
