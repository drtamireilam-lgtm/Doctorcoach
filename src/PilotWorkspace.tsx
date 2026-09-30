import React, { useEffect, useMemo, useState } from 'react';
import { AthleteProfile } from './domain';
import { AuthUser, can } from './platform/auth';
import { BrowserStorageStore, VersionedRepository } from './platform/persistence';
import { productionReady, runtimeConfig } from './platform/runtime-config';

type PilotParticipant = {
  id: string;
  athleteId: string;
  label: string;
  consentVersion: string;
  consentAcceptedAt?: string;
  onboardingVersion: string;
  enabled: boolean;
  createdAt: string;
};

type FeedbackItem = {
  id: string;
  athleteId: string;
  createdAt: string;
  category: 'bug' | 'confusing' | 'feature' | 'content';
  text: string;
  status: 'open' | 'reviewing' | 'resolved';
};

type PilotState = {
  participants: PilotParticipant[];
  feedback: FeedbackItem[];
  featureFlags: Record<string, boolean>;
};

const initialState: PilotState = {
  participants: [],
  feedback: [],
  featureFlags: {
    videoReview: true,
    nutrition: true,
    appointments: true,
    selfProgramming: false,
    experimentalScore: false,
  },
};

const repo = new VersionedRepository<PilotState>(new BrowserStorageStore(), 'pilot-state', 1);
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function PilotWorkspace({ profile, user }: { profile: AthleteProfile; user: AuthUser }) {
  const [state, setState] = useState<PilotState>(initialState);
  const [loaded, setLoaded] = useState(false);
  const [participantLabel, setParticipantLabel] = useState('Pilot athlete');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackItem['category']>('bug');
  const admin = can(user, 'admin:manage');

  useEffect(() => { repo.load().then((saved) => { if (saved) setState(saved); setLoaded(true); }); }, []);
  useEffect(() => { if (loaded) repo.save(state); }, [loaded, state]);

  const activeCount = useMemo(() => state.participants.filter((p) => p.enabled).length, [state.participants]);
  const current = state.participants.find((p) => p.athleteId === profile.id);
  const ready = productionReady();

  const addParticipant = () => {
    if (!admin || activeCount >= runtimeConfig.pilotMaxUsers || current) return;
    setState((s) => ({
      ...s,
      participants: [...s.participants, {
        id: id('pilot'),
        athleteId: profile.id,
        label: participantLabel,
        consentVersion: 'pilot-consent-v1',
        onboardingVersion: 'onboarding-v1',
        enabled: true,
        createdAt: new Date().toISOString(),
      }],
    }));
  };

  const acceptConsent = () => {
    setState((s) => ({ ...s, participants: s.participants.map((p) => p.athleteId === profile.id ? { ...p, consentAcceptedAt: new Date().toISOString() } : p) }));
  };

  const addFeedback = () => {
    const text = feedbackText.trim();
    if (!text) return;
    setState((s) => ({ ...s, feedback: [{ id: id('feedback'), athleteId: profile.id, createdAt: new Date().toISOString(), category: feedbackCategory, text, status: 'open' }, ...s.feedback] }));
    setFeedbackText('');
  };

  return <div className="content-grid">
    <section className="hero-card"><p className="eyebrow">PILOT MODE</p><h2>Controlled testing before production rollout.</h2><p>Participants, consent versions, feature flags and feedback are tracked separately from the normal app workflow.</p><div className={ready ? 'safe-box' : 'alert'}>{ready ? 'Production API/auth configuration is present.' : 'Production provider credentials are not configured yet. Pilot remains local-only and must not be used for real medical data.'}</div></section>

    <section className="card"><h3>Pilot capacity</h3><strong className="big-number">{activeCount}/{runtimeConfig.pilotMaxUsers}</strong><small>{runtimeConfig.pilotEnabled ? 'Pilot flag enabled by environment.' : 'Pilot flag is not enabled by environment.'}</small>{admin && !current && <><label className="stacked-label">Participant label<input value={participantLabel} onChange={(e) => setParticipantLabel(e.target.value)} /></label><button className="primary-button" onClick={addParticipant} disabled={activeCount >= runtimeConfig.pilotMaxUsers}>Add current athlete</button></>}</section>

    <section className="card"><h3>Consent + onboarding version</h3>{current ? <><p>{current.label}</p><small>Consent: {current.consentVersion} · Onboarding: {current.onboardingVersion}</small><p>{current.consentAcceptedAt ? `Accepted ${new Date(current.consentAcceptedAt).toLocaleString()}` : 'Consent not accepted yet.'}</p>{!current.consentAcceptedAt && <button className="outline-button" onClick={acceptConsent}>Accept pilot consent</button>}</> : <div className="empty-state">Current athlete is not in the pilot cohort.</div>}</section>

    <section className="module-card"><p className="eyebrow">FEATURE FLAGS</p><h2>Controlled rollout</h2><div className="feature-grid">{Object.entries(state.featureFlags).map(([key, value]) => <label className="check-card" key={key}><input type="checkbox" checked={value} disabled={!admin} onChange={(e) => setState((s) => ({ ...s, featureFlags: { ...s.featureFlags, [key]: e.target.checked } }))} /><span>{key}</span></label>)}</div></section>

    <section className="card"><h3>In-app feedback</h3><select value={feedbackCategory} onChange={(e) => setFeedbackCategory(e.target.value as FeedbackItem['category'])}><option value="bug">Bug</option><option value="confusing">Confusing UX</option><option value="feature">Feature request</option><option value="content">Content</option></select><textarea className="wide-textarea" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="What happened or what should be improved?" /><button className="primary-button" onClick={addFeedback}>Send feedback</button></section>

    <section className="card"><h3>Feedback queue</h3>{state.feedback.length === 0 ? <div className="empty-state">No feedback yet.</div> : <div className="timeline-list">{state.feedback.slice(0, 12).map((item) => <div className="timeline-event" key={item.id}><div><strong>{item.category} · {item.status}</strong><span>{item.text}</span></div><small>{new Date(item.createdAt).toLocaleString()}</small></div>)}</div>}</section>
  </div>;
}
