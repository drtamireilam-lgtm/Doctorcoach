import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../../chatgpt-auth';
import {getRawDb} from '../../../../../db/raw';
import {careConfig} from '../../../../../lib/care-server';
import {mediaStore,readVideoBody,MAX_VIDEO_BYTES} from '../../../../../lib/media-store';
import {commitVideoUpload} from '../../../../../lib/media-upload';
import {apiError} from '../../../../../lib/api-helpers';
import {privateJson} from '../../../../../lib/private-json';
import {TrainingError} from '../../../../../lib/training';
import {validId} from '../../../../../lib/care';
export async function PUT(request:Request,context:{params:Promise<{id:string}>}){try{
 const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר.',401);
 if(request.headers.get('Sec-Fetch-Site')==='cross-site'||request.headers.get('X-Replacement-Confirmed')!=='true')throw new TrainingError('יש לאשר החלפה וזכויות לפרסום.',403);
 const store=mediaStore(getRawDb(),careConfig()),row=await store.replacementTarget(user,validId((await context.params).id));
 const mime=request.headers.get('Content-Type')??'',size=Number(request.headers.get('X-Video-Bytes'));
 if(!['video/mp4','video/webm'].includes(mime)||!Number.isInteger(size)||size<32||size>MAX_VIDEO_BYTES)throw new TrainingError('בחרו קובץ MP4 או WebM עד 25 MB.');
 const bytes=await readVideoBody(request,size,mime);if(!env.BUCKET)throw new TrainingError('אחסון הסרטונים אינו זמין.',503);
 await commitVideoUpload(env.BUCKET,row.id,mime,bytes,key=>store.replace(user,row,key,mime,size));
 // The database points at the new object before retiring the old object.
 let cleanupPending=false;try{await env.BUCKET.delete(row.object_key);}catch{cleanupPending=true;}
 return privateJson({ok:true,cleanupPending});
 }catch(error){return apiError(error);}}
