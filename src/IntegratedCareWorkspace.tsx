import React, { useEffect, useState } from 'react';
import { OutcomeInstrument } from './advanced-domain';
import { AthleteProfile, hasRedFlags } from './domain';
import { AuthUser, can } from './platform/auth';
import {
  DoctorCoachState,
  MedicalClearanceStatus,
  addOutcomeMeasure,
  addPainResponse,
  addReadiness,
  appendTimelineEvent,
  emptyDoctorCoachState,
  normalizeDoctorCoachState,
  outcomeTrend,
  readinessScore,
  updateMedicalClearance,
} from './platform/clinical-data';
import { BrowserStorageStore, VersionedRepository } from './platform/persistence';

type Props = {
  mode: 'medical' | 'progress';
  profile: AthleteProfile;
  user: AuthUser;
  updateProfile: (profile: AthleteProfile) => void;
};

const stateRepo = new VersionedRepository<DoctorCoachState>(new BrowserStorageStore(), 'clinical-state', 1);

function nowId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function IntegratedCareWorkspace({ mode, profile, user, updateProfile }: Props) {
  const [state, setState] = useState<DoctorCoachState>(emptyDoctorCoachState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    stateRepo.load().then((savedState) => {
      setState(normalizeDoctorCoachState(savedState));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    stateRepo.save(state);
  }, [loaded, state]);

  if (mode === 'medical') {
    return <MedicalIntegration profile={profile} user={user} state={state} setState={setState} updateProfile={updateProfile} />;
  }

  return <ProgressIntegration profile={profile} state={state} />;
}

function MedicalIntegration({ profile, user, state, setState, updateProfile }: {
  profile: AthleteProfile;
  user: AuthUser;
  state: DoctorCoachState;
  setState: React.Dispatch<React.SetStateAction<DoctorCoachState>>;
  updateProfile: (profile: AthleteProfile) => void;
}) {
  const [sleep, setSleep] = useState(7);
  const [fatigue, setFatigue] = useState(4);
  const [pain, setPain] = useState(profile.intake.painNow || 0);
  const [stress, setStress] = useState(4);
  const [painTiming, setPainTiming] = useState<'before' | 'during' | 'immediately-after' | 'next-day'>('before');
  const [outcomeInstrument, setOutcomeInstrument] = useState<OutcomeInstrument>('PSFS');
  const [outcomeScore, setOutcomeScore] = useState(0);
  const [clearanceNotes, setClearanceNotes] = useState(state.medicalClearance.notes);
  const [clearanceRestrictions, setClearanceRestrictions] = useState(state.medicalClearance.restrictions || profile.intake.restrictions);
  const redFlags = hasRedFlags(profile.intake);
  const medicalWrite = can(user, 'medical:write') || can(user, 'admin:manage');

  useEffect(() => {
    setClearanceNotes(state.medicalClearance.notes);
    setClearanceRestrictions(state.medicalClearance.restrictions || profile.intake.restrictions);
  }, [state.medicalClearance.notes, state.medicalClearance.restrictions, profile.intake.restrictions]);

  const recordTimeline = (title: string, detail: string, source: 'medical' | 'training' | 'rehab' | 'nutrition' | 'system' = 'system') => {
    setState((s) => appendTimelineEvent(s, {
      id: nowId('timeline'), athleteId: profile.id, occurredAt: new Date().toISOString(), type: title.includes('clearance') ? 'medical-review' : 'restriction-updated', title, detail, source,
    }));
  };

  const setMedicalClearance = (status: MedicalClearanceStatus) => {
    if (!medicalWrite) return;
    const reviewedAt = new Date().toISOString();
    setState((s) => updateMedicalClearance(s, {
      status,
      reviewerId: user.id,
      reviewerName: user.displayName,
      reviewedAt,
      restrictions: clearanceRestrictions,
      notes: clearanceNotes,
    }, profile.id));
    updateProfile({ ...profile, intake: { ...profile.intake, restrictions: clearanceRestrictions } });
  };

  const saveReadiness = () => {
    const entry = { id: nowId('readiness'), athleteId: profile.id, recordedAt: new Date().toISOString(), sleep, fatigue, pain, stress };
    setState((s) => appendTimelineEvent(addReadiness(s, entry), {
      id: nowId('timeline'), athleteId: profile.id, occurredAt: entry.recordedAt, type: 'workout-completed', title: 'Readiness check recorded', detail: `Readiness ${readinessScore(entry)}% · pain ${pain}/10`, source: 'training',
    }));
  };

  const savePain = () => {
    const recordedAt = new Date().toISOString();
    setState((s) => appendTimelineEvent(addPainResponse(s, { id: nowId('pain'), athleteId: profile.id, recordedAt, timing: painTiming, pain }), {
      id: nowId('timeline'), athleteId: profile.id, occurredAt: recordedAt, type: painTiming === 'next-day' ? 'pain-flare' : 'workout-completed', title: `Pain recorded · ${painTiming}`, detail: `${pain}/10`, source: 'rehab',
    }));
  };

  const saveOutcome = () => {
    const recordedAt = new Date().toISOString();
    setState((s) => addOutcomeMeasure(s, { id: nowId('outcome'), athleteId: profile.id, instrument: outcomeInstrument, score: outcomeScore, recordedAt }));
  };

  const clearance = state.medicalClearance;
  const trainingBlocked = clearance.status === 'hold' || (redFlags && clearance.status === 'pending-review');

  return <div className="content-grid">
    <section className="module-card">
      <p className="eyebrow">INTEGRATED MEDICAL WORKFLOW</p>
      <h2>Medical clearance + shared restrictions</h2>
      <div className="summary-grid">
        <Summary label="Red flags" value={redFlags ? 'Positive' : 'None recorded'} />
        <Summary label="Clearance" value={clearance.status} />
        <Summary label="Region" value={profile.intake.injuryRegion || 'Not selected'} />
        <Summary label="Pain" value={`${profile.intake.painNow}/10`} />
      </div>
      {redFlags && <div className="alert">Red-flag answers are present. Injury-specific automated guidance remains blocked while clearance is pending review or on hold.</div>}
      {trainingBlocked && <div className="alert">Training guidance is currently on medical hold.</div>}
      <div className="clearance-row">
        {(['pending-review', 'cleared', 'cleared-with-restrictions', 'hold'] as MedicalClearanceStatus[]).map((item) => <button key={item} className={clearance.status === item ? 'choice selected' : 'choice'} disabled={!medicalWrite} onClick={() => setMedicalClearance(item)}>{item}</button>)}
      </div>
      {!medicalWrite && <small className="muted">Your current role can view this status but cannot change medical clearance.</small>}
      <label className="stacked-label">Shared medical restrictions<textarea className="wide-textarea" value={clearanceRestrictions} disabled={!medicalWrite} placeholder="Restrictions that must be visible to rehabilitation and training" onChange={(e) => setClearanceRestrictions(e.target.value)} /></label>
      <label className="stacked-label">Medical review notes<textarea className="wide-textarea" value={clearanceNotes} disabled={!medicalWrite} placeholder="Clinical review note / rationale" onChange={(e) => setClearanceNotes(e.target.value)} /></label>
      <div className="builder-save"><button className="primary-button" disabled={!medicalWrite} onClick={() => setMedicalClearance(clearance.status)}>Save medical review</button><small>{clearance.reviewedAt ? `Last reviewed ${new Date(clearance.reviewedAt).toLocaleString()} by ${clearance.reviewerName || clearance.reviewerId || 'medical reviewer'}` : 'No completed medical review yet.'}</small></div>
    </section>

    <section className="card">
      <h3>Pre-session readiness</h3>
      <div className="metric-inputs">
        <Range label="Sleep" value={sleep} setValue={setSleep} />
        <Range label="Fatigue" value={fatigue} setValue={setFatigue} />
        <Range label="Pain" value={pain} setValue={setPain} />
        <Range label="Stress" value={stress} setValue={setStress} />
      </div>
      <button className="primary-button" onClick={saveReadiness}>Save readiness</button>
    </section>

    <section className="card">
      <h3>Pain response</h3>
      <select value={painTiming} onChange={(e) => setPainTiming(e.target.value as typeof painTiming)}><option value="before">Before</option><option value="during">During</option><option value="immediately-after">Immediately after</option><option value="next-day">Next day</option></select>
      <Range label="Pain" value={pain} setValue={setPain} />
      <button className="outline-button" onClick={savePain}>Record pain</button>
    </section>

    <section className="card">
      <h3>Outcome measure</h3>
      <select value={outcomeInstrument} onChange={(e) => setOutcomeInstrument(e.target.value as OutcomeInstrument)}>{['ODI', 'NDI', 'QuickDASH', 'LEFS', 'PSFS', 'Custom'].map((x) => <option key={x}>{x}</option>)}</select>
      <label className="stacked-label">Score<input type="number" value={outcomeScore} onChange={(e) => setOutcomeScore(Number(e.target.value))} /></label>
      <button className="outline-button" onClick={saveOutcome}>Save recorded score</button>
      <small className="muted">Use the licensed/validated instrument and scoring method where required. DoctorCoach stores the entered result; it does not replace the instrument instructions.</small>
    </section>
  </div>;
}

function ProgressIntegration({ profile, state }: { profile: AthleteProfile; state: DoctorCoachState }) {
  const latestReadiness = state.readiness[state.readiness.length - 1];
  const latestPain = state.painResponses[state.painResponses.length - 1];
  const psfsTrend = outcomeTrend(state.outcomes, 'PSFS');

  return <div className="content-grid">
    <section className="hero-card">
      <p className="eyebrow">CLIENT TIMELINE</p>
      <h2>One longitudinal clinical + performance history.</h2>
      <p>{state.timeline.length ? `${state.timeline.length} timeline events connected to ${profile.id}.` : 'No timeline events yet. Complete readiness, pain, outcome or medical actions to build the timeline.'}</p>
    </section>

    <section className="card"><h3>Medical clearance</h3><strong className="big-number">{state.medicalClearance.status}</strong><small>{state.medicalClearance.restrictions || 'No restrictions recorded'}</small></section>
    <section className="card"><h3>Latest readiness</h3><strong className="big-number">{latestReadiness ? `${readinessScore(latestReadiness)}%` : '—'}</strong><small>{latestReadiness ? `Sleep ${latestReadiness.sleep}/10 · Fatigue ${latestReadiness.fatigue}/10` : 'No entry yet'}</small></section>
    <section className="card"><h3>Latest pain response</h3><strong className="big-number">{latestPain ? `${latestPain.pain}/10` : '—'}</strong><small>{latestPain ? latestPain.timing : 'No entry yet'}</small></section>
    <section className="card"><h3>PSFS trend</h3><strong className="big-number">{psfsTrend == null ? '—' : `${psfsTrend > 0 ? '+' : ''}${psfsTrend}`}</strong><small>Difference between first and latest PSFS entry</small></section>

    <section className="module-card"><p className="eyebrow">TIMELINE</p><h2>Recent events</h2><div className="timeline-list">{state.timeline.length === 0 ? <div className="empty-state">No events yet.</div> : state.timeline.slice(0, 12).map((event) => <div className="timeline-event" key={event.id}><div><strong>{event.title}</strong><span>{event.detail}</span></div><small>{new Date(event.occurredAt).toLocaleString()}</small></div>)}</div></section>
  </div>;
}

function Range({ label, value, setValue }: { label: string; value: number; setValue: (value: number) => void }) {
  return <label className="range-row"><span>{label}</span><input type="range" min="0" max="10" value={value} onChange={(e) => setValue(Number(e.target.value))} /><b>{value}/10</b></label>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="mini-card"><span>{label}</span><strong>{value}</strong></div>;
}
