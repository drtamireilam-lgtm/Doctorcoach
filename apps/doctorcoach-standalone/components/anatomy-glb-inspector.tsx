'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { AnatomyGlbPreview } from './anatomy-glb-preview';
import { inspectGlb } from '../lib/anatomy-glb-inventory';

type GlbSummary = { meshNodeNames: string[]; meshCount: number };

/**
 * Local-only GLB inspection. This component does not upload files or
 * claim that an inspected model is licensed or anatomically validated.
 */
export function AnatomyGlbInspector({ language = 'he' }: { language?: 'he' | 'en' }) {
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<GlbSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const he = language === 'he';
  const requestId = useRef(0);
  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const request = ++requestId.current;
    setSummary(null);
    setPreviewFile(null);
    setError(null);
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (!file.name.toLowerCase().endsWith('.glb')) {
      setError(he ? 'יש לבחור קובץ GLB' : 'Please choose a GLB file');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError(he ? 'הקובץ גדול מ־50MB' : 'File exceeds 50MB');
      return;
    }
    try {
      const summary = inspectGlb(await file.arrayBuffer());
      if (request !== requestId.current) return;
      setSummary(summary);
      setPreviewFile(file);
    } catch (cause) {
      if (request !== requestId.current) return;
      setError(cause instanceof Error ? cause.message : 'Invalid GLB');
    }
  }
  return (
    <section dir={he ? 'rtl' : 'ltr'} aria-label={he ? 'בדיקת מודל אנטומי' : 'Anatomy model inspection'}>
      <h2>{he ? 'בדיקת קובץ תלת־ממדי' : 'Inspect a 3D model file'}</h2>
      <p>{he ? 'הקובץ נבדק במכשיר שלך בלבד. הבדיקה אינה אישור רפואי או רישוי.' :
        'The file is inspected locally. Inspection does not verify medical accuracy or licensing.'}</p>
      <label htmlFor="anatomy-glb-file">{he ? 'בחירת קובץ GLB' : 'Choose a GLB file'}</label>
      <input id="anatomy-glb-file" type="file" accept=".glb,model/gltf-binary" onChange={onFile} />
      {error && <p role="alert">{error}</p>}
      {previewFile && <AnatomyGlbPreview file={previewFile} language={language} />}
      {summary && (
        <div aria-live="polite">
          <p>{fileName}: {summary.meshCount} {he ? 'רשתות תלת־ממד' : 'meshes'}, {summary.meshNodeNames.length} {he ? 'רכיבים בעלי שם' : 'named mesh nodes'}</p>
          <ul>{summary.meshNodeNames.map((name, index) => <li key={index}>{name}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
