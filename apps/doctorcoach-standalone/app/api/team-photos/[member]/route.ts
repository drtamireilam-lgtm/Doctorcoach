import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {getRawDb} from '../../../../db/raw';
import {careConfig} from '../../../../lib/care-server';
import {teamPhotoStore,readTeamPhotoBody} from '../../../../lib/team-photo-store';
import {privateJson} from '../../../../lib/private-json';
import {apiError} from '../../../../lib/api-helpers';
import {TrainingError} from '../../../../lib/training';
type Context={params:Promise<{member:string}>};
export async function GET(_request:Request,context:Context){try{
 const row=await teamPhotoStore(getRawDb()).readable((await context.params).member);
 if(!env.BUCKET)throw new TrainingError('אחסון התמונות אינו זמין.',503);
 const object=await env.BUCKET.get(row.object_key);if(!object)throw new TrainingError('התמונה אינה זמינה כרגע.',404);
 return new Response(object.body,{headers:{'Content-Type':row.mime,'Content-Length':String(object.size),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline','Content-Security-Policy':"default-src 'none'; sandbox"}});
}catch(error){return apiError(error);}}
export async function PUT(request:Request,context:Context){try{
 const user=await getChatGPTUser(),store=teamPhotoStore(getRawDb(),careConfig().adminEmails);store.requireAdmin(user);
 if(request.headers.get('Sec-Fetch-Site')==='cross-site')throw new TrainingError('הבקשה אינה מאושרת.',403);
 if(request.headers.get('X-Confirm-Public')!=='true')throw new TrainingError('יש לאשר פרסום תמונת פרופיל באתר.');
 const raw=request.headers.get('X-Photo-Version')??'';if(!/^\d+$/.test(raw))throw new TrainingError('יש לרענן את תמונות הצוות.');
 if(!env.BUCKET)throw new TrainingError('אחסון התמונות אינו זמין.',503);
 const image=await readTeamPhotoBody(request);
 return privateJson(await store.upload(user,env.BUCKET,(await context.params).member,Number(raw),image.mime,image.bytes,request.headers.get('X-Confirm-Public')==='true'));
}catch(error){return apiError(error);}}
