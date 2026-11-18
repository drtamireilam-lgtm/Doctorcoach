import { updateSet, parseRpe, type SessionExercise, type SetResult } from './training.ts';

/** Autosave never completes a set; an opted-in completed-set correction may refresh its unperformed successor. */
export function setAutosaveAction(item: SessionExercise, index: number, draft: SetResult & { targetRpe: number | null }, nextLoad?:{enabled:boolean;step:number}) {
  const action = { action: 'set', exerciseId: item.exerciseId, occurrenceId: item.occurrenceId, setIndex: index, ...draft, done: item.results[index].done, autoNextLoad: item.results[index].done&&nextLoad?.enabled===true, ...(nextLoad?{step:nextLoad.step}:{}) };
  try {
    updateSet([item], action);
    parseRpe(draft.targetRpe);
    return action;
  } catch { return null; }
}
