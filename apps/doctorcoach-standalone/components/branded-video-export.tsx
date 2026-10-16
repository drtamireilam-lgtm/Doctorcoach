'use client';
import {useEffect,useRef,useState} from 'react';
import {trimVideoFile} from '../lib/video-trim';
export function BrandedVideoExport({id}:{id:string}){
 const [confirmed,setConfirmed]=useState(false),[qr,setQr]=useState(false),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[file,setFile]=useState<File|null>(null),[url,setUrl]=useState(''),[error,setError]=useState('');
 const abort=useRef<AbortController|null>(null);
 useEffect(()=>()=>abort.current?.abort(),[]);
 useEffect(()=>{if(!file){setUrl('');return;}const u=URL.createObjectURL(file);setUrl(u);return()=>URL.revokeObjectURL(u);},[file]);
 return <details className="care-form"><summary>עותק ממותג לשיתוף</summary><p>לוגו קטן בפינה השמאלית התחתונה, מעל אזור הכפתורים של הסטורי. הסרטון הפרטי אינו משתנה. לא מתבצע פרסום אוטומטי.</p>
 <label><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>{setConfirmed(e.target.checked);setFile(null);}}/>יש לי זכויות בסרטון ואישור מהמצולמים, כולל המתאמן, לשתף אותו בפומבי.</label>
 <label><input type="checkbox" checked={qr} disabled={busy} onChange={e=>{setQr(e.target.checked);setFile(null);}}/>הוספת QR לקישור DoctorCoach — דורש רזולוציה מספקת</label>
 <button type="button" className="button secondary" disabled={!confirmed||busy} onClick={async()=>{
  const c=new AbortController();abort.current=c;setBusy(true);setFile(null);setError('');setProgress(0);
  try{
   const response=await fetch('/api/media/'+encodeURIComponent(id),{cache:'no-store',signal:c.signal});if(!response.ok)throw new Error('אין גישה לסרטון כרגע. רעננו ובדקו הרשאות.');
   const blob=await response.blob();c.signal.throwIfAborted();
   const input=new File([blob],'source-video',{type:blob.type});
   const {Input,BlobSource,ALL_FORMATS}=await import('mediabunny');const media=new Input({source:new BlobSource(input),formats:ALL_FORMATS});let duration:number;try{duration=await media.computeDuration();}finally{media.dispose();}
   const result=await trimVideoFile(input,{start:0,end:duration},{signal:c.signal,keepAudio:true,onProgress:setProgress,brand:{qr}});c.signal.throwIfAborted();setFile(new File([result],'DoctorCoach-story.mp4',{type:result.type}));
  }catch(e){if(!c.signal.aborted)setError((e as Error).message);}finally{setBusy(false);}
 }}>הכנת סרטון עם לוגו</button>
 {busy&&<><p role="status">מכינים עותק ממותג במכשיר: {progress}%</p><button type="button" onClick={()=>abort.current?.abort()}>ביטול</button></>}
 {error&&<p role="alert">{error}</p>}
 {url&&file&&confirmed&&<><video controls playsInline src={url} style={{width:'100%',maxHeight:280}}/><p>בדקו את הסרטון לפני שיתוף. QR מוביל כרגע לסביבת הבדיקות; סריקתו אחרי דחיסת אינסטגרם טרם אומתה.</p><a className="button secondary" href={url} download="DoctorCoach-story.mp4">הורדת הסרטון הממותג</a><button type="button" className="button secondary" onClick={async()=>{try{if(!navigator.canShare?.({files:[file]}))throw new Error('שיתוף קובץ אינו נתמך כאן. השתמשו בהורדה.');await navigator.share({files:[file],title:'DoctorCoach'});}catch(e){if((e as Error).name!=='AbortError')setError((e as Error).message);}}}>שיתוף הסרטון</button></>}
 </details>;
}
