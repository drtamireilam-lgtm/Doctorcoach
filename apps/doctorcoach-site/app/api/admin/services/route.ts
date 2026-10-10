import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../../chatgpt-auth';
import { getRawDb } from '../../../../db/raw';
import { servicesStore } from '../../../../lib/services-store';
import { privateJson } from '../../../../lib/private-json';
import { apiError, readPayload } from '../../../../lib/api-helpers';
import { isStaff } from '../../../../lib/staff';

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return privateJson({ error:'יש להתחבר כדי לנהל שירותים.' }, { status:401 });
  if (!isStaff(user, env.DOCTORCOACH_ADMIN_EMAILS)) return privateJson({ error:'אזור זה זמין לחשבונות צוות מורשים בלבד.' }, { status:403 });
  try { return privateJson({ services: await servicesStore(getRawDb(), env.DOCTORCOACH_ADMIN_EMAILS).listAdmin(user) }); }
  catch (error) { return apiError(error); }
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return privateJson({ error:'יש להתחבר כדי לשמור שירותים.' }, { status:401 });
  if (!isStaff(user, env.DOCTORCOACH_ADMIN_EMAILS)) return privateJson({ error:'אין הרשאה לעריכת שירותים.' }, { status:403 });
  try { return privateJson({ service: await servicesStore(getRawDb(), env.DOCTORCOACH_ADMIN_EMAILS).save(user, await readPayload(request)) }); }
  catch (error) { return apiError(error); }
}
