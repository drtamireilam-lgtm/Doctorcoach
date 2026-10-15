import {getChatGPTUser} from '../../../chatgpt-auth';
import {getRawDb} from '../../../../db/raw';
import {careConfig} from '../../../../lib/care-server';
import {feedbackReport} from '../../../../lib/feedback-report';
import {privateJson} from '../../../../lib/private-json';
import {apiError} from '../../../../lib/api-helpers';
import {TrainingError} from '../../../../lib/training';
export async function GET(request:Request){try{const u=await getChatGPTUser();if(!u)throw new TrainingError('יש להתחבר.',401);const q=new URL(request.url).searchParams,r=feedbackReport(getRawDb(),careConfig().adminEmails);if(q.get('export')==='csv'){const csv=await r.csv(u,{section:q.get('section')??undefined,bodyRegion:q.get('bodyRegion')??undefined,state:q.get('state')??undefined});return new Response(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="DoctorCoach_Feedback.csv"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}return privateJson(await r.summary(u));}catch(e){return apiError(e);}}
