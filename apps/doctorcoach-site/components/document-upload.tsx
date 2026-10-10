'use client';
import {useRef,useState} from 'react';
import {Localize} from './language-provider';
import {careRequest,useCareAction} from '../hooks/use-care';
import {CareFeedback} from './care-ui';
import {requestId} from '../lib/request-id';
import type {DocumentCategory} from '../lib/private-documents';
export const documentCategoryLabels={blood:'בדיקות דם',visit:'סיכום ביקור',discharge:'מכתב שחרור',imaging:'פענוח הדמיה',other:'מסמך רפואי נוסף'};
export function DocumentUpload({clientId,purpose='medical',channel='',onUploaded}:{clientId:string;purpose?:'medical'|'message';channel?:string;onUploaded:(id:string,filename:string)=>void}){
 const [file,setFile]=useState<File|null>(null),[category,setCategory]=useState<DocumentCategory>('other'),a=useCareAction(),[key,setKey]=useState(0),attempt=useRef(requestId());
 return <Localize><form className="document-upload care-form" onSubmit={async e=>{e.preventDefault();if(!file)return;await a.run(async()=>{if(!['application/pdf','image/jpeg','image/png'].includes(file.type)||file.size>10*1024*1024)throw new Error('בחרו PDF, PNG או JPEG עד 10MB.');const id=attempt.current;await careRequest('/api/documents',{id,clientId,purpose,channel,category,filename:file.name,mime:file.type,bytes:file.size});const upload=await fetch('/api/documents/'+id,{method:'PUT',headers:{'Content-Type':file.type},body:file});if(!upload.ok){const error=await upload.json() as {error?:string};throw new Error(error.error??'ההעלאה נכשלה.');}onUploaded(id,file.name);attempt.current=requestId();setFile(null);setKey(k=>k+1);},'הקובץ הועלה לאחסון פרטי.');}}>{purpose==='medical'&&<label className="care-field">סוג מסמך<select value={category} onChange={e=>setCategory(e.target.value as DocumentCategory)}>{Object.entries(documentCategoryLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>}<label className="care-field">קובץ PDF או תמונה עד 10MB<input key={key} type="file" accept="application/pdf,image/png,image/jpeg" required onChange={e=>{attempt.current=requestId();setFile(e.target.files?.[0]??null);}}/></label><p className="care-muted">{purpose==='medical'?'הקובץ זמין רק לך ולרופא שהרשית.':'הקובץ מצורף לערוץ שנבחר. שליחת ההודעה היא פעולה נפרדת.'}</p><button className="button secondary" disabled={a.busy||!file}>{a.busy?'מעלים קובץ…':'העלאת קובץ פרטי'}</button><CareFeedback {...a}/></form></Localize>;
}
