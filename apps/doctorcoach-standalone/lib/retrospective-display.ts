import { durationLabel, type TrainingSession } from "./training.ts";
export function recordedWorkoutDuration(session: TrainingSession) {
  if (session.retrospective)
    return session.retrospective.durationMinutes === null
      ? "משך לא דווח"
      : `${session.retrospective.durationMinutes} דקות`;
  return durationLabel(
    session.startedAt,
    session.finishedAt ?? session.startedAt,
  );
}
