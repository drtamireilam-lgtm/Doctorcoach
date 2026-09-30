import React, { useEffect, useMemo, useState } from 'react';
import { AthleteProfile } from './domain';
import { AuthUser, can } from './platform/auth';
import { BrowserStorageStore, VersionedRepository } from './platform/persistence';

type ReviewStatus = 'submitted' | 'reviewed';
type VideoReviewItem = {
  id: string;
  athleteId: string;
  exercise: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  submittedAt: string;
  status: ReviewStatus;
  coachNote?: string;
};

type VideoReviewState = { items: VideoReviewItem[] };
const repo = new VersionedRepository<VideoReviewState>(new BrowserStorageStore(), 'training-video-review', 1);

export default function TrainingVideoReview({ profile, user }: { profile: AthleteProfile; user: AuthUser }) {
  const [state, setState] = useState<VideoReviewState>({ items: [] });
  const [loaded, setLoaded] = useState(false);
  const [exercise, setExercise] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const canReview = can(user, 'training:assign') || can(user, 'admin:manage');

  useEffect(() => { repo.load().then((saved) => { if (saved) setState(saved); setLoaded(true); }); }, []);
  useEffect(() => { if (loaded) repo.save(state); }, [loaded, state]);
  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const items = useMemo(() => [...state.items].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), [state.items]);

  const submit = () => {
    if (!file || !exercise.trim()) return;
    setState((s) => ({ ...s, items: [...s.items, {
      id: `video-${Date.now()}`,
      athleteId: profile.id,
      exercise: exercise.trim(),
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type || 'video/*',
      submittedAt: new Date().toISOString(),
      status: 'submitted',
    }] }));
    setFile(null);
    setExercise('');
  };

  const review = (id: string, note: string) => {
    if (!canReview) return;
    setState((s) => ({ ...s, items: s.items.map((item) => item.id === id ? { ...item, coachNote: note, status: 'reviewed' } : item) }));
  };

  return <section className="module-card video-review-panel">
    <p className="eyebrow">SET VIDEO REVIEW</p>
    <h2>Technique review workflow</h2>
    <p className="muted">The MVP stores submission metadata locally. The selected video preview is browser-only. Production upload is intentionally blocked until private object storage and signed upload URLs are connected.</p>

    <div className="video-submit-grid">
      <label className="stacked-label">Exercise<input value={exercise} onChange={(e) => setExercise(e.target.value)} placeholder="e.g. Squat · Set 3" /></label>
      <label className="stacked-label">Video<input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
    </div>
    {previewUrl && <video className="video-preview" controls src={previewUrl} />}
    <button className="primary-button" disabled={!file || !exercise.trim()} onClick={submit}>Submit for coach review</button>

    <div className="video-review-list">{items.length === 0 ? <div className="empty-state">No video submissions yet.</div> : items.map((item) => <VideoItem key={item.id} item={item} canReview={canReview} onReview={review} />)}</div>
  </section>;
}

function VideoItem({ item, canReview, onReview }: { item: VideoReviewItem; canReview: boolean; onReview: (id: string, note: string) => void }) {
  const [note, setNote] = useState(item.coachNote || '');
  return <div className="video-review-row">
    <div><strong>{item.exercise}</strong><span>{item.fileName} · {(item.fileSize / 1024 / 1024).toFixed(1)} MB</span><small>{new Date(item.submittedAt).toLocaleString()} · {item.status}</small></div>
    <div><textarea value={note} disabled={!canReview} placeholder="Coach feedback" onChange={(e) => setNote(e.target.value)} />{canReview && <button className="outline-button" onClick={() => onReview(item.id, note)}>Save review</button>}</div>
  </div>;
}
