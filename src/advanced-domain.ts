export type OutcomeInstrument = 'ODI' | 'NDI' | 'QuickDASH' | 'LEFS' | 'PSFS' | 'Custom';

export type OutcomeMeasure = {
  id: string;
  athleteId: string;
  injuryEpisodeId?: string;
  instrument: OutcomeInstrument;
  score: number;
  scoreMax?: number;
  recordedAt: string;
  notes?: string;
};

export type BaselineAssessment = {
  id: string;
  athleteId: string;
  injuryEpisodeId?: string;
  recordedAt: string;
  pain: number;
  functionScore?: number;
  bodyWeightKg?: number;
  rangeOfMotion?: Array<{ movement: string; degrees: number; side?: 'left' | 'right' | 'central' }>;
  strengthTests?: Array<{ test: string; value: number; unit: string; side?: 'left' | 'right' }>;
  activityLevel?: string;
  weeklyTrainingVolume?: number;
};

export type ReturnToTrainingCriterion = {
  id: string;
  label: string;
  category: 'pain' | 'rom' | 'strength' | 'function' | 'tolerance' | 'sport-specific';
  target: string;
  passed: boolean;
  assessedAt?: string;
  notes?: string;
};

export type ProgramVersion = {
  id: string;
  programId: string;
  athleteId: string;
  version: number;
  createdAt: string;
  createdBy: string;
  reason?: string;
  status: 'draft' | 'active' | 'archived';
  previousVersionId?: string;
};

export type TimelineEventType =
  | 'injury-created'
  | 'medical-review'
  | 'restriction-updated'
  | 'program-version'
  | 'workout-completed'
  | 'pain-flare'
  | 'body-weight'
  | 'personal-record'
  | 'rehab-milestone'
  | 'nutrition-checkin'
  | 'appointment';

export type ClientTimelineEvent = {
  id: string;
  athleteId: string;
  occurredAt: string;
  type: TimelineEventType;
  title: string;
  detail?: string;
  source: 'medical' | 'training' | 'rehab' | 'nutrition' | 'system';
  entityId?: string;
};

export type ReadinessEntry = {
  id: string;
  athleteId: string;
  recordedAt: string;
  sleep: number;
  fatigue: number;
  pain: number;
  stress?: number;
};

export type PainResponseEntry = {
  id: string;
  athleteId: string;
  injuryEpisodeId?: string;
  sessionId?: string;
  recordedAt: string;
  timing: 'before' | 'during' | 'immediately-after' | 'next-day';
  pain: number;
  notes?: string;
};

export type SessionAdherence = {
  sessionId: string;
  athleteId: string;
  prescribedSets: number;
  completedSets: number;
  skippedReason?: string;
};

export type WorkloadSnapshot = {
  athleteId: string;
  weekStart: string;
  totalVolumeKg: number;
  hardSets: number;
  sessions: number;
  averageRPE?: number;
};

export type AlertSeverity = 'info' | 'review' | 'urgent';

export type SmartAlert = {
  id: string;
  athleteId: string;
  createdAt: string;
  severity: AlertSeverity;
  category: 'pain' | 'readiness' | 'performance' | 'rom' | 'workload' | 'medical';
  title: string;
  detail: string;
  acknowledged: boolean;
};

export function adherencePercent(entry: SessionAdherence): number {
  if (entry.prescribedSets <= 0) return 0;
  return Math.round((entry.completedSets / entry.prescribedSets) * 100);
}

export function asymmetryPercent(left: number, right: number): number {
  const max = Math.max(Math.abs(left), Math.abs(right));
  if (max === 0) return 0;
  return Math.round((Math.abs(left - right) / max) * 1000) / 10;
}

export function workloadChangePercent(previous: number, current: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function buildDoctorCoachScore(input: {
  recovery: number;
  painControl: number;
  function: number;
  adherence: number;
  performance: number;
}): { score: number; direction: 'improving' | 'stable' | 'attention' } {
  const values = [input.recovery, input.painControl, input.function, input.adherence, input.performance]
    .map((value) => Math.max(0, Math.min(100, value)));
  const score = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  const direction = score >= 75 ? 'improving' : score >= 55 ? 'stable' : 'attention';
  return { score, direction };
}

export function deriveSmartAlerts(input: {
  painBefore?: number;
  painNextDay?: number;
  readinessHistory?: number[];
  previousWeeklyVolume?: number;
  currentWeeklyVolume?: number;
  redFlag?: boolean;
}): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const now = new Date().toISOString();

  if (input.redFlag) {
    alerts.push({
      id: `medical-${now}`,
      athleteId: 'current',
      createdAt: now,
      severity: 'urgent',
      category: 'medical',
      title: 'Medical review required',
      detail: 'A red-flag answer was recorded. Injury-specific automated guidance should remain blocked until reviewed.',
      acknowledged: false,
    });
  }

  if (input.painBefore != null && input.painNextDay != null && input.painNextDay - input.painBefore >= 2) {
    alerts.push({
      id: `pain-${now}`,
      athleteId: 'current',
      createdAt: now,
      severity: 'review',
      category: 'pain',
      title: 'Next-day pain increased',
      detail: `Pain increased from ${input.painBefore}/10 to ${input.painNextDay}/10 after the session.`,
      acknowledged: false,
    });
  }

  if (input.readinessHistory && input.readinessHistory.length >= 3) {
    const lastThree = input.readinessHistory.slice(-3);
    if (lastThree.every((value) => value <= 4)) {
      alerts.push({
        id: `readiness-${now}`,
        athleteId: 'current',
        createdAt: now,
        severity: 'review',
        category: 'readiness',
        title: 'Readiness remains low',
        detail: 'Readiness has been low for three consecutive entries and should be reviewed before progressing load.',
        acknowledged: false,
      });
    }
  }

  if (input.previousWeeklyVolume != null && input.currentWeeklyVolume != null && input.previousWeeklyVolume > 0) {
    const change = workloadChangePercent(input.previousWeeklyVolume, input.currentWeeklyVolume);
    if (change >= 30) {
      alerts.push({
        id: `workload-${now}`,
        athleteId: 'current',
        createdAt: now,
        severity: 'review',
        category: 'workload',
        title: 'Large workload increase',
        detail: `Weekly training volume increased by ${change}%. This is a review signal, not an injury prediction.`,
        acknowledged: false,
      });
    }
  }

  return alerts;
}
