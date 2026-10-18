import type { Metadata, Viewport } from 'next';
import './globals.css';
import './theme.css';
import './care.css';
import './wellness.css';
import './platform.css';
import './appearance.css';
import './language.css';
import './sprint.css';
import './privacy-policy.css';
import './palettes.css';
import './full-color-themes.css';
import {PrivacyLinks} from '../components/privacy-links';
import {LanguageProvider} from '../components/language-provider';
import { ThemeProvider } from '../components/theme-provider';
export const metadata: Metadata = {
  title: 'DoctorCoach | תנועה חכמה',
  description: 'תרגילי כוח, התאמות סביב פציעות ותוכנית אימונים אישית עם נדב רון וד״ר תמיר עילם',
  applicationName: 'DoctorCoach',
  appleWebApp: { capable: true, title: 'DoctorCoach', statusBarStyle: 'black-translucent' },
  icons: { icon: [{url:'/icons/favicon-32-drc-v1.png',sizes:'32x32',type:'image/png'},{url:'/icons/favicon-64-drc-v1.png',sizes:'64x64',type:'image/png'}], apple: '/icons/apple-touch-icon-drc-v1.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0c0c10' };
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="he" dir="rtl" suppressHydrationWarning><head><link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials"/></head><body><ThemeProvider><LanguageProvider>{children}<PrivacyLinks/></LanguageProvider></ThemeProvider></body></html>}
