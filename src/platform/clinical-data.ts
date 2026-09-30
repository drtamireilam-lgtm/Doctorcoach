import {
  ClientTimelineEvent,
  OutcomeMeasure,
  PainResponseEntry,
  ProgramVersion,
  ReadinessEntry,
} from '../advanced-domain';

export type MedicalClearanceStatus = 'pending-review' | 'cleared' | 'cleared-with-restrictions' | 'hold';

export type MedicalClearance = {
  status: MedicalClearanceStatus;
  reviewerId?: string;
  reviewerName?: string;
  reviewedAt?: string;
  restrictions: string;
  notes: string;
};

export type DoctorCoachState = {
  timeline: ClientTimelineEvent[];
  programVersions: ProgramVersion[];
  readiness: ReadinessEntry[];
  painResponses: PainResponseEntry[];
  outcomes: OutcomeMeasure[];
  medicalClearance: MedicalClearance;
};

export const emptyMedicalClearance: MedicalClearance = {
  status: 'pending-review',
  restrictions: '',
  notes: '',
};

export const emptyDoctorCoachState: DoctorCoachState = {
  timeline: [],
  programVersions: [],
  readiness: [],
  painResponses: [],
  outcomes: [],
  medicalClearance: emptyMedicalClearance,
};

export function normalizeDoctorCoachState(state?: Partial<DoctorCoachState> | null): DoctorCoachState {
  return {
    timeline: state?.timeline ?? [],
    programVersions: state?.programVersions ?? [],
    readiness: state?.readiness ?? [],
    painResponses: state?.painResponses ?? [],
    outcomes: state?.outcomes ?? [],
    medicalClearance: {
      ...emptyMedicalClearance,
      ...(state?.medicalClearance ?? {}),
    },
  };
}

export function appendTimelineEvent(state: DoctorCoachState, event: ClientTimelineEvent): DoctorCoachState {
  return {
    ...state,
    timeline: [...state.timeline, event].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
  };
}

export function updateMedicalClearance(
  state: DoctorCoachState,
  clearance: MedicalClearance,
  athleteId: string,
): DoctorCoachState {
  const reviewedAt = clearance.reviewedAt ?? new Date().toISOString();
  const next = { ...clearance, reviewedAt };
  return appendTimelineEvent(
    { ...state, medicalClearance: next },
    {
      id: `medical-clearance-${Date.now()}`,
      athleteId,
      occurredAt: reviewedAt,
      type: 'medical-review',
      title: 'Medical clearance updated',
      detail: `${next.status}${next.restrictions ? ` · Restrictions: ${next.restrictions}` : ''}`,
      source: 'medical',
    },
  );
}

export function addReadiness(state: DoctorCoachState, entry: ReadinessEntry): DoctorCoachState {
  return { ...state, readiness: [...state.readiness, entry] };
}

export function addPainResponse(state: DoctorCoachState, entry: PainResponseEntry): DoctorCoachState {
  return { ...state, painResponses: [...state.painResponses, entry] };
}

export function addOutcomeMeasure(state: DoctorCoachState, entry: OutcomeMeasure): DoctorCoachState {
  return { ...state, outcomes: [...state.outcomes, entry] };
}

export function createProgramVersion(input: {
  programId: string;
  athleteId: string;
  createdBy: string;
  existing: ProgramVersion[];
  reason?: string;
}): ProgramVersion {
  const previous = input.existing
    .filter((item) => item.programId === input.programId)
    .sort((a, b) => b.version - a.version)[0];

  return {
    id: `${input.programId}-v${(previous?.version ?? 0) + 1}-${Date.now()}`,
    programId: input.programId,
    athleteId: input.athleteId,
    version: (previous?.version ?? 0) + 1,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    reason: input.reason,
    status: 'draft',
    previousVersionId: previous?.id,
  };
}

export function activateProgramVersion(state: DoctorCoachState, versionId: string): DoctorCoachState {
  const target = state.programVersions.find((item) => item.id === versionId);
  if (!target) return state;

  return {
    ...state,
    programVersions: state.programVersions.map((item) => {
      if (item.programId !== target.programId) return item;
      if (item.id === versionId) return { ...item, status: 'active' as const };
      if (item.status === 'active') return { ...item, status: 'archived' as const };
      return item;
    }),
  };
}

export function readinessScore(entry: ReadinessEntry): number {
  const sleep = Math.max(0, Math.min(10, entry.sleep));
  const fatigueRecovery = 10 - Math.max(0, Math.min(10, entry.fatigue));
  const painRecovery = 10 - Math.max(0, Math.min(10, entry.pain));
  const stressRecovery = entry.stress == null ? 5 : 10 - Math.max(0, Math.min(10, entry.stress));
  return Math.round(((sleep + fatigueRecovery + painRecovery + stressRecovery) / 40) * 100);
}

export function outcomeTrend(entries: OutcomeMeasure[], instrument: OutcomeMeasure['instrument']): number | null {
  const sorted = entries
    .filter((item) => item.instrument === instrument)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  if (sorted.length < 2) return null;
  return Math.round((sorted[sorted.length - 1].score - sorted[0].score) * 10) / 10;
}
