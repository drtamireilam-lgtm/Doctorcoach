import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {chatGPTSignInPath} from "./chatgpt-auth-paths";
import {getRawDb} from '../db/raw';
import {deletionStatus} from '../lib/account-deletion';
import {env} from 'cloudflare:workers';
import {deletionJournal,restoreDeletionBarrier} from '../lib/deletion-journal';
export {chatGPTSignInPath,chatGPTSignOutPath} from "./chatgpt-auth-paths";

export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

const USER_ID_HEADER = "oai-authenticated-user-id";
const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
export async function getChatGPTUser(options:{allowDeleted?:boolean}={}): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const userId = requestHeaders.get(USER_ID_HEADER);
  const email = requestHeaders.get(USER_EMAIL_HEADER);
  if (!userId || !email) {
    if (requestHeaders.get('cookie')?.includes('__Host-dc_session=')) console.warn('DC_AUTH_DIAG identity_headers_missing');
    return null;
  }
  // R2 journal survives a D1 rollback. Storage failure denies private access.
  try {
    const receipt=await deletionJournal(env.BUCKET??null).read(userId);
    if(receipt){await restoreDeletionBarrier(getRawDb(),receipt);if(!options.allowDeleted)return null;}
  } catch {console.warn('DC_AUTH_DIAG deletion_storage_denied');return null;}
  if(!options.allowDeleted&&await deletionStatus(getRawDb(),userId))return null;

  const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
  const fullName =
    encodedFullName &&
    requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
      ? safeDecodeURIComponent(encodedFullName)
      : null;

  return {
    userId,
    displayName: fullName ?? email,
    email,
    fullName,
  };
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
