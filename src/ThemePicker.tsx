import { useEffect, useState } from 'react';
import './theme-picker.css';

type Accent = 'red' | 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'neutral';
type Mode = 'dark' | 'light' | 'system';
const accents: { id: Accent; label: string; color: string }[] = [
  { id: 'red', label: 'אדום', color: '#e32626' },
  { id: 'blue', label: 'כחול', color: '#2563eb' },
  { id: 'purple', label: 'סגול', color: '#9333ea' },
  { id: 'green', label: 'ירוק', color: '#16a34a' },
  { id: 'orange', label: 'כתום', color: '#ea580c' },
  { id: 'pink', label: 'ורוד', color: '#db2777' },
  { id: 'neutral', label: 'ניטרלי', color: '#64748b' },
];
const storageKey = 'doctorcoach-ui-theme-v1';
function readTheme(): { accent: Accent; mode: Mode } {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return { accent: accents.some(x => x.id === parsed.accent) ? parsed.accent : 'red',
      mode: ['dark', 'light', 'system'].includes(parsed.mode) ? parsed.mode : 'dark' };
  } catch { return { accent: 'red', mode: 'dark' }; }
}
export default function ThemePicker() {
  const [theme, setTheme] = useState(readTheme);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      root.dataset.dcAccent = theme.accent;
      root.dataset.dcMode = theme.mode === 'system' ? (media.matches ? 'dark' : 'light') : theme.mode;
    };
    apply();
    media.addEventListener('change', apply);
    try { localStorage.setItem(storageKey, JSON.stringify(theme)); } catch { /* storage may be blocked */ }
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  return <div className="dc-theme-widget" dir="rtl">
    <button type="button" className="dc-theme-toggle" onClick={() => setOpen(v => !v)}
      aria-expanded={open} aria-controls="dc-theme-panel" aria-label="הגדרות צבעים">🎨 צבעים</button>
    {open && <section id="dc-theme-panel" className="dc-theme-panel" aria-label="התאמת עיצוב">
      <div className="dc-theme-heading"><strong>התאמה אישית</strong><button type="button" onClick={() => setOpen(false)} aria-label="סגירה">×</button></div>
      <label htmlFor="dc-display-mode">מצב תצוגה</label>
      <select id="dc-display-mode" value={theme.mode} onChange={e => setTheme(t => ({ ...t, mode: e.target.value as Mode }))}>
        <option value="dark">כהה</option><option value="light">בהיר</option><option value="system">לפי המכשיר</option>
      </select>
      <p>צבע הדגשה</p>
      <div className="dc-theme-swatches">{accents.map(a => <button key={a.id} type="button"
        className={theme.accent === a.id ? 'dc-theme-swatch selected' : 'dc-theme-swatch'}
        aria-pressed={theme.accent === a.id} onClick={() => setTheme(t => ({ ...t, accent: a.id }))}>
        <span style={{ backgroundColor: a.color }} />{a.label}</button>)}</div>
      <small>הבחירה נשמרת בדפדפן זה. אין שינוי בנתונים רפואיים.</small>
    </section>}
  </div>;
}
