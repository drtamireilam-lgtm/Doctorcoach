import { updateSet, parseRpe, type SessionExercise, type SetResult } from './training.ts';

/** A draft autosave updates fields only; completion and next-load application remain explicit actions. */
export function setAutosaveAction(item: SessionExercise, index: number, draft: SetResult & { targetRpe: number | null }) {
  const action = { action: 'set', exerciseId: item.exerciseId, occurrenceId: item.occurrenceId, setIndex: index, ...draft, done: item.results[index].done, autoNextLoad: false };
  try {
    updateSet([item], action);
    parseRpe(draft.targetRpe);
    return action;
  } catch { return null; }
}
