'use client';
import {cachedSetKey,draftRecovery,sameDraftFields,makeWorkoutDraft,type CachedSetDraft,type SetDraftContext} from '../lib/workout-drafts';
import {rememberWorkoutDraft,loadWorkoutDrafts,acknowledgeWorkoutDraft,clearWorkoutDrafts} from '../lib/workout-draft-cache';
import {planItemKey,workoutDayId} from '../lib/workout-days';
import {splitDays,type ProgramSplit} from '../lib/program-split';
import type {WorkoutPreference,WorkoutChoiceMode} from '../lib/workout-choice';
import {apiResponseFailure} from '../lib/api-response';
import type {TrainingAccess} from '../lib/training-access';
import {customId} from '../lib/custom-exercise-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { defaultPrescription,workCompletion,targetRpeForSet } from '../lib/training';
import type { LegacyLog, PlanItem, TrainingFeed, TrainingSession,SessionExercise,SetResult } from '../lib/training';
const emptyFeed: TrainingFeed = { active: null, history: [], stats: { total: 0, week: 0, sets: 0 } };
class ApiError extends Error {
  status: number; session?: TrainingSession;
  constructor(message: string, status: number, session?: TrainingSession) { super(message); this.status = status; this.session = session; }
}
async function request<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch(url, { method, cache: 'no-store', signal: AbortSignal.timeout(15000), headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }); }
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
  const currentServer=useRef<{ownerId?:string;session:TrainingSession|null}>({session:null});
  const [cachedDrafts,setCachedDrafts]=useState<Record<string,CachedSetDraft>>({});
  const pendingDrafts=useRef<Record<string,CachedSetDraft>>({});
  const [auth, setAuth] = useState<'loading'|'ready'|'required'|'error'>('loading');
  const [notice, setNotice] = useState('');
  const [startError,setStartError]=useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const refreshSequence=useRef(0);
  const [refreshing,setRefreshing]=useState(false);
  const notify = useCallback((text: string) => setNotice(text), []);
  const clearAccount = useCallback(() => { currentServer.current={session:null};pendingDrafts.current={};setCachedDrafts({});setSplit(null);setSelectedPlanDay('1');setWorkoutPreference({mode:'fixed',version:0}); setAuth('required'); setAccess(null); setPlan([]); setLegacy([]); setFavorites([]); setFeed(emptyFeed); }, []);
  const syncSession = useCallback((session: TrainingSession) => {
    currentServer.current={...currentServer.current,session:session.status==='active'?session:currentServer.current.session?.id===session.id?null:currentServer.current.session};
    setFeed(old => {
    if (session.status === 'active') return { ...old, active: session };
    const known = old.history.some(x => x.id === session.id);
    return { ...old, active: old.active?.id === session.id ? null : old.active,
      history: session.status === 'completed' ? known?old.history.map(x=>x.id===session.id?session:x):[session, ...old.history].slice(0,50) : old.history,
      stats: session.status === 'completed' && !known ? { total: old.stats.total + 1, week: old.stats.week + 1, sets: old.stats.sets + workCompletion(session.items) } : old.stats };
    });
  }, []);
  const refresh = useCallback(async () => {
    if(lock.current)return false;
    const sequence=++refreshSequence.current;setRefreshing(true);
    try {
      const [p, t, l, f] = await Promise.all([request<{split:ProgramSplit|null;items:PlanItem[];access:TrainingAccess;workoutPreference:WorkoutPreference}>('/api/program'), request<TrainingFeed>('/api/training'), request<{logs:LegacyLog[]}>('/api/logs'), request<{favorites:string[]}>('/api/favorites')]);
      if(sequence!==refreshSequence.current)return false;
      const recovered:Record<string,CachedSetDraft>={};
      if(t.ownerId&&t.active){
        try {
          for(const record of await loadWorkoutDrafts(t.ownerId,t.active.id)){
            const item=t.active.items.find(i=>i.occurrenceId===record.occurrenceId&&i.exerciseId===record.exerciseId);
            if(!item||!Number.isInteger(record.setIndex)||!item.results[record.setIndex])continue;
            const ctx={ownerId:t.ownerId,sessionId:t.active.id,exerciseId:item.exerciseId,occurrenceId:planItemKey(item),setIndex:record.setIndex};
            const mode=draftRecovery(record,ctx,{...item.results[record.setIndex],targetRpe:targetRpeForSet(item,record.setIndex)});
            if(mode==='ignore')continue;
            if(mode==='synced'){await acknowledgeWorkoutDraft(record.key,record.revision);continue;}
            recovered[record.key]=record;
          }
        } catch {setNotice('שחזור עריכות במכשיר אינו זמין. שמירה רגילה לשרת עדיין זמינה.');}
      }
      if(sequence!==refreshSequence.current)return false;
      pendingDrafts.current=recovered;setCachedDrafts(recovered);
      currentServer.current={ownerId:t.ownerId,session:t.active};
      const effectiveSplit=p.split??(p.items.some(i=>workoutDayId(i)!=='1')?{kind:'custom' as const,days:splitDays('custom',Math.max(...p.items.map(i=>Number(workoutDayId(i))))),version:0}:null);setSplit(effectiveSplit);setSelectedPlanDay(old=>effectiveSplit?.days.some(d=>d.id===old)?old:'1');setWorkoutPreference(p.workoutPreference);setPlan(p.items); setAccess(p.access); setFeed(t); setLegacy(l.logs); setFavorites(f.favorites); setAuth('ready'); return true;
    } catch (error) {
      if(sequence!==refreshSequence.current)return false;
      if (error instanceof ApiError && error.status === 401) clearAccount();
      else { setAuth('error'); setNotice((error as Error).message); }
      return false;
    } finally {if(sequence===refreshSequence.current)setRefreshing(false);}
  }, [clearAccount]);
  useEffect(() => {let mounted=true;queueMicrotask(()=>{if(mounted)void refresh();});return()=>{mounted=false;};}, [refresh]);
  useEffect(()=>{const online=()=>{void refresh();};window.addEventListener('online',online);return()=>window.removeEventListener('online',online);},[refresh]);
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(''), 6000); return () => clearTimeout(id); }, [notice]);
  async function mutate<T>(work: () => Promise<T>,onError?:(error:Error)=>void): Promise<T|null> {
    if (lock.current||refreshing) return null;
    if (auth !== 'ready') { setNotice(auth === 'loading' ? 'הנתונים עדיין נטענים.' : 'יש להתחבר ולטעון את התוכנית כדי לשמור שינויים.'); return null; }
    ++refreshSequence.current;setRefreshing(false);
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
  const savePlan = async (item: (Omit<PlanItem,'side'>&{side?:PlanItem['side']|null})|Pick<PlanItem,'exerciseId'>) => mutate(async () => {
    const payload={...item};if('customExercise' in payload)delete payload.customExercise;
    const saved = await request<{item:PlanItem}>('/api/program','POST',payload);
    setPlan(old => old.some(x => planItemKey(x)===planItemKey(saved.item)) ? old.map(x => planItemKey(x)===planItemKey(saved.item) ? saved.item : x) : [...old,saved.item]);
    setNotice('פרטי התרגיל נשמרו.'); return saved.item;
  });
  const add = async (id: string) => {
    await savePlan({...customId(id)?{exerciseId:id}:defaultPrescription(id),dayId:selectedPlanDay,occurrenceId:crypto.randomUUID()});
  };
  const remove = async (exerciseId: string,dayId='1',occurrenceId?:string) => mutate(async () => { await request('/api/program','DELETE',{exerciseId,dayId,occurrenceId}); setPlan(old=>old.filter(x=>occurrenceId?x.occurrenceId!==occurrenceId:x.exerciseId!==exerciseId||workoutDayId(x)!==dayId)); setNotice('התרגיל הוסר מהתוכנית.'); return true; });
  const useTemplate = async (templateId: string) => mutate(async () => { const saved = await request<{items:PlanItem[];access:TrainingAccess}>('/api/program','POST',{templateId,dayId:selectedPlanDay}); setPlan(saved.items); setNotice('התרגילים נוספו. ההתאמות הקיימות נשמרו.'); return true; });
  const toggleFavorite = async (exerciseId: string) => mutate(async () => {
    const favorite = !favorites.includes(exerciseId);
    const saved = await request<{favorites:string[]}>('/api/favorites','PUT',{exerciseId,favorite});
    setFavorites(saved.favorites); setNotice(favorite ? 'התרגיל נשמר במועדפים.' : 'התרגיל הוסר מהמועדפים.');
    return true;
  });
  const start = async (requestId: string, before: number, dayId?:string) => {setStartError('');return mutate(async () => { const result = await request<{session:TrainingSession}>('/api/training','POST',{requestId,before,dayId}); syncSession(result.session); return result.session; },error=>setStartError(error.message));};
  const draftContext=(item:SessionExercise,index:number):SetDraftContext|null=>feed.ownerId&&feed.active?{ownerId:feed.ownerId,sessionId:feed.active.id,exerciseId:item.exerciseId,occurrenceId:planItemKey(item),setIndex:index}:null;
  const currentSetSnapshot=(item:SessionExercise,index:number)=>{
    const ctx=draftContext(item,index),current=currentServer.current;
    if(!ctx||ctx.ownerId!==current.ownerId||ctx.sessionId!==current.session?.id)return null;
    const selected=current.session.items.find(i=>planItemKey(i)===ctx.occurrenceId&&i.exerciseId===ctx.exerciseId),result=selected?.results[index];
    return selected&&result?{...result,targetRpe:targetRpeForSet(selected,index)}:null;
  };
  const recoverSetDraft=(item:SessionExercise,index:number)=>{const ctx=draftContext(item,index);return ctx?cachedDrafts[cachedSetKey(ctx)]:undefined;};
  const rememberSetDraft=async(item:SessionExercise,index:number,fields:SetResult&{targetRpe:number|null},base:SetResult&{targetRpe:number|null},conflicted=false)=>{
    const ctx=draftContext(item,index);if(!ctx||auth!=='ready')return false;
    const record=makeWorkoutDraft(ctx,base,fields,pendingDrafts.current[cachedSetKey(ctx)],conflicted);
    if(draftRecovery(record,ctx,base)==='ignore')return false;
    pendingDrafts.current[record.key]=record;
    try {await rememberWorkoutDraft(record);return true;}catch{setNotice('העריכה נשארה במסך אך לא נשמרה במכשיר. שמרו לשרת לפני יציאה.');return false;}
  };
  const forgetDraft=async(record:CachedSetDraft)=>{
    const exact=await acknowledgeWorkoutDraft(record.key,record.revision);
    if(exact&&pendingDrafts.current[record.key]?.revision===record.revision){
      delete pendingDrafts.current[record.key];
      setCachedDrafts(old=>{if(!old[record.key])return old;const next={...old};delete next[record.key];return next;});
      return true;
    }
    return false;
  };
  const discardSetDraft=async(item:SessionExercise,index:number)=>{
    const ctx=draftContext(item,index),record=ctx?pendingDrafts.current[cachedSetKey(ctx)]:null;
    if(!record)return true;
    try {const discarded=await forgetDraft(record);if(!discarded)setNotice('העריכה שבמכשיר השתנתה בזמן הפעולה. רעננו ובדקו לפני מחיקה.');return discarded;}catch{setNotice('לא ניתן למחוק כרגע את העריכה שבמכשיר. נסו שוב.');return false;}
  };
  const patch = async (action: Record<string, unknown>, onStarted?: () => void) => mutate(async () => {
    if (!feed.active) return null;
    const item=action.action==='set'?feed.active.items.find(i=>i.exerciseId===action.exerciseId&&i.occurrenceId===action.occurrenceId):null;
    const ctx=item?draftContext(item,Number(action.setIndex)):null;
    const cached=ctx?pendingDrafts.current[cachedSetKey(ctx)]:null;
    onStarted?.();
    const result = await request<{session:TrainingSession}>('/api/training','PATCH',{id:feed.active.id,version:feed.active.version,...action});
    syncSession(result.session);
    try {
      if(cached&&sameDraftFields(cached.fields,action as Partial<SetResult>&{targetRpe?:number|null}))await forgetDraft(cached);
      if(feed.ownerId&&['finish','cancel'].includes(String(action.action)))await clearWorkoutDrafts(feed.ownerId,feed.active.id);
    }catch{setNotice('האימון נשמר בשרת. ניקוי העריכה במכשיר ייבדק בטעינה הבאה.');}
    if (action.action === 'finish') setNotice('האימון נשמר בהיסטוריה. כל הכבוד על ההתמדה!');
    else if (action.action === 'cancel') setNotice('האימון בוטל. אפשר להתחיל אימון חדש.');
    return result.session;
  });
  const followup=async(session:TrainingSession,pain:number)=>mutate(async()=>{const result=await request<{session:TrainingSession}>('/api/training','PATCH',{action:'followup',id:session.id,version:session.version,pain});syncSession(result.session);setNotice('הדיווח ליום שאחרי נשמר באימון.');return result.session;});
 const saveSplit=async(value:ProgramSplit)=>{let failure:Error|undefined;const saved=await mutate(async()=>{const result=await request<{split:ProgramSplit}>('/api/program','POST',{...value,action:'split'});setSplit(result.split);setSelectedPlanDay('1');setNotice('חלוקת האימונים נשמרה. כעת בחרו תרגילים לכל אימון.');return true;},error=>{failure=error;});if(failure)throw failure;return saved;};
  return {split,saveSplit,selectedPlanDay,setSelectedPlanDay,workoutPreference,saveWorkoutPreference,access,plan,legacy,favorites,feed,auth,notice,startError,busy:busy||refreshing,notify,refresh,savePlan,add,remove,useTemplate,toggleFavorite,start,patch,followup,recoverSetDraft,rememberSetDraft,discardSetDraft,currentSetSnapshot};
}
export type TrainingController = ReturnType<typeof useTraining>;
