import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {mediaStore} from '../../../lib/media-store';
import {inputRecord} from '../../../lib/care';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {TrainingError} from '../../../lib/training';
import {privateJson} from '../../../lib/private-json';
import {isAdmin} from '../../../lib/staff';
import {bundledExerciseDemos} from '../../../lib/bundled-exercise-demos';

export async function GET(request:Request){
 try {
  const user=await getChatGPTUser();
  const params=new URL(request.url).searchParams;
  const config=careConfig();
  const kind=params.get('kind')==='review'?'review':'demo';
  const manage=params.get('manage')==='1';
  const uploads=await mediaStore(getRawDb(),config).list(user,kind,params.get('client')??undefined,manage);
  const videos=kind==='demo'&&!manage?[...bundledExerciseDemos,...uploads]:uploads;
  return privateJson({videos,canManageDemo:isAdmin(user,config.adminEmails)});
 } catch(e){return apiError(e);}
}
export async function POST(request:Request){try{const user=await getChatGPTUser();if(!user)throw new TrainingError('יש להתחבר.',401);const p=inputRecord(await readPayload(request));const store=mediaStore(getRawDb(),careConfig());if(p.action==='initialize')return privateJson(await store.initialize(user,p));if(p.action==='publish')await store.publish(user,p);else if(p.action==='feedback')await store.feedback(user,p);else throw new TrainingError('פעולה לא מוכרת.');return privateJson({ok:true});}catch(e){return apiError(e);}}
