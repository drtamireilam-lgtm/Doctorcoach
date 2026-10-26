import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LanguageProvider,LanguageToggle} from '../../components/language-provider';
import {CardioPlanComposer} from '../../components/cardio-editor';
import {CardioWorkoutPlayer} from '../../components/cardio-player';
import {ActivityDashboard} from '../../components/activity-dashboard';
import {CardioProgress} from '../../components/cardio-progress';
import {applyCardioAction} from '../../lib/cardio-player';
import type {PlanItem,TrainingSession,SessionExercise} from '../../lib/training';
import type {TrainingController} from '../../hooks/use-training';
import '../../app/activity.css';
const storageKey='doctorcoach-synthetic-browser-session';
function Fixture(){
 const [session,setSession]=useState<TrainingSession|null>(()=>{const saved=sessionStorage.getItem(storageKey);return saved?JSON.parse(saved) as TrainingSession:null;});
 const [error,setError]=useState('');
 const save=(next:TrainingSession)=>{sessionStorage.setItem(storageKey,JSON.stringify(next));setSession(next);};
 const add=(item:PlanItem)=>save({id:'synthetic-session',status:'active',items:[{...item,name:'Synthetic cardio',results:[]}],startedAt:new Date().toISOString(),finishedAt:null,before:0,after:null,plannedSets:0,completedSets:0,version:1});
 const controller={busy:false,async patch(payload:Record<string,unknown>){if(!session)return null;try{const item=session.items[0];const cardioResult=applyCardioAction(item.cardio!,item.cardioResult,payload);const next={...session,items:[{...item,cardioResult}],version:session.version+1};save(next);return next;}catch(e){setError((e as Error).message);return null;}}} as unknown as TrainingController;
 return <main><p className="fixture-label">Synthetic local browser fixture — no real user, health or LAB data</p><LanguageToggle/>{error&&<p role="alert">{error}</p>}{!session?<CardioPlanComposer onSave={add}/>:<CardioWorkoutPlayer session={session} item={session.items[0] as SessionExercise} controller={controller}/>}<ActivityDashboard expanded/>{session?.items[0].cardioResult?.status==='completed'&&<CardioProgress history={[{...session,status:'completed',finishedAt:new Date().toISOString()}]}/>}</main>;
}
createRoot(document.getElementById('root')!).render(<LanguageProvider><Fixture/></LanguageProvider>);
