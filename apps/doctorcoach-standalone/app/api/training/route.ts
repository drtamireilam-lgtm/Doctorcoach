import {careConfig} from '../../../lib/care-server';
import { getChatGPTUser } from '../../chatgpt-auth';
import { getRawDb } from '../../../db/raw';
import { privateJson } from '../../../lib/private-json';
import { apiError, readPayload } from '../../../lib/api-helpers';
import { trainingStore } from '../../../lib/training-store';
const unauthorized = () => privateJson({ error: 'יש להתחבר כדי לנהל אימון.' }, { status: 401 });
export async function GET() {
  const user = await getChatGPTUser(); if (!user) return unauthorized();
  try { return privateJson(await trainingStore(getRawDb(),careConfig()).feed(user.userId)); }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser(); if (!user) return unauthorized();
  try { return privateJson({ session: await trainingStore(getRawDb(),careConfig()).start(user.userId, await readPayload(request)) }); }
  catch (error) { return apiError(error); }
}
export async function PATCH(request: Request) {
  const user = await getChatGPTUser(); if (!user) return unauthorized();
  try { return privateJson({ session: await trainingStore(getRawDb(),careConfig()).patch(user.userId, await readPayload(request)) }); }
  catch (error) { return apiError(error); }
}
