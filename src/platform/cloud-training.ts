import type { SupabaseClient } from '@supabase/supabase-js';
import { exerciseLibrary } from '../exercise-library';

/** Cloud training records only. Never load demo/localStorage data into an authenticated session. */
export type CloudPlan = {
  id: string; athlete_id: string; coach_id: string | null;
  title: string; version: number; status: string;
};
export type CloudPlannedExercise = {
  id: string; plan_id: string; exercise_key: string; day_label: string;
  sort_order: number; sets: number; target_reps: number;
  target_load: number | null; effort_mode: string; target_effort: number;
};
export type EditorExercise = {
  cloudId: string; libraryId: string; name: string; region: string;
  pattern: string; equipment: string; day: string; order: number;
  sets: number; reps: number; load: number; effortMode: string; targetEffort: number;
};

export function toEditorExercise(row: CloudPlannedExercise): EditorExercise {
  const item = exerciseLibrary.find(exercise => exercise.id === row.exercise_key);
  return {
    cloudId: row.id, libraryId: row.exercise_key,
    name: item?.name ?? row.exercise_key,
    region: item?.region ?? 'Other', pattern: item?.pattern ?? '',
    equipment: item?.equipment ?? '', day: row.day_label,
    order: row.sort_order, sets: row.sets, reps: row.target_reps,
    load: row.target_load ?? 0, effortMode: row.effort_mode,
    targetEffort: row.target_effort,
  };
}

/** Server RLS is authoritative. Never infer permission from a client-supplied role. */
export async function loadCloudTrainingPlan(client: SupabaseClient, planId: string) {
  const { data: plan, error: planError } = await client.from('dc_training_plans')
    .select('id,athlete_id,coach_id,title,version,status').eq('id', planId).single();
  if (planError || !plan) throw new Error('תוכנית האימון אינה זמינה לחשבון זה.');
  const { data: exercises, error: exerciseError } = await client.from('dc_training_exercises')
    .select('id,plan_id,exercise_key,day_label,sort_order,sets,target_reps,target_load,effort_mode,target_effort')
    .eq('plan_id', planId).order('day_label').order('sort_order');
  if (exerciseError) throw new Error('לא ניתן לטעון תרגילים מהשרת.');
  return { plan: plan as CloudPlan, exercises: (exercises ?? []).map(row => toEditorExercise(row as CloudPlannedExercise)) };
}
