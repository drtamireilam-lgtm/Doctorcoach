'use client';
import { useEffect, useState } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        'camera-controls'?: boolean;
        'touch-action'?: string;
      };
    }
  }
}

/** Local file preview only. Not approved for publication or medical use. */
export function AnatomyGlbPreview({ file, language = 'he' }: { file: File | null; language?: 'he' | 'en' }) {
  const [url, setUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!file || !file.name.toLowerCase().endsWith('.glb')) { setUrl(null); return; }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  useEffect(() => {
    if (!url) return;
    let active = true;
    import('@google/model-viewer').then(() => { if (active) setReady(true); }).catch(() => { if (active) setError(true); });
    return () => { active = false; setReady(false); setError(false); };
  }, [url]);
  if (!url) return null;
  return <section dir={language === 'he' ? 'rtl' : 'ltr'}>
    <p>{language === 'he' ? 'תצוגה מקדימה בלבד — לא אושרו דיוק אנטומי או זכויות שימוש.' : 'Preview only — anatomy and rights are not approved.'}</p>
    {error && <p role="alert">{language === 'he' ? 'שגיאה בטעינת המציג' : 'Viewer failed to load'}</p>}
    {ready && !error && <model-viewer src={url} alt="GLB preview" camera-controls touch-action="pan-y"
      style={{ width: '100%', height: 'min(65vh, 520px)' }} />}
  </section>;
}
