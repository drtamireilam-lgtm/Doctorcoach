import React, { useEffect, useState } from 'react';
import TrainingWorkspace from './TrainingWorkspace';
import TrainingVideoReview from './TrainingVideoReview';
import { AthleteProfile, hasRedFlags } from './domain';
import { AuthUser, can } from './platform/auth';
import { BrowserStorageStore, VersionedRepository } from './platform/persistence';
import {
  DoctorCoachState,
  activateProgramVersion,
  appendTimelineEvent,
  createProgramVersion,
  emptyDoctorCoachState,
  normalizeDoctorCoachState,
} from './platform/clinical-data';

const repo = new VersionedRepository<DoctorCoachState>(new BrowserStorageStore(), 'clinical-state', 1);

function eventId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function TrainingIntegrated({ profile, setProfile, user }: {
  profile: AthleteProfile;
  setProfile: React.Dispatch<React.SetStateAction<AthleteProfile>>;
  user: AuthUser;
}) {
  const [state, setState] = useState<DoctorCoachState>(emptyDoctorCoachState);
  const [loaded, setLoaded] = useState(false);
  const [reason, setReason] = useState('Program adjustment');
  const canAssign = can(user, 'training:assign') || can(user, 'admin:manage');
  const programId = profile.assignedPlanId || 'nadav-demo-a';
  const versions = state.programVersions.filter((v) => v.programId === programId).sort((a, b) => b.version - a.version);
  const clearance = state.medicalClearance;
  const medicalHold = clearance.status === 'hold' || (hasRedFlags(profile.intake) && clearance.status === 'pending-review');
  const restrictions = clearance.restrictions || profile.intake.restrictions;

  useEffect(() => {
    repo.load().then((saved) => {
      setState(normalizeDoctorCoachState(saved));
      setLoaded(true);
    });
  }, []);
  useEffect(() => { if (loaded) repo.save(state); }, [loaded, state]);

  const createVersion = () => {
    if (!canAssign) return;
    const version = createProgramVersion({ programId, athleteId: profile.id, createdBy: user.id, existing: state.programVersions, reason });
    setState((s) => appendTimelineEvent({ ...s, programVersions: [...s.programVersions, version] }, {
      id: eventId('program-version'), athleteId: profile.id, occurredAt: version.createdAt, type: 'program-version', title: `Program version v${version.version} created`, detail: reason || 'Program adjustment', source: 'training', entityId: version.id,
    }));
  };

  const activate = (id: string) => {
    if (!canAssign) return;
    const target = state.programVersions.find((version) => version.id === id);
    setState((s) => appendTimelineEvent(activateProgramVersion(s, id), {
      id: eventId('program-activate'), athleteId: profile.id, occurredAt: new Date().toISOString(), type: 'program-version', title: `Program ${target ? `v${target.version}` : 'version'} activated`, detail: target?.reason || 'Coach activated a program version.', source: 'training', entityId: id,
    }));
  };

  const recordWorkoutEvent = (title: string, detail: string) => {
    setState((s) => appendTimelineEvent(s, {
      id: eventId('workout'), athleteId: profile.id, occurredAt: new Date().toISOString(), type: 'workout-completed', title, detail, source: 'training',
    }));
  };

  return <>
    <section className="card version-panel">
      <div><p className="eyebrow">PROGRAM VERSIONING</p><h3>Plan history</h3><small>Changes create a version instead of overwriting the previous program.</small></div>
      <div className="version-actions">
        <input value={reason} disabled={!canAssign} onChange={(e) => setReason(e.target.value)} placeholder="Reason for new version" />
        <button className="outline-button" disabled={!canAssign} onClick={createVersion}>Create draft version</button>
      </div>
      {!canAssign && <small className="muted">Current role may execute/log training but cannot create or activate coach program versions.</small>}
      <div className="version-list">{versions.length === 0 ? <span className="muted">No saved versions yet.</span> : versions.map((version) => <div key={version.id} className="version-row"><span><strong>v{version.version}</strong> · {version.status}<small>{version.reason || 'No reason'} · {new Date(version.createdAt).toLocaleString()}</small></span>{version.status !== 'active' && <button className="ghost-button" disabled={!canAssign} onClick={() => activate(version.id)}>Activate</button>}</div>)}</div>
    </section>

    <section className="card">
      <p className="eyebrow">MEDICAL CONTEXT</p>
      <h3>{clearance.status}</h3>
      <p>{restrictions || 'No medical restrictions recorded.'}</p>
      {clearance.reviewedAt && <small>Reviewed {new Date(clearance.reviewedAt).toLocaleString()} by {clearance.reviewerName || 'medical reviewer'}</small>}
    </section>

    {medicalHold && <section className="alert">Medical review is required before injury-specific training guidance or workout logging can continue.</section>}
    <TrainingWorkspace profile={profile} setProfile={setProfile} user={user} medicalHold={medicalHold} restrictions={restrictions} onWorkoutEvent={recordWorkoutEvent} />
    <TrainingVideoReview profile={profile} user={user} />
  </>;
}
