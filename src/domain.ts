export type Section = 'home' | 'medical' | 'rehabilitation' | 'training' | 'nutrition' | 'progress' | 'education' | 'team' | 'appointments' | 'pilot';
export type Side = 'left' | 'right' | 'central' | '';
export type EffortMode = 'RPE' | 'RIR';

export type Intake = {
  injured: boolean | null;
  injuryRegion: string;
  side: Side;
  onset: string;
  mechanism: string;
  painNow: number;
  painWorst: number;
  numbnessWeakness: boolean;
  bowelBladderChange: boolean;
  majorTrauma: boolean;
  chestPainSyncope: boolean;
  feverUnexplainedSymptoms: boolean;
  unableToBearWeight: boolean;
  age: string;
  medicalHistory: string;
  medications: string;
  priorInjuries: string;
  goals: string;
  frequency: string;
  style: string;
  restrictions: string;
};

export type AthleteProfile = {
  id: string;
  intake: Intake;
  selectedBodyRegion?: string;
  selectedSide?: Side;
  trainingMode: EffortMode;
  assignedPlanId?: string;
};

export type ExerciseSet = { reps: number; load: number; effort: number };

export const initialIntake: Intake = {
  injured: null, injuryRegion: '', side: '', onset: '', mechanism: '', painNow: 0, painWorst: 0,
  numbnessWeakness: false, bowelBladderChange: false, majorTrauma: false, chestPainSyncope: false,
  feverUnexplainedSymptoms: false, unableToBearWeight: false, age: '', medicalHistory: '', medications: '',
  priorInjuries: '', goals: '', frequency: '', style: '', restrictions: '',
};

export const hasRedFlags = (intake: Intake) => Boolean(
  intake.bowelBladderChange || intake.majorTrauma || intake.chestPainSyncope || intake.feverUnexplainedSymptoms || intake.unableToBearWeight || intake.numbnessWeakness
);

export function estimateE1RM(set: ExerciseSet, mode: EffortMode): number {
  if (!set.reps || !set.load) return 0;
  const rir = mode === 'RIR' ? set.effort : Math.max(0, 10 - set.effort);
  const effectiveReps = set.reps + rir;
  return Math.round((set.load * (1 + effectiveReps / 30)) * 10) / 10;
}

export function suggestedNextLoad(set: ExerciseSet, targetEffort: number, mode: EffortMode): string {
  if (!set.load) return 'Enter load';
  const delta = mode === 'RPE' ? targetEffort - set.effort : set.effort - targetEffort;
  if (Math.abs(delta) < 0.5) return 'Keep load';
  const pct = delta > 0 ? 0.025 : -0.025;
  const suggested = Math.max(0, Math.round((set.load * (1 + pct)) * 2) / 2);
  return `${suggested} kg`;
}

export const bodyRegions = ['Neck / Cervical spine','Shoulder','Elbow','Wrist / Hand','Thoracic spine','Lumbar spine','Hip / Groin','Knee','Ankle / Foot'];
