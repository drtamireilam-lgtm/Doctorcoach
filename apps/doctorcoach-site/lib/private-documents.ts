import {TrainingError} from './training.ts';
export const MAX_DOCUMENT_BYTES=10*1024*1024;
export const documentCategories=['blood','visit','discharge','imaging','other'] as const;
export type DocumentCategory=typeof documentCategories[number];
export type PrivateDocument={id:string;clientId:string;uploaderId:string;uploaderName:string;purpose:'medical'|'message';channel:string;category:string;filename:string;mime:string;bytes:number;createdAt:string;canArchive:boolean};
export async function readDocumentBody(request:Request,expected:number,mime:string){
 if(!request.body||expected>MAX_DOCUMENT_BYTES)throw new TrainingError('קובץ לא תקין.');const reader=request.body.getReader(),parts:Uint8Array[]=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>expected){await reader.cancel();throw new TrainingError('גודל הקובץ שונה מהגודל שנבחר.');}parts.push(value);}}finally{reader.releaseLock();}
 if(size!==expected)throw new TrainingError('גודל הקובץ שונה מהגודל שנבחר.');const bytes=new Uint8Array(size);let pos=0;for(const part of parts){bytes.set(part,pos);pos+=part.length;}
 const pdf=String.fromCharCode(...bytes.slice(0,5))==='%PDF-',png=[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v),jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(!(mime==='application/pdf'&&pdf||mime==='image/png'&&png||mime==='image/jpeg'&&jpeg))throw new TrainingError('תוכן הקובץ אינו PDF, PNG או JPEG מהסוג שנבחר.');return bytes;
}
