import { TrainingError } from './training';
import { ServiceError } from './services';
import { privateJson } from './private-json';

export async function readPayload(request: Request): Promise<unknown> {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) throw new TrainingError('נדרשת בקשת JSON.', 415);
  if (request.headers.get('Sec-Fetch-Site') === 'cross-site') throw new TrainingError('הבקשה אינה מאושרת.', 403);
  const text = await request.text();
  if (text.length > 16000) throw new TrainingError('הבקשה גדולה מדי.', 413);
  try { return JSON.parse(text); } catch { throw new TrainingError('הבקשה אינה תקינה.'); }
}
export function apiError(error: unknown): Response {
  if (error instanceof ServiceError) return privateJson({ error: error.message, current: error.current }, { status: error.status });
  if (error instanceof TrainingError) return privateJson({ error: error.message, session: error.session }, { status: error.status });
  // Keep database diagnostics server-side and do not log user payloads.
  console.error('DoctorCoach database operation failed', error instanceof Error ? error.message : 'unknown error');
  return privateJson({ error: 'לא ניתן להשלים את הפעולה כרגע. הנתונים שהזנתם נשארו במסך; נסו שוב.' }, { status: 500 });
}
