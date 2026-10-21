'use client';

import { AnatomyGlbInspector } from '../../components/anatomy-glb-inspector';
import { useState } from 'react';

/**
 * Isolated developer preview. Not linked from the clinical anatomy library.
 * Local GLB files are inspected in-browser and never uploaded.
 */
export default function AnatomyPreviewPage() {
  const [language, setLanguage] = useState<'he' | 'en'>('he');
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <h1>{language === 'he' ? 'מעבדת אנטומיה תלת־ממדית' : '3D Anatomy Lab'}</h1>
        <button type="button" onClick={() => setLanguage(language === 'he' ? 'en' : 'he')}
          aria-label="Switch language">{language === 'he' ? 'English' : 'עברית'}</button>
      </header>
      <AnatomyGlbInspector language={language} />
    </main>
  );
}
