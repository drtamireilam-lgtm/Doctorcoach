'use client';
import {Localize} from "../components/language-provider";
import {useEffect,useRef,useState} from 'react';
import {exercises} from '../lib/content';
import {duplicateExerciseIds,exerciseIdFromFilename,runVideoQueue,videoFileProblem} from '../lib/bulk-video';
import {careRequest} from '../hooks/use-care';
import type {VideoAsset} from '../lib/media-store';
import {CareSelect} from './care-ui';
type Row={id:string;file:File;exerciseId:string;replaceId:string;confirmed:boolean;state:'waiting'|'uploading'|'done'|'failed';progress:number;error:string};
function sendVideo(url:string,file:File,progress:(n:number)=>void,replacement=false):Promise<void>{return new Promise((resolve,reject)=>{
 const xhr=new XMLHttpRequest();xhr.open('PUT',url);xhr.timeout=180000;xhr.setRequestHeader('Content-Type',file.type);
 if(replacement){xhr.setRequestHeader('X-Replacement-Confirmed','true');xhr.setRequestHeader('X-Video-Bytes',String(file.size));}
 xhr.upload.onprogress=e=>{if(e.lengthComputable)progress(Math.round(e.loaded/e.total*100));};
 xhr.onerror=()=>reject(new Error('תקלה בחיבור. אפשר לנסות שוב.'));xhr.ontimeout=()=>reject(new Error('ההעלאה ארכה זמן רב. נסו שוב.'));
 xhr.onload=()=>{if(xhr.status>=200&&xhr.status<300){resolve();return;}let message='ההעלאה נכשלה.';try{message=JSON.parse(xhr.responseText).error??message;}catch{}reject(new Error(message));};xhr.send(file);
});}
function FilePreview({file}:{file:File}){const [url,setUrl]=useState('');useEffect(()=>{const value=URL.createObjectURL(file);setUrl(value);return()=>URL.revokeObjectURL(value);},[file]);return url?<Localize>{<video controls playsInline preload="metadata" src={url} style={{width:'100%',maxHeight:220}} aria-label={'תצוגה מקדימה: '+file.name}/>}</Localize>:null;}
export function BulkVideoUpload({videos,reload}:{videos:VideoAsset[];reload:()=>void}){
 const [rows,setRows]=useState<Row[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('');const lock=useRef(false);
 useEffect(()=>{if(!busy)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[busy]);
 const ids=new Set(exercises.map(e=>e.id));const duplicates=duplicateExerciseIds(rows);
 const patch=(id:string,value:Partial<Row>)=>setRows(previous=>previous.map(row=>row.id===id?{...row,...value}:row));
 function problem(row:Row){return videoFileProblem(row.file)||(!row.exerciseId?'יש לשייך את הקובץ לתרגיל.':duplicates.has(row.exerciseId)?'שני קבצים משויכים לאותו תרגיל. הסירו אחד או שנו שיוך.':row.replaceId&&!row.confirmed?'יש לאשר את החלפת הסרטון ואת זכויות הפרסום.':'');}
 async function upload(){if(lock.current)return;const queue=rows.filter(row=>row.state!=='done'&&!problem(row));if(!queue.length)return;lock.current=true;setBusy(true);setMessage('');
  try{await runVideoQueue(queue,async row=>{patch(row.id,{state:'uploading',progress:0,error:''});try{
   if(row.replaceId)await sendVideo('/api/media/'+row.replaceId+'/replacement',row.file,n=>patch(row.id,{progress:n}),true);
   else{const init=await careRequest<{id:string;status:string}>('/api/media',{action:'initialize',id:row.id,kind:'demo',exerciseId:row.exerciseId,caption:exercises.find(e=>e.id===row.exerciseId)!.name,mime:row.file.type,bytes:row.file.size});if(init.status!=='ready')await sendVideo('/api/media/'+init.id,row.file,n=>patch(row.id,{progress:n}));}
   patch(row.id,{state:'done',progress:100});
  }catch(error){patch(row.id,{state:'failed',error:error instanceof Error?error.message:'ההעלאה נכשלה.'});throw error;}});setMessage('התור הסתיים. קבצים חדשים נשמרו כטיוטות; יש לבדוק ולפרסם בנפרד.');reload();}finally{lock.current=false;setBusy(false);}
 }
 return <Localize>{<section className="panel care-form"><h2>מנהל העלאת סרטוני תרגילים</h2><p>בחרו מספר קבצי MP4 או WebM, עד 25 MB לכל קובץ. שני קבצים מועלים במקביל. שם הקובץ צריך להיות מזהה התרגיל, למשל <bdi>rdl.mp4</bdi> או <bdi>barbell-bench-demo.mp4</bdi>. בדקו את שם התרגיל לפני ההעלאה.</p>
 <label className="care-field">בחירת סרטונים<input type="file" multiple accept="video/mp4,video/webm" disabled={busy} onChange={e=>{const files=Array.from(e.target.files??[]);if(files.length+rows.length>50){setMessage('אפשר להעלות עד 50 קבצים בכל תור.');e.target.value='';return;}setRows(previous=>[...previous,...files.map(file=>({id:crypto.randomUUID(),file,exerciseId:exerciseIdFromFilename(file.name,ids),replaceId:'',confirmed:false,state:'waiting' as const,progress:0,error:''}))]);e.target.value='';}}/></label>
 <p className="care-muted">סרטון קיים אינו מוחלף אוטומטית. אפשר להעלות טיוטה נוספת או לבחור במפורש סרטון להחלפה. החלפה שומרת את מצב הפרסום הקיים.</p>
 <div className="care-stack">{rows.map(row=>{const exercise=exercises.find(e=>e.id===row.exerciseId);const existing=videos.filter(v=>v.kind==='demo'&&v.exerciseId===row.exerciseId);const issue=problem(row);return <article className="review-exercise care-form" key={row.id}><strong><bdi>{row.file.name}</bdi> · {(row.file.size/1024/1024).toFixed(1)} MB</strong>
 <CareSelect label="שיוך לתרגיל" value={row.exerciseId} disabled={busy||row.state!=='waiting'} onChange={exerciseId=>patch(row.id,{exerciseId,replaceId:'',confirmed:false})} options={[{value:'',label:'לא נמצא שיוך — בחרו ידנית'},...exercises.map(e=>({value:e.id,label:e.name+' · '+e.id}))]}/>
 {exercise&&<p>קבוצת שרירים: {exercise.group} · מזהה: <bdi>{exercise.id}</bdi><br/>ציוד: אין שדה ציוד נפרד ברשומה. הוראות הביצוע: {exercise.desc}</p>}
 {existing.length>0&&<><p>{existing.length} סרטונים קיימים לתרגיל זה.</p><CareSelect label="סרטון קיים" value={row.replaceId} disabled={busy||row.state!=='waiting'} onChange={replaceId=>patch(row.id,{replaceId,confirmed:false})} options={[{value:'',label:'העלאת טיוטה נוספת — ללא החלפה'},...existing.map(v=>({value:v.id,label:v.caption+' · '+(v.published?'פורסם':'טיוטה')+' · '+v.id.slice(0,8)}))]}/>{row.replaceId&&<label><input type="checkbox" checked={row.confirmed} disabled={busy||row.state!=='waiting'} onChange={e=>patch(row.id,{confirmed:e.target.checked})}/> בדקתי את הסרטון ואני מאשר/ת את החלפת הסרטון שנבחר וזכויות לפרסומו.</label>}</>}
 <details><summary>תצוגה מקדימה של הקובץ</summary><FilePreview file={row.file}/></details>
 {row.state==='uploading'&&<><progress max={100} value={row.progress} aria-label={'התקדמות '+row.file.name}/><p role="status">{row.progress}% · {row.progress===100?'השרת בודק ושומר…':'מעלים…'}</p></>}
 {row.state==='done'?<p role="status">{row.replaceId?'הסרטון הוחלף.':'הסרטון נשמר כטיוטה.'}</p>:<>{(issue||row.error)&&<p role="alert">{issue||row.error}</p>}<button className="text-button" disabled={busy} onClick={()=>setRows(previous=>previous.filter(r=>r.id!==row.id))}>הסרת קובץ מהתור</button></>}
 </article>;})}</div>
 <div className="care-actions"><button className="button primary" disabled={busy||!rows.some(r=>r.state!=='done'&&!problem(r))} onClick={upload}>{busy?'מעלים…':'העלאת קבצים מוכנים / ניסיון חוזר לכשלונות'}</button><button className="button secondary" disabled={busy||!rows.length} onClick={()=>{setRows([]);setMessage('');}}>ניקוי התור</button></div>{message&&<p role="status">{message}</p>}
 </section>}</Localize>;
}
