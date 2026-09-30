import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import TrainingWorkspace from './TrainingWorkspace';
import IntegratedCareWorkspace from './IntegratedCareWorkspace';
import { AthleteProfile, Section, bodyRegions, hasRedFlags, initialIntake } from './domain';
import { AuthUser } from './platform/auth';
import { BrowserStorageStore, VersionedRepository } from './platform/persistence';

const sections: Array<{ id: Section; label: string; subtitle: string }> = [
  { id: 'home', label: 'Dashboard', subtitle: 'Your care and performance hub' },
  { id: 'medical', label: 'Medical', subtitle: 'Assessment, clearance and safety review' },
  { id: 'training', label: 'Training', subtitle: 'Coach-assigned plan, RPE / RIR and e1RM' },
  { id: 'nutrition', label: 'Nutrition', subtitle: 'Plan, adherence and dietitian follow-up' },
  { id: 'progress', label: 'Progress', subtitle: 'Timeline, outcomes, pain and readiness' },
  { id: 'education', label: 'Anatomy & Learn', subtitle: 'Body map, anatomy and injury education' },
  { id: 'team', label: 'Team', subtitle: 'Medical, training and nutrition professionals' },
];

const initialProfile: AthleteProfile = { id: 'demo-athlete', intake: initialIntake, trainingMode: 'RPE', assignedPlanId: 'nadav-demo-a' };
const profileRepo = new VersionedRepository<AthleteProfile>(new BrowserStorageStore(), 'athlete-profile', 1);

const demoUsers: Record<string, AuthUser> = {
  trainee: { id: 'demo-trainee', email: 'trainee@doctorcoach.demo', displayName: 'Demo Trainee', roles: ['trainee'], athleteId: 'demo-athlete' },
  coach: { id: 'demo-coach', email: 'coach@doctorcoach.demo', displayName: 'Nadav · Coach Demo', roles: ['coach'] },
  medical: { id: 'demo-medical', email: 'medical@doctorcoach.demo', displayName: 'Tamir · Medical Demo', roles: ['medical'] },
  dietitian: { id: 'demo-dietitian', email: 'nutrition@doctorcoach.demo', displayName: 'Lior · Dietitian Demo', roles: ['dietitian'] },
  admin: { id: 'demo-admin', email: 'admin@doctorcoach.demo', displayName: 'Admin Demo', roles: ['admin'], athleteId: 'demo-athlete' },
};

function App() {
  const [section, setSection] = useState<Section>('home');
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<AthleteProfile>(initialProfile);
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<AuthUser>(demoUsers.admin);
  const redFlags = hasRedFlags(profile.intake);
  const active = useMemo(() => sections.find((item) => item.id === section)!, [section]);

  useEffect(() => { profileRepo.load().then((saved) => { if (saved) setProfile(saved); setLoaded(true); }); }, []);
  useEffect(() => { if (loaded) profileRepo.save(profile); }, [loaded, profile]);

  const updateIntake = (patch: Partial<AthleteProfile['intake']>) => setProfile((p) => ({ ...p, intake: { ...p.intake, ...patch } }));
  const selectBodyRegion = (region: string) => setProfile((p) => ({ ...p, selectedBodyRegion: region, intake: { ...p.intake, injuryRegion: region } }));

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">DC</div><div><strong>DoctorCoach</strong><span>Medicine × Training × Nutrition</span></div></div>
      <nav>{sections.map((item) => <button key={item.id} className={section === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setSection(item.id)}><span>{item.label}</span><small>{item.subtitle}</small></button>)}</nav>
      <div className="role-box"><small>Demo role</small><select value={user.roles[0]} onChange={(e) => setUser(demoUsers[e.target.value])}>{Object.keys(demoUsers).map((role) => <option key={role} value={role}>{role}</option>)}</select><span>{user.displayName}</span></div>
      <div className="sidebar-footer"><span className="status-dot" /> Local persisted demo state</div>
    </aside>

    <main className="main-panel">
      <header className="topbar"><div><p className="eyebrow">DOCTORCOACH</p><h1>{active.label}</h1><p>{active.subtitle}</p></div><button className="outline-button" onClick={() => { setShowOnboarding(true); setStep(0); }}>Run onboarding</button></header>
      {section === 'home' && <Dashboard redFlags={redFlags} profile={profile} onGo={setSection} user={user} />}
      {section === 'medical' && <IntegratedCareWorkspace mode="medical" profile={profile} user={user} updateProfile={setProfile} />}
      {section === 'training' && <TrainingWorkspace profile={profile} setProfile={setProfile} />}
      {section === 'nutrition' && <Module title="Nutrition" text="Dietitian-led planning connected to the shared athlete profile." items={['Nutrition assessment', 'Calories/macros or flexible principles', 'Training-day vs rest-day plan', 'Daily adherence check-in', 'Weekly dietitian check-in']} />}
      {section === 'progress' && <IntegratedCareWorkspace mode="progress" profile={profile} user={user} updateProfile={setProfile} />}
      {section === 'education' && <Education profile={profile} selectBodyRegion={selectBodyRegion} />}
      {section === 'team' && <Module title="Meet the Team" text="Coordinated care with discipline-specific permissions and a shared longitudinal picture." items={['Tamir Eilam · Medical', 'Nadav Ron · Training', 'Lior Zelikson · Nutrition', 'Internal notes and mentions', 'Appointments and support']} />}
    </main>

    {showOnboarding && <Onboarding profile={profile} setProfile={setProfile} step={step} setStep={setStep} close={() => setShowOnboarding(false)} complete={() => { setShowOnboarding(false); setSection(hasRedFlags(profile.intake) ? 'medical' : 'home'); }} />}
  </div>;
}

function Onboarding({ profile, setProfile, step, setStep, close, complete }: { profile: AthleteProfile; setProfile: React.Dispatch<React.SetStateAction<AthleteProfile>>; step: number; setStep: React.Dispatch<React.SetStateAction<number>>; close: () => void; complete: () => void }) {
  const intake = profile.intake;
  const update = (patch: Partial<typeof intake>) => setProfile((p) => ({ ...p, intake: { ...p.intake, ...patch } }));
  const redFlags = hasRedFlags(intake);
  const next = () => setStep((v) => Math.min(v + 1, 4));
  const back = () => setStep((v) => Math.max(v - 1, 0));
  return <div className="modal-backdrop"><div className="modal-card"><div className="step-line"><span style={{ width: `${(step + 1) * 20}%` }} /></div>
    {step === 0 && <><p className="eyebrow">WELCOME</p><h2>One profile. One coordinated plan.</h2><p>DoctorCoach connects medical assessment, injury-aware training, nutrition and progress tracking under one shared athlete profile.</p></>}
    {step === 1 && <><p className="eyebrow">INJURY INTAKE</p><h2>Do you currently have an injury?</h2><div className="choice-row"><button className={intake.injured === true ? 'choice selected' : 'choice'} onClick={() => update({ injured: true })}>Yes</button><button className={intake.injured === false ? 'choice selected' : 'choice'} onClick={() => update({ injured: false })}>No</button></div>{intake.injured && <div className="form-grid"><select value={intake.injuryRegion} onChange={(e) => update({ injuryRegion: e.target.value })}><option value="">Body region</option>{bodyRegions.map((r) => <option key={r}>{r}</option>)}</select><select value={intake.side} onChange={(e) => update({ side: e.target.value as any })}><option value="">Side</option><option value="left">Left</option><option value="right">Right</option><option value="central">Central</option></select><input placeholder="When did it start?" value={intake.onset} onChange={(e) => update({ onset: e.target.value })} /><input placeholder="Mechanism / what happened?" value={intake.mechanism} onChange={(e) => update({ mechanism: e.target.value })} /><RangeInput label="Current pain" value={intake.painNow} setValue={(value) => update({ painNow: value })} /><RangeInput label="Worst pain" value={intake.painWorst} setValue={(value) => update({ painWorst: value })} /></div>}</>}
    {step === 2 && <><p className="eyebrow">RED FLAGS</p><h2>Safety screening</h2><div className="check-list">{[['numbnessWeakness','New or rapidly worsening numbness / weakness'],['bowelBladderChange','New bowel or bladder dysfunction / saddle symptoms'],['majorTrauma','Major trauma or suspected fracture'],['chestPainSyncope','Chest pain, fainting or unexplained shortness of breath'],['feverUnexplainedSymptoms','Fever, unexplained weight loss or severe systemic symptoms'],['unableToBearWeight','Unable to bear weight or use the affected limb']].map(([key,label]) => <label className="check-card" key={key}><input type="checkbox" checked={Boolean(intake[key as keyof typeof intake])} onChange={(e) => update({ [key]: e.target.checked } as any)} /><span>{label}</span></label>)}</div>{redFlags && <div className="alert">Medical Review required before injury-specific automated guidance.</div>}</>}
    {step === 3 && <><p className="eyebrow">SHARED PROFILE</p><h2>Build the team intake</h2><div className="form-grid"><input placeholder="Age" value={intake.age} onChange={(e) => update({ age: e.target.value })} /><input placeholder="Training frequency" value={intake.frequency} onChange={(e) => update({ frequency: e.target.value })} /><input placeholder="Training style / discipline" value={intake.style} onChange={(e) => update({ style: e.target.value })} /><input placeholder="Primary goals" value={intake.goals} onChange={(e) => update({ goals: e.target.value })} /><textarea placeholder="Relevant medical history" value={intake.medicalHistory} onChange={(e) => update({ medicalHistory: e.target.value })} /><textarea placeholder="Current medications" value={intake.medications} onChange={(e) => update({ medications: e.target.value })} /><textarea placeholder="Prior injuries / surgeries" value={intake.priorInjuries} onChange={(e) => update({ priorInjuries: e.target.value })} /><textarea placeholder="Restrictions from physician / physiotherapist" value={intake.restrictions} onChange={(e) => update({ restrictions: e.target.value })} /></div></>}
    {step === 4 && <><p className="eyebrow">READY</p><h2>Your DoctorCoach profile is connected.</h2><div className="timeline"><div><b>1</b><span>Medical review controls safety and clearance.</span></div><div><b>2</b><span>Training records readiness, pain, sets and e1RM.</span></div><div><b>3</b><span>Progress collects outcomes and timeline events.</span></div></div></>}
    <div className="modal-actions"><button className="ghost-button" onClick={step === 0 ? close : back}>{step === 0 ? 'Skip for now' : 'Back'}</button>{step < 4 ? <button className="primary-button" onClick={next}>Continue</button> : <button className="primary-button" onClick={complete}>Enter DoctorCoach</button>}</div>
  </div></div>;
}

function Dashboard({ redFlags, profile, onGo, user }: { redFlags: boolean; profile: AthleteProfile; onGo: (s: Section) => void; user: AuthUser }) {
  return <div className="content-grid"><section className="hero-card"><p className="eyebrow">TODAY</p><h2>Your plan adapts to injury, performance and recovery.</h2><p>Profile data now persists locally in the MVP and is connected to medical clearance, readiness, pain, outcomes and timeline events.</p><div className="hero-actions"><button className="primary-button" onClick={() => onGo(redFlags ? 'medical' : 'training')}>{redFlags ? 'Open medical review' : 'Open today’s workout'}</button><button className="outline-button" onClick={() => onGo('progress')}>View timeline</button></div></section><section className="card"><h3>Signed-in demo role</h3><p>{user.displayName}</p><small>Role permissions are enforced in the integrated medical workflow.</small></section><section className="card"><h3>Profile status</h3><p>{profile.intake.injured ? `Injury: ${profile.intake.injuryRegion || 'region not selected'}` : 'No current injury recorded'}</p><p>{redFlags ? '⚠ Medical review required' : '✓ No red flags recorded'}</p></section></div>;
}

function Education({ profile, selectBodyRegion }: { profile: AthleteProfile; selectBodyRegion: (region: string) => void }) {
  return <div className="content-grid"><section className="module-card body-map-card"><p className="eyebrow">BODY MAP</p><h2>Select a region</h2><div className="body-map"><div className="silhouette">◯<div>│</div><div>╱│╲</div><div>│</div><div>╱ ╲</div></div><div className="region-list">{bodyRegions.map((r) => <button key={r} className={profile.selectedBodyRegion === r ? 'region-button selected' : 'region-button'} onClick={() => selectBodyRegion(r)}>{r}</button>)}</div></div>{profile.selectedBodyRegion && <div className="selected-panel"><strong>{profile.selectedBodyRegion}</strong><span>Linked to the shared injury profile.</span></div>}</section></div>;
}

function RangeInput({ label, value, setValue }: { label: string; value: number; setValue: (value: number) => void }) { return <label>{label} 0–10<input type="range" min="0" max="10" value={value} onChange={(e) => setValue(Number(e.target.value))} /><b>{value}/10</b></label>; }
function Module({ title, text, items }: { title: string; text: string; items: string[] }) { return <section className="module-card"><p className="eyebrow">MODULE</p><h2>{title}</h2><p>{text}</p><div className="feature-grid">{items.map((item) => <Mini key={item} title={item} text="DoctorCoach roadmap" />)}</div></section>; }
function Mini({ title, text }: { title: string; text: string }) { return <div className="mini-card"><strong>{title}</strong><span>{text}</span></div>; }

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
