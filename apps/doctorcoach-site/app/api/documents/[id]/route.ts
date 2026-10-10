import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {getRawDb} from '../../../../db/raw';
import {careConfig} from '../../../../lib/care-server';
import {privateDocumentStore} from '../../../../lib/private-document-store';
import {readDocumentBody} from '../../../../lib/private-documents';
import {commitVideoUpload} from '../../../../lib/media-upload';
import {apiError} from '../../../../lib/api-helpers';
import {TrainingError} from '../../../../lib/training';
import {validId} from '../../../../lib/care';
import {privateJson} from '../../../../lib/private-json';
type Context={params:Promise<{id:string}>};
function bucket(){if(!env.BUCKET)throw new TrainingError('אחסון הקבצים אינו זמין.',503);return env.BUCKET;}
export async function GET(request:Request,context:Context){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר.',401);const store=privateDocumentStore(getRawDb(),careConfig()),row=await store.readable(user,validId((await context.params).id)),object=await bucket().get(row.object_key);if(!object)throw new TrainingError('הקובץ אינו זמין.',404);try{await store.logDownload(user,row);}catch(e){await object.body.cancel().catch(()=>{});throw e;}return new Response(object.body,{headers:{'Content-Type':row.mime,'Content-Length':String(object.size),'Cache-Control':'private, no-store','Vary':'Cookie, Authorization','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Content-Disposition':`attachment; filename="DoctorCoach-document.${row.mime==='application/pdf'?'pdf':row.mime==='image/png'?'png':'jpg'}"; filename*=UTF-8''${encodeURIComponent(row.filename).replace(/'/g,'%27')}`}});}catch(e){return apiError(e);}}
export async function PUT(request:Request,context:Context){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר.',401);if(request.headers.get('Sec-Fetch-Site')==='cross-site')throw new TrainingError('הבקשה אינה מאושרת.',403);const store=privateDocumentStore(getRawDb(),careConfig()),row=await store.writable(user,validId((await context.params).id));if(row.status==='ready')return privateJson({ok:true});if(request.headers.get('Content-Type')!==row.mime)throw new TrainingError('סוג הקובץ השתנה.');const bytes=await readDocumentBody(request,row.bytes,row.mime);await commitVideoUpload(bucket(),row.id,row.mime,bytes,key=>store.ready(user,row.id,key));return privateJson({ok:true});}catch(e){return apiError(e);}}
