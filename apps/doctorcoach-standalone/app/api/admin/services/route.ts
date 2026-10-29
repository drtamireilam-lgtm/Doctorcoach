import {careConfig} from '../../../../lib/care-server';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../../chatgpt-auth';
import { getRawDb } from '../../../../db/raw';
import { servicesStore } from '../../../../lib/services-store';
import { privateJson } from '../../../../lib/private-json';
import { apiError, readPayload } from '../../../../lib/api-helpers';
import { isAdmin } from '../../../../lib/staff';

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return privateJson({ error:'יש להתחבר כדי לנהל שירותים.' }, { status:401 });
  if (!isAdmin(user, careConfig().adminEmails)) return privateJson({ error:'אזור זה זמין לחשבונות צוות מורשים בלבד.' }, { status:403 });
  try { return privateJson({ services: await servicesStore(getRawDb(), careConfig().adminEmails).listAdmin(user) }); }
  catch (error) { return apiError(error); }
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return privateJson({ error:'יש להתחבר כדי לשמור שירותים.' }, { status:401 });
  if (!isAdmin(user, careConfig().adminEmails)) return privateJson({ error:'אין הרשאה לעריכת שירותים.' }, { status:403 });
  try { return privateJson({ service: await servicesStore(getRawDb(), careConfig().adminEmails).save(user, await readPayload(request)) }); }
  catch (error) { return apiError(error); }
}
