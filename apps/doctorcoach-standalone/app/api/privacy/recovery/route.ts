import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {getRawDb} from '../../../../db/raw';
import {careConfig} from '../../../../lib/care-server';
import {deletionJournal,reconcileDeletionPage} from '../../../../lib/deletion-journal';
import {readPayload,apiError} from '../../../../lib/api-helpers';
import {privateJson} from '../../../../lib/private-json';
import {TrainingError} from '../../../../lib/training';
export async function POST(request:Request){try{
 const actor=await getChatGPTUser();if(!actor)throw new TrainingError('יש להתחבר.',401);
 return privateJson(await reconcileDeletionPage(getRawDb(),deletionJournal(env.BUCKET??null),actor,careConfig().adminEmails,await readPayload(request)));
}catch(e){return apiError(e);}}
