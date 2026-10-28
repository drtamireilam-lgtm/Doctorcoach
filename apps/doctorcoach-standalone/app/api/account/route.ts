import {careConfig} from '../../../lib/care-server';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { isAdmin } from '../../../lib/staff';
import { serverCare } from '../../../lib/care-server';
import { apiError } from '../../../lib/api-helpers';
import { privateJson } from '../../../lib/private-json';

export async function GET() {
  const user = await getChatGPTUser();
  try { const careRole=user ? await serverCare().staffFor(user.email) : null; return privateJson({ signedIn: !!user, canManageServices: isAdmin(user, careConfig().adminEmails), careRole:careRole?.role??null }); } catch(e) { return apiError(e); }
}
