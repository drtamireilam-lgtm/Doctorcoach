import type {PrivateDocument} from './private-documents.ts';
export function documentDay(timestamp:string){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(timestamp));}
export function filterMedicalDocuments(documents:PrivateDocument[],{query='',category='all',from='',to='',sort='newest'}:{query?:string;category?:string;from?:string;to?:string;sort?:string}={}){
 const terms=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 return documents.filter(f=>terms.every(t=>(f.filename+' '+f.uploaderName).toLocaleLowerCase().includes(t))&&(category==='all'||f.category===category)&&(!from||documentDay(f.createdAt)>=from)&&(!to||documentDay(f.createdAt)<=to)).sort((a,b)=>sort==='name'?a.filename.localeCompare(b.filename):sort==='oldest'?a.createdAt.localeCompare(b.createdAt):b.createdAt.localeCompare(a.createdAt));
}
