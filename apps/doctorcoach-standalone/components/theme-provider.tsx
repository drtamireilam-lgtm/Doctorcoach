'use client';
import { Localize } from './language-provider';
import { ThemeProvider as NextThemeProvider, useTheme } from 'next-themes';
import { Palette } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { colorThemes, findColorTheme } from '../lib/color-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <Localize><NextThemeProvider attribute="class" themes={colorThemes.map(t=>t.id)} defaultTheme="dark" enableSystem={false} enableColorScheme={false} storageKey="doctorcoach-theme" disableTransitionOnChange><ThemeChrome />{children}</NextThemeProvider></Localize>;
}
function ThemeChrome() {
  const { theme, setTheme } = useTheme();
  useEffect(() => {
    const palette = findColorTheme(theme);
    if (theme && palette.id !== theme) setTheme('dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.canvas);
  }, [theme, setTheme]);
  return null;
}
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const container = useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!open)return;
    const closeOutside=(event:PointerEvent)=>{if(!container.current?.contains(event.target as Node))setOpen(false);};
    document.addEventListener('pointerdown',closeOutside);
    return()=>document.removeEventListener('pointerdown',closeOutside);
  },[open]);
  useEffect(() => setMounted(true), []);
  const selected = findColorTheme(mounted ? theme : 'dark');
  return <Localize><div ref={container} className="full-theme-picker" onKeyDown={e=>{if(e.key==='Escape'&&open){e.stopPropagation();setOpen(false);trigger.current?.focus();}}}>
    <button ref={trigger} type="button" className="theme-toggle" aria-expanded={open} aria-controls={id} aria-label="בחירת מראה וצבעי האפליקציה" onClick={()=>setOpen(v=>!v)}><Palette size={19} aria-hidden="true"/><span>מראה</span></button>
    {open && <section id={id} className="full-theme-panel" aria-label="ערכות צבע לאפליקציה">
      <div className="full-theme-heading"><strong>צבעי האפליקציה</strong><button type="button" aria-label="סגירת בחירת צבעים" onClick={()=>{setOpen(false);trigger.current?.focus();}}>×</button></div>
      <p>בחרו מראה לכל הרקע, הכרטיסים והתפריטים.</p>
      <div className="full-theme-options">{colorThemes.map(t=><button key={t.id} type="button" disabled={!mounted} aria-pressed={selected.id===t.id} onClick={()=>setTheme(t.id)}><span className="full-theme-preview" style={{background:t.canvas,borderColor:t.line}} aria-hidden="true"><span style={{background:t.card}}/><span style={{background:t.action}}/></span><span>{t.label}</span>{selected.id===t.id&&<span aria-hidden="true">✓</span>}</button>)}</div>
      <small>הבחירה נשמרת במכשיר הזה. ניתן להחליף בכל עת.</small>
    </section>}
  </div></Localize>;
}
