'use client';
import {useEffect,useId,useState} from 'react';
import {Pause,Play,RotateCcw,Timer,ChevronDown} from 'lucide-react';
import {remainingSeconds,formatCountdown,timerTransition} from '../lib/rest-timer';
import {useRestTimer} from '../hooks/use-rest-timer';
import {useLanguage} from './language-provider';

/** Local convenience timer; state belongs to this workout in this browser tab. */
export function RestTimer({sessionId='local'}:{sessionId?:string}){
 const english=useLanguage().language==='en',t=(he:string,en:string)=>english?en:he;
 const [state,update]=useRestTimer(sessionId),[now,setNow]=useState(()=>Date.now()),[expanded,setExpanded]=useState(false),detailsId=useId();
 const remaining=state.deadline===null?state.remaining:remainingSeconds(state.deadline,now);
 useEffect(()=>{
  if(state.deadline===null)return;
  const tick=()=>{const at=Date.now();setNow(at);if(remainingSeconds(state.deadline!,at)===0)update({...state,remaining:0,deadline:null});};
  const interval=setInterval(tick,250);return()=>clearInterval(interval);
 },[state,update]);
 return <section className="dc-rest-timer panel" aria-label={t('טיימר מנוחה','Rest timer')}>
  <div className="dc-timer-compact"><Timer size={18} aria-hidden="true"/><h2>{t('מנוחה','Rest')}</h2><output className="dc-countdown" aria-label={t('זמן שנותר','Time remaining')} dir="ltr">{formatCountdown(remaining)}</output>
   <button type="button" className="button secondary" disabled={remaining===0} onClick={()=>{const at=Date.now();setNow(at);update(timerTransition(state,state.deadline===null?'start':'pause',at));}}>{state.deadline===null?<Play size={17}/>:<Pause size={17}/>}<span>{state.deadline===null?t('התחלה','Start'):t('השהיה','Pause')}</span></button>
   <button type="button" className="dc-timer-icon" aria-label={t('איפוס','Reset')} onClick={()=>update(timerTransition(state,'reset',Date.now()))}><RotateCcw size={18}/></button>
   <button type="button" className="dc-timer-icon" aria-expanded={expanded} aria-controls={detailsId} aria-label={t('הגדרות מנוחה','Rest settings')} onClick={()=>setExpanded(!expanded)}><ChevronDown size={18}/></button>
  </div>
  <div id={detailsId} hidden={!expanded}><label className="dc-timer-duration">{t('משך מנוחה','Rest duration')}<select value={state.duration} disabled={state.deadline!==null} onChange={e=>{const duration=Number(e.target.value);update({duration,remaining:duration,deadline:null});}}>{[30,60,90,120,180,300].map(s=><option key={s} value={s}>{formatCountdown(s)}</option>)}</select></label><p className="care-muted">{t('נשמר בלשונית במהלך ניווט באימון. אינו משנה את התוכנית.','Kept in this tab during workout navigation. Does not change your program.')}</p></div>
  <span className={remaining===0?'dc-timer-complete':'sr-only'} role="status">{remaining===0?t('המנוחה הסתיימה','Rest complete'):''}</span>
 </section>;
}
