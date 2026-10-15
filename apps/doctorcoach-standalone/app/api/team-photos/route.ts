import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig} from '../../../lib/care-server';
import {teamPhotoStore} from '../../../lib/team-photo-store';
import {privateJson} from '../../../lib/private-json';
import {apiError} from '../../../lib/api-helpers';
export async function GET(request:Request){try{
 const manage=new URL(request.url).searchParams.get('manage')==='1',store=teamPhotoStore(getRawDb(),careConfig().adminEmails);
 if(manage)store.requireAdmin(await getChatGPTUser());
 return privateJson({photos:await store.list()});
}catch(error){return apiError(error);}}
