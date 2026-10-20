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
  if (!Number.isFinite(set.load) || set.load <= 0) return 'Enter load';
  if (!Number.isFinite(set.reps) || set.reps <= 0) return 'Enter reps';
  if (!Number.isFinite(set.effort) || !Number.isFinite(targetEffort)) return 'Enter effort';
  if (mode === 'RPE' && (set.effort < 0 || set.effort > 10 || targetEffort < 0 || targetEffort > 10)) return 'Invalid RPE';
  if (mode === 'RIR' && (set.effort < 0 || targetEffort < 0)) return 'Invalid RIR';

  // Estimate the same-rep load for the requested effort, using the
  // completed set's estimated 1RM. Do not round to available gym plates.
  const actualRir = mode === 'RIR' ? set.effort : 10 - set.effort;
  const targetRir = mode === 'RIR' ? targetEffort : 10 - targetEffort;
  const estimatedMax = set.load * (1 + (set.reps + actualRir) / 30);
  const suggested = estimatedMax / (1 + (set.reps + targetRir) / 30);
  return `${Math.max(0, Math.round(suggested * 100) / 100)} kg`;
}

export const bodyRegions = ['Neck / Cervical spine','Shoulder','Elbow','Wrist / Hand','Thoracic spine','Lumbar spine','Hip / Groin','Knee','Ankle / Foot'];
