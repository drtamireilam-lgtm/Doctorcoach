import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {getRawDb} from '../../../../db/raw';
import {careConfig} from '../../../../lib/care-server';
import {mediaStore,readVideoBody,videoRange} from '../../../../lib/media-store';
import {commitVideoUpload} from '../../../../lib/media-upload';
import {apiError} from '../../../../lib/api-helpers';
import {TrainingError} from '../../../../lib/training';
import {privateJson} from '../../../../lib/private-json';
import {validId} from '../../../../lib/care';
type Context={params:Promise<{id:string}>};
function bucket(){if(!env.BUCKET)throw new TrainingError('אחסון הסרטונים אינו זמין כרגע.',503);return env.BUCKET;}
export async function GET(request:Request,context:Context){try{const id=validId((await context.params).id);const store=mediaStore(getRawDb(),careConfig()),user=await getChatGPTUser();const row=await store.readable(user,id);const range=videoRange(request.headers.get('Range'),row.bytes);const object=await bucket().get(row.object_key,range?{range}:undefined);if(!object||!('body' in object))throw new TrainingError('הסרטון אינו זמין כרגע.',404);try{await store.confirmReadable(user,row);}catch(error){await object.body.cancel().catch(()=>{});throw error;}const headers=new Headers({'Content-Type':row.mime,'Cache-Control':'private, no-store','Vary':'Cookie, Authorization','Accept-Ranges':'bytes','Content-Length':String(range?.length??object.size),'X-Content-Type-Options':'nosniff','Content-Disposition':'inline'});if(range)headers.set('Content-Range',`bytes ${range.offset}-${range.offset+range.length-1}/${row.bytes}`);return new Response(object.body,{status:range?206:200,headers});}catch(e){return apiError(e);}}
export async function PUT(request:Request,context:Context){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר.',401);if(request.headers.get('Sec-Fetch-Site')==='cross-site')throw new TrainingError('הבקשה אינה מאושרת.',403);const store=mediaStore(getRawDb(),careConfig());const row=await store.writable(user,validId((await context.params).id));if(row.status==='ready')return privateJson({ok:true});if(request.headers.get('Content-Type')!==row.mime)throw new TrainingError('סוג הקובץ שונה מהסוג שנבחר.');const bytes=await readVideoBody(request,row.bytes,row.mime);await commitVideoUpload(bucket(),row.id,row.mime,bytes,key=>store.ready(user,row.id,key));return privateJson({ok:true});}catch(e){return apiError(e);}}
export async function DELETE(request:Request,context:Context){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר.',401);if(request.headers.get('Sec-Fetch-Site')==='cross-site'||request.headers.get('Content-Type')!=='application/json')throw new TrainingError('הבקשה אינה מאושרת.',403);const key=await mediaStore(getRawDb(),careConfig()).remove(user,validId((await context.params).id));await bucket().delete(key);return privateJson({ok:true});}catch(e){return apiError(e);}}
