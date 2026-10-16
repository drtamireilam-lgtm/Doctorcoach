'use client';
import {useEffect,useRef,useState} from 'react';
import {MAX_TRIM_SOURCE,MAX_TRIM_OUTPUT,trimRange,trimVideoFile} from '../lib/video-trim';
export function VideoTrimmer({source,onPrepared}:{source:File;onPrepared:(file:File|null)=>void}){
 const [url,setUrl]=useState(''),[duration,setDuration]=useState(0),[start,setStart]=useState(0),[end,setEnd]=useState(0),[keepAudio,setKeepAudio]=useState(true),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[error,setError]=useState(''),[prepared,setPrepared]=useState<File|null>(null),[resultUrl,setResultUrl]=useState('');
 const video=useRef<HTMLVideoElement>(null),abort=useRef<AbortController|null>(null);
 useEffect(()=>{if(!busy)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[busy]);
 useEffect(()=>{const u=URL.createObjectURL(source);setUrl(u);return()=>{abort.current?.abort();URL.revokeObjectURL(u);};},[source]);
 useEffect(()=>{if(!prepared){setResultUrl('');return;}const u=URL.createObjectURL(prepared);setResultUrl(u);return()=>URL.revokeObjectURL(u);},[prepared]);
 const invalidate=()=>{setPrepared(null);onPrepared(null);setError('');video.current?.pause();};
 return <section className="panel care-form" aria-label="חיתוך הסרטון לפני העלאה">
 <h3>בחירת הקטע לשליחה</h3><p>המקור נשאר במכשיר. הכינו קטע חתוך ובדקו אותו לפני העלאה. אפשר לבחור במפורש לשלוח את הסרטון המלא.</p>
 <video ref={video} src={url} controls playsInline preload="metadata" style={{width:'100%',maxHeight:260}} onLoadedMetadata={e=>{const d=e.currentTarget.duration;if(Number.isFinite(d)&&d>0){setDuration(d);setEnd(d);}else setError('לא ניתן לקרוא את משך הסרטון.');}} onTimeUpdate={e=>{if(e.currentTarget.currentTime>=end)e.currentTarget.pause();}} onError={()=>setError('הדפדפן אינו מצליח לנגן את המקור. לא הועלה קובץ.')} />
 <fieldset disabled={busy||!duration} className="care-form">
 <label>תחילת הקטע בשניות: {start.toFixed(1)}<input aria-label="תחילת הקטע" type="range" min="0" max={Math.max(0,duration-.25)} step="0.1" value={start} onChange={e=>{invalidate();setStart(Number(e.target.value));}}/></label>
 <label>סיום הקטע בשניות: {end.toFixed(1)}<input aria-label="סיום הקטע" type="range" min="0.25" max={duration||.25} step="0.1" value={end} onChange={e=>{invalidate();setEnd(Number(e.target.value));}}/></label>
 <p>אורך הקטע: {Math.max(0,end-start).toFixed(1)} שניות</p>
 <label><input type="checkbox" checked={keepAudio} onChange={e=>{invalidate();setKeepAudio(e.target.checked);}}/>שמירת הקול בקטע</label>
 <button type="button" className="button secondary" onClick={()=>{try{trimRange(duration,start,end);if(video.current){video.current.currentTime=start;void video.current.play().catch(()=>setError('לחצו על הנגן להפעלת התצוגה המקדימה.'));}}catch(e){setError((e as Error).message);}}}>צפייה בטווח שנבחר</button>
 <button type="button" className="button secondary" onClick={async()=>{invalidate();setBusy(true);setProgress(0);const c=new AbortController();abort.current=c;try{if(source.size>MAX_TRIM_SOURCE)throw new Error('בחרו מקור עד 200 MB.');trimRange(duration,start,end);const file=await trimVideoFile(source,{start,end},{signal:c.signal,keepAudio,onProgress:setProgress});setPrepared(file);onPrepared(file);}catch(e){if(!c.signal.aborted)setError((e as Error).message);}finally{setBusy(false);}}}>הכנת קטע חתוך</button>
 <button type="button" className="text-button" disabled={source.size>MAX_TRIM_OUTPUT} onClick={()=>{invalidate();setPrepared(source);onPrepared(source);}}>שימוש בסרטון המלא ללא חיתוך</button>
 </fieldset>
 {busy&&<><p role="status">מכינים קובץ במכשיר: {progress}% — השאירו את המסך פתוח</p><button type="button" className="button secondary" onClick={()=>abort.current?.abort()}>ביטול החיתוך</button></>}
 {error&&<p role="alert">{error}</p>}
 {resultUrl&&<><h4>{prepared===source?'הסרטון המלא מוכן להעלאה':'הקובץ החתוך מוכן להעלאה'}</h4><video src={resultUrl} controls playsInline preload="metadata" style={{width:'100%',maxHeight:260}}/><p>גודל להעלאה: {((prepared?.size??0)/1024/1024).toFixed(1)} MB. ההעלאה תתבצע רק בלחיצה על כפתור ההעלאה.</p></>}
 </section>;
}
