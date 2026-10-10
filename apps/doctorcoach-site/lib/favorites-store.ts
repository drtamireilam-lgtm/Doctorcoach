import { exercises } from './content.ts';
import { isRecord, TrainingError } from './training.ts';

const knownIds = new Set(exercises.map(exercise => exercise.id));

export function favoritesStore(db: D1Database) {
  async function list(owner: string): Promise<string[]> {
    const rows = await db.prepare('SELECT exercise_id FROM exercise_favorites WHERE owner_id = ? ORDER BY created_at DESC, exercise_id').bind(owner).all<{ exercise_id:string }>();
    return rows.results.map(row => row.exercise_id).filter(id => knownIds.has(id));
  }
  return {
    list,
    async set(owner: string, payload: unknown): Promise<string[]> {
      if (!isRecord(payload) || typeof payload.exerciseId !== 'string' || !knownIds.has(payload.exerciseId)) throw new TrainingError('תרגיל לא מוכר.');
      if (typeof payload.favorite !== 'boolean') throw new TrainingError('בחירת המועדפים אינה תקינה.');
      // Explicit desired state makes retries safe. Account identity comes from the server.
      if (payload.favorite) {
        await db.prepare('INSERT INTO exercise_favorites (owner_id, exercise_id) VALUES (?, ?) ON CONFLICT(owner_id, exercise_id) DO NOTHING').bind(owner, payload.exerciseId).run();
      } else {
        await db.prepare('DELETE FROM exercise_favorites WHERE owner_id = ? AND exercise_id = ?').bind(owner, payload.exerciseId).run();
      }
      return list(owner);
    },
  };
}
