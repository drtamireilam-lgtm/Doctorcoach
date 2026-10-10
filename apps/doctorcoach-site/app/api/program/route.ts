import {trainingAccess} from '../../../lib/training-access';
import { privateJson } from '../../../lib/private-json';
import { getChatGPTUser } from '../../chatgpt-auth';
import { getRawDb } from '../../../db/raw';
import { trainingStore } from '../../../lib/training-store';
import { isRecord } from '../../../lib/training';
import { apiError, readPayload } from '../../../lib/api-helpers';
const unauthorized = () => privateJson({ error: 'יש להתחבר כדי לשמור תוכנית.' }, { status: 401 });

export async function GET() {
  const user = await getChatGPTUser(); if (!user) return unauthorized();
  try { return privateJson({ items: await trainingStore(getRawDb()).getPlan(user.userId),access:await trainingAccess(getRawDb(),user.userId) }); }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser(); if (!user) return unauthorized();
  try {
    const payload = await readPayload(request); const store = trainingStore(getRawDb());
    if (isRecord(payload) && 'templateId' in payload) return privateJson({ items: await store.addTemplate(user.userId, payload) });
    return privateJson({ item: await store.savePlan(user.userId, payload) });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request) {
  const user = await getChatGPTUser(); if (!user) return unauthorized();
  try { await trainingStore(getRawDb()).removePlan(user.userId, await readPayload(request)); return privateJson({ ok: true }); }
  catch (error) { return apiError(error); }
}
