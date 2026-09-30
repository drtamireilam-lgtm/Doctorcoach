import React, { useEffect, useState } from 'react';
import TrainingWorkspace from './TrainingWorkspace';
import { AthleteProfile } from './domain';
import { AuthUser, can } from './platform/auth';
import { BrowserStorageStore, VersionedRepository } from './platform/persistence';
import { DoctorCoachState, activateProgramVersion, createProgramVersion, emptyDoctorCoachState } from './platform/clinical-data';

const repo = new VersionedRepository<DoctorCoachState>(new BrowserStorageStore(), 'clinical-state', 1);

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

  useEffect(() => { repo.load().then((saved) => { if (saved) setState(saved); setLoaded(true); }); }, []);
  useEffect(() => { if (loaded) repo.save(state); }, [loaded, state]);

  const createVersion = () => {
    if (!canAssign) return;
    const version = createProgramVersion({ programId, athleteId: profile.id, createdBy: user.id, existing: state.programVersions, reason });
    setState((s) => ({ ...s, programVersions: [...s.programVersions, version] }));
  };

  const activate = (id: string) => {
    if (!canAssign) return;
    setState((s) => activateProgramVersion(s, id));
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
    <TrainingWorkspace profile={profile} setProfile={setProfile} />
  </>;
}
