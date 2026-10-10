import { getChatGPTUser } from '../../chatgpt-auth';
import { getRawDb } from '../../../db/raw';
import { favoritesStore } from '../../../lib/favorites-store';
import { apiError, readPayload } from '../../../lib/api-helpers';
import { privateJson } from '../../../lib/private-json';

const unauthorized = () => privateJson({ error:'יש להתחבר כדי לשמור מועדפים.' }, { status:401 });

export async function GET() {
  const user = await getChatGPTUser(); if (!user) return unauthorized();
  try { return privateJson({ favorites:await favoritesStore(getRawDb()).list(user.userId) }); }
  catch (error) { return apiError(error); }
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser(); if (!user) return unauthorized();
  try { return privateJson({ favorites:await favoritesStore(getRawDb()).set(user.userId, await readPayload(request)) }); }
  catch (error) { return apiError(error); }
}
