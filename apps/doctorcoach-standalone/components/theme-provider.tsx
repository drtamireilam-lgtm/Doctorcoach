'use client';
import {Localize} from "../components/language-provider";

import { ThemeProvider as NextThemeProvider, useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <Localize>{<NextThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="doctorcoach-theme" disableTransitionOnChange><ThemeChrome />{children}</NextThemeProvider>}</Localize>;
}

function ThemeChrome() {
  const { theme } = useTheme();
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f5f6f8' : '#0c0c10');
  }, [theme]);
  return null;
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const light = mounted && theme === 'light';
  const label = light ? 'מעבר למצב כהה' : 'מעבר למצב בהיר';
  return <Localize>{<button type="button" className="theme-toggle" aria-label={label} title={label} onClick={() => setTheme(light ? 'dark' : 'light')}>
    {light ? <Moon size={19} aria-hidden="true" /> : <Sun size={19} aria-hidden="true" />}
    <span>{light ? 'מצב כהה' : 'מצב בהיר'}</span>
  </button>}</Localize>;
}
