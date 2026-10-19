'use client';
import {useEffect,useState} from 'react';
import {visibleTeamProfiles,type PhotoMember} from '../lib/team-profiles';
import {MAX_TEAM_PHOTO_BYTES,type TeamPhoto} from '../lib/team-photo-store';
import {useCareResource,useCareAction} from '../hooks/use-care';
import {CareGate,CareFeedback} from './care-ui';
import {Localize,useLanguage} from './language-provider';
import {TeamPortrait} from './team-profiles';
async function preparePhoto(file:File):Promise<Blob>{
 if(!['image/jpeg','image/png'].includes(file.type)||file.size>MAX_TEAM_PHOTO_BYTES||file.size<8)throw new Error('בחרו תמונת JPEG או PNG עד 5MB.');
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;await image.decode();
  if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>20000000)throw new Error('התמונה גדולה מדי לעיבוד. הקטינו אותה ונסו שוב.');
  const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext('2d');if(!context)throw new Error('לא ניתן להכין את התמונה בדפדפן הזה.');context.drawImage(image,0,0,canvas.width,canvas.height);
  // Re-encoding removes original file metadata, including camera GPS/EXIF.
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('לא ניתן להכין את התמונה.')),file.type,0.9));
  if(blob.size>MAX_TEAM_PHOTO_BYTES)throw new Error('בחרו תמונת JPEG או PNG עד 5MB.');return blob;
 }finally{URL.revokeObjectURL(url);}
}
function PhotoEditor({photo,onSaved}:{photo:TeamPhoto;onSaved:()=>Promise<void>}){
 const member=visibleTeamProfiles.find(m=>m.id===photo.memberId)!,english=useLanguage().language==='en';
 const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState<string|null>(null),[confirmed,setConfirmed]=useState(false),[inputKey,setInputKey]=useState(0),action=useCareAction();
 useEffect(()=>{if(!file){setPreview(null);return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
 const name=english?member.nameEn:member.name;
 return <Localize><form className="panel care-form team-photo-editor" onSubmit={async event=>{
  event.preventDefault();if(!file||!confirmed)return;
  await action.run(async()=>{const blob=await preparePhoto(file);const response=await fetch('/api/team-photos/'+(member.id as PhotoMember),{method:'PUT',headers:{'Content-Type':blob.type,'X-File-Size':String(blob.size),'X-Photo-Version':String(photo.version),'X-Confirm-Public':'true'},body:blob});const result=await response.json().catch(()=>null) as {error?:string}|null;if(!response.ok||!result)throw new Error(result?.error??'לא ניתן להעלות את התמונה כרגע.');setFile(null);setConfirmed(false);setInputKey(k=>k+1);await onSaved();},'תמונת הפרופיל פורסמה באתר.');
 }}><h3>{name}</h3>{preview?<img className="team-portrait" src={preview} alt={name}/>:<TeamPortrait photo={photo} name={name} initials={member.id==='tamir'?'TE':member.id==='nadav'?'NR':'LZ'}/>}
 <label className="care-field">תמונת פורטפוליו — JPEG או PNG עד 5MB<input key={inputKey} type="file" accept="image/jpeg,image/png" disabled={action.busy} required onChange={event=>{setFile(event.target.files?.[0]??null);setConfirmed(false);}}/></label>
 <p className="care-muted">תצוגה מקדימה בלבד עד הפרסום. התמונה תופיע בכרטיס הצוות באתר. אין להעלות מסמך רפואי או מידע פרטי.</p>
 <label className="care-check"><input type="checkbox" checked={confirmed} disabled={action.busy} onChange={event=>setConfirmed(event.target.checked)}/>אני מאשר/ת פרסום התמונה בכרטיס הצוות באתר ויש לי זכות להשתמש בה.</label>
 <button type="submit" className="button primary" disabled={action.busy||!file||!confirmed}>{action.busy?'מעלים תמונה…':photo.url?'החלפת תמונת הפרופיל':'פרסום תמונת הפרופיל'}</button><CareFeedback {...action}/>
 </form></Localize>;
}
export function TeamPhotoAdmin(){
 const resource=useCareResource<{photos:TeamPhoto[]}>('/api/team-photos?manage=1');
 return <Localize><section className="care-stack"><div className="care-row"><h2>תמונות הצוות</h2><button className="button secondary" disabled={resource.loading} onClick={resource.reload}>רענון</button></div>{!resource.data?<CareGate {...resource} section="team"/>:<><div className="team-grid">{resource.data.photos.map(photo=><PhotoEditor key={photo.memberId} photo={photo} onSaved={resource.reload}/>)}</div>{resource.error&&<p role="alert">{resource.error}</p>}</>}</section></Localize>;
}
