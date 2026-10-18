import type { SupabaseClient } from '@supabase/supabase-js';

/** Athlete-only workout logging. Server RLS and foreign keys validate ownership. */
export type WorkoutSetInput = {
  sessionId: string; exerciseId: string; setNumber: number;
  loadKg: number; reps: number; effort: number;
  effortMode: 'RPE' | 'RIR'; pain?: number | null;
};
export function validateWorkoutSet(input: WorkoutSetInput) {
  if (!Number.isInteger(input.setNumber) || input.setNumber < 1 || input.setNumber > 30 ||
      !Number.isFinite(input.loadKg) || input.loadKg < 0 ||
      !Number.isInteger(input.reps) || input.reps < 0 || input.reps > 100 ||
      !Number.isFinite(input.effort) || input.effort < 0 || input.effort > 10 ||
      !['RPE', 'RIR'].includes(input.effortMode) ||
      (input.pain != null && (!Number.isFinite(input.pain) || input.pain < 0 || input.pain > 10))) {
    throw new Error('ערכי הסט אינם תקינים.');
  }
  return input;
}
export async function startCloudWorkout(client: SupabaseClient, planId: string, dayLabel: string) {
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user || auth.user.is_anonymous) throw new Error('נדרשת התחברות.');
  if (!dayLabel.trim()) throw new Error('יש לבחור יום אימון.');
  const { data, error } = await client.from('dc_workout_sessions')
    .insert({ athlete_id: auth.user.id, plan_id: planId, day_label: dayLabel })
    .select('id,plan_id,day_label,started_at').single();
  if (error || !data) throw new Error('לא ניתן להתחיל אימון עבור תוכנית זו.');
  return data;
}
export async function logCloudWorkoutSet(client: SupabaseClient, input: WorkoutSetInput) {
  validateWorkoutSet(input);
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user || auth.user.is_anonymous) throw new Error('נדרשת התחברות.');
  const { data, error } = await client.from('dc_workout_sets').insert({
    athlete_id: auth.user.id, session_id: input.sessionId, exercise_id: input.exerciseId,
    set_number: input.setNumber, load_kg: input.loadKg, reps: input.reps,
    effort: input.effort, effort_mode: input.effortMode, pain: input.pain ?? null,
  }).select('id,session_id,exercise_id,set_number,logged_at').single();
  if (error || !data) throw new Error('שמירת הסט נכשלה. ודאו שהתרגיל שייך לאימון ושמספר הסט פנוי.');
  return data;
}
export async function finishCloudWorkout(client: SupabaseClient, sessionId: string) {
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user || auth.user.is_anonymous) throw new Error('נדרשת התחברות.');
  const { data, error } = await client.from('dc_workout_sessions')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', sessionId).eq('athlete_id', auth.user.id).is('completed_at', null)
    .select('id,completed_at').single();
  if (error || !data) throw new Error('לא ניתן לסיים את האימון.');
  return data;
}
