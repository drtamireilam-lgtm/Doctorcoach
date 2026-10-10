'use client';
import {Localize} from "../components/language-provider";

import { useEffect, useState } from 'react';
import { Download, Share2, Smartphone, WifiOff, X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function AppInstall() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [offline, setOffline] = useState(false);
  const [open, setOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const display = window.matchMedia('(display-mode: standalone)');
    const updateDisplay = () => setInstalled(display.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const updateNetwork = () => setOffline(!navigator.onLine);
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const completeInstall = () => { setInstalled(true); setPrompt(null); setOpen(false); };
    updateDisplay();
    updateNetwork();
    display.addEventListener('change', updateDisplay);
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    window.addEventListener('beforeinstallprompt', capturePrompt);
    window.addEventListener('appinstalled', completeInstall);

    // Development must not retain production assets between code edits.
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(() => { /* Browser installation remains available without offline fallback. */ });
    }

    return () => {
      display.removeEventListener('change', updateDisplay);
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
      window.removeEventListener('beforeinstallprompt', capturePrompt);
      window.removeEventListener('appinstalled', completeInstall);
    };
  }, []);

  const install = async () => {
    if (!prompt || installing) return;
    setInstalling(true);
    setMessage('');
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setPrompt(null); // A browser install event may be used only once.
      if (choice.outcome === 'accepted') setOpen(false);
      else setMessage('ההתקנה בוטלה. אפשר לנסות שוב מתפריט הדפדפן.');
    } catch {
      setPrompt(null);
      setMessage('אפשר להוסיף את האפליקציה דרך תפריט הדפדפן.');
    } finally { setInstalling(false); }
  };

  return <Localize>{<>
    {offline && <span className="offline-status" role="status"><WifiOff size={16} /> אין חיבור</span>}
    {!installed && <button className="install-button" onClick={() => setOpen(true)} aria-label="התקנת DoctorCoach"><Smartphone size={18}/><span>התקנת האפליקציה</span></button>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="install-dialog" dir="rtl" showCloseButton={false}>
        <DialogClose className="install-close" aria-label="סגירה"><X size={20}/></DialogClose>
        <div className="install-logo" aria-hidden="true"><img src="/icons/icon-192.png" width="64" height="64" alt="" /></div>
        <DialogTitle>DoctorCoach על מסך הבית</DialogTitle>
        <DialogDescription>גישה לתוכנית ולתרגילים שלך דרך אייקון בטלפון. מתחברים עם אותו חשבון של האתר.</DialogDescription>
        {prompt && <button className="button primary wide" disabled={installing} onClick={install}><Download size={18}/>{installing ? 'פותחים התקנה…' : 'התקנת DoctorCoach'}</button>}
        <div className="install-instructions">
          <div><strong>iPhone / iPad</strong><p>פתחו את האתר ב־Safari, לחצו על שיתוף <Share2 size={15} aria-label="שיתוף"/> ובחרו ״הוסף למסך הבית״.</p></div>
          <div><strong>Android</strong><p>פתחו את האתר ב־Chrome. בתפריט ⋮ בחרו ״התקנת אפליקציה״ או ״הוספה למסך הבית״, אם האפשרות מוצגת.</p></div>
        </div>
        <p className="install-online-note">טעינת התוכנית ושמירת אימונים דורשות חיבור לאינטרנט.</p>
        {message && <p className="install-message" role="status">{message}</p>}
      </DialogContent>
    </Dialog>
  </>}</Localize>;
}
