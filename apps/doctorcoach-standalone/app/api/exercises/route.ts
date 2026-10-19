import {TrainingError} from '../../../lib/training';
import {requireHealthConsent} from '../../../lib/consent-server';
import {getChatGPTUser} from '../../chatgpt-auth';
import {getRawDb} from '../../../db/raw';
import {careConfig,serverCare} from '../../../lib/care-server';
import {customExercisesStore,availableCustomExercises} from '../../../lib/custom-exercises';
import {apiError,readPayload} from '../../../lib/api-helpers';
import {inputRecord} from '../../../lib/care';
import {privateJson} from '../../../lib/private-json';
import {allowedPlan} from '../../../lib/training-access';
export async function GET(request:Request){const user=await getChatGPTUser();if(!user)return privateJson({error:'יש להתחבר.'},{status:401});try{const db=getRawDb(),data=await customExercisesStore(db,careConfig()).list(user),client=new URL(request.url).searchParams.get('client');let assigned=[] as import('../../../lib/custom-exercise-types').CustomExercise[];if(client){const a=await serverCare().authorize(user,client);if(!a.program||a.self)return privateJson({error:'אין הרשאה לתוכנית.'},{status:403});await requireHealthConsent(db,client);assigned=await availableCustomExercises(db,user.userId,client);await requireHealthConsent(db,client);const current=await serverCare().authorize(user,client);if(!current.program||current.self)throw new TrainingError('הרשאות התוכנית השתנו.',403);}else{assigned=(await allowedPlan(db,user.userId,careConfig())??[]).flatMap(i=>i.customExercise?[i.customExercise]:[]);}return privateJson({...data,assigned});}catch(e){return apiError(e);}}
export async function POST(request:Request){const user=await getChatGPTUser();if(!user)return privateJson({error:'יש להתחבר.'},{status:401});try{const p=inputRecord(await readPayload(request)),store=customExercisesStore(getRawDb(),careConfig());if(p.action==='create')return privateJson({exercise:await store.create(user,p)});await store.status(user,p);return privateJson({ok:true});}catch(e){return apiError(e);}}
