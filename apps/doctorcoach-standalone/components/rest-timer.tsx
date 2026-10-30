'use client';
import {useEffect,useState} from 'react';
import {Pause,Play,RotateCcw,Timer} from 'lucide-react';
import {remainingSeconds,formatCountdown} from '../lib/rest-timer';
import {useLanguage} from './language-provider';

/** Local convenience timer only; never changes the training prescription. */
export function RestTimer(){
 const english=useLanguage().language==='en';
 const t=(he:string,en:string)=>english?en:he;
 const [duration,setDuration]=useState(90),[remaining,setRemaining]=useState(90),[deadline,setDeadline]=useState<number|null>(null);
 useEffect(()=>{
  if(deadline===null)return;
  const tick=()=>{const next=remainingSeconds(deadline,Date.now());setRemaining(next);if(next===0)setDeadline(null);};
  const interval=setInterval(tick,200);return ()=>clearInterval(interval);
 },[deadline]);
 return <section className="dc-rest-timer panel" aria-label={t('טיימר מנוחה','Rest timer')}>
  <div><h2><Timer size={18}/>{t('מנוחה בין סטים','Rest between sets')}</h2><span className="care-muted">{t('טיימר אישי · אינו משנה את התוכנית','Personal timer · does not change your program')}</span></div>
  <output className="dc-countdown" aria-label={t('זמן שנותר','Time remaining')} dir="ltr">{formatCountdown(remaining)}</output>
  <div className="dc-timer-controls"><label>{t('משך מנוחה','Rest duration')}<select value={duration} disabled={deadline!==null} onChange={e=>{const seconds=Number(e.target.value);setDuration(seconds);setRemaining(seconds);}}>{[30,60,90,120,180,300].map(s=><option key={s} value={s}>{formatCountdown(s)}</option>)}</select></label>
  <button type="button" className="button secondary" disabled={remaining===0} onClick={()=>{if(deadline!==null){setRemaining(remainingSeconds(deadline,Date.now()));setDeadline(null);}else setDeadline(Date.now()+remaining*1000);}}>{deadline!==null?<Pause size={18}/>:<Play size={18}/>} {deadline!==null?t('השהיה','Pause'):t('התחלה','Start')}</button>
  <button type="button" className="button secondary" onClick={()=>{setDeadline(null);setRemaining(duration);}}><RotateCcw size={18}/>{t('איפוס','Reset')}</button></div>
  <span role="status">{remaining===0?t('המנוחה הסתיימה','Rest complete'):''}</span>
 </section>;
}
