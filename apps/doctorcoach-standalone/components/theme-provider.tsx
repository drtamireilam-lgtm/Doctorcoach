'use client';
import {Localize,useLanguage} from './language-provider';
import {ThemeProvider as NextThemeProvider,useTheme} from 'next-themes';
import {Moon,Sun,Check} from 'lucide-react';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {palettes,isPalette,isAppearance,parseAppearanceResponse,PALETTE_STORAGE_KEY,type Palette,type Appearance} from '../lib/appearance';
import surfaces from '../lib/appearance-surfaces.json';
type PaletteContextValue={palette:Palette;choose:(p:Palette)=>void;load:()=>Promise<void>;save:()=>Promise<void>;busy:boolean;signedIn:boolean;message:'saved'|'failed'|'conflict'|null};
const PaletteContext=createContext<PaletteContextValue|null>(null);
export function ThemeProvider({children}:{children:ReactNode}){
 return <NextThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="doctorcoach-theme" disableTransitionOnChange><AppearanceProvider>{children}</AppearanceProvider></NextThemeProvider>;
}
function AppearanceProvider({children}:{children:ReactNode}){
 const {theme,setTheme}=useTheme(),[palette,setPalette]=useState<Palette>('red'),[busy,setBusy]=useState(true),[signedIn,setSignedIn]=useState(false),[version,setVersion]=useState(0),[message,setMessage]=useState<PaletteContextValue['message']>(null);
 function apply(next:Palette){setPalette(next);document.documentElement.dataset.palette=next;try{localStorage.setItem(PALETTE_STORAGE_KEY,next);}catch{/* Preview still works without browser storage. */}}
 async function load(signal?:AbortSignal){
  setBusy(true);setMessage(null);
  try{
   const response=await fetch('/api/preferences/appearance',{cache:'no-store',signal});
   if(signal?.aborted)return;
   if(response.status===401){setSignedIn(false);return;}
   if(!response.ok)throw new Error();
   const data=parseAppearanceResponse(await response.json());if(signal?.aborted)return;
   if(!Number.isSafeInteger(data.version)||data.version<0||(data.appearance!==null&&!isAppearance(data.appearance)))throw new Error();
   setSignedIn(true);setVersion(data.version);
   if(isAppearance(data.appearance)){apply(data.appearance.palette);setTheme(data.appearance.mode);}
  }catch{if(!signal?.aborted)setMessage('failed');}finally{if(!signal?.aborted)setBusy(false);}
 }
 useEffect(()=>{
  try{const stored=localStorage.getItem(PALETTE_STORAGE_KEY);if(isPalette(stored))apply(stored);}catch{}
  const controller=new AbortController();void load(controller.signal);
  const sync=(event:StorageEvent)=>{if(event.key===PALETTE_STORAGE_KEY){const next=isPalette(event.newValue)?event.newValue:'red';setPalette(next);document.documentElement.dataset.palette=next;setMessage(null);}};
  window.addEventListener('storage',sync);return()=>{controller.abort();window.removeEventListener('storage',sync);};
 },[]);
 useEffect(()=>{setMessage(null);document.querySelector('meta[name="theme-color"]')?.setAttribute('content',surfaces[palette][theme==='light'?1:0][0]);},[theme,palette]);
 async function save(){
  if(busy||!signedIn)return;setBusy(true);setMessage(null);
  const appearance:Appearance={mode:theme==='light'?'light':'dark',palette};
  try{
   const response=await fetch('/api/preferences/appearance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({appearance,version})});
   if(response.status===401)setSignedIn(false);
   if(response.status===409){setMessage('conflict');return;}
   if(!response.ok)throw new Error();const data=parseAppearanceResponse(await response.json());
   if(!Number.isSafeInteger(data.version)||!isAppearance(data.appearance))throw new Error();
   setVersion(data.version);setMessage('saved');
  }catch{setMessage('failed');}finally{setBusy(false);}
 }
 return <PaletteContext.Provider value={{palette,choose:p=>{apply(p);setMessage(null);},load:()=>load(),save,busy,signedIn,message}}>{children}</PaletteContext.Provider>;
}
export function ThemeToggle(){
 const {theme,setTheme}=useTheme(),context=useContext(PaletteContext),[mounted,setMounted]=useState(false);
 useEffect(()=>setMounted(true),[]);const light=mounted&&theme==='light';
 const label=light?'מעבר למצב כהה':'מעבר למצב בהיר';
 return <Localize><button type="button" className="theme-toggle" disabled={context?.busy} aria-label={label} title={label} onClick={()=>setTheme(light?'dark':'light')}>{light?<Moon size={19} aria-hidden="true"/>:<Sun size={19} aria-hidden="true"/>}<span>{light?'מצב כהה':'מצב בהיר'}</span></button></Localize>;
}
export function AppearancePicker(){
 const context=useContext(PaletteContext),{theme,setTheme}=useTheme(),english=useLanguage().language==='en',t=(he:string,en:string)=>english?en:he;
 if(!context)return null;const {palette,choose,busy,signedIn,message,save,load}=context;
 const selected=palettes.find(p=>p.id===palette)!;
 return <div className="appearance-picker" data-no-translate>
  <p>{t('הצבע משנה גם את הרקע, הכרטיסים והתפריטים.','Colors apply to backgrounds, cards and navigation.')}</p><p className="appearance-current">{t('העיצוב שלך:','Your appearance:')} <strong>{english?selected.en:selected.he} · {theme==='light'?t('גוון בהיר','Light shade'):t('גוון כהה','Dark shade')}</strong></p>
  <fieldset disabled={busy}><legend>{t('בחירה מהירה','Quick choices')}</legend><div className="appearance-presets">{([
   {palette:'neutral',mode:'dark',he:'שחור קלאסי',en:'Classic dark'},
   {palette:'neutral',mode:'light',he:'לבן קלאסי',en:'Classic light'},
   {palette:'yellow',mode:'light',he:'צהוב שמש',en:'Sunshine yellow'},
   {palette:'blue',mode:'light',he:'כחול בהיר',en:'Light blue'},
   {palette:'pink',mode:'light',he:'ורוד בהיר',en:'Light pink'},
   {palette:'green',mode:'light',he:'ירוק בהיר',en:'Light green'},
   {palette:'blue',mode:'dark',he:'כחול כהה',en:'Dark blue'},
   {palette:'purple',mode:'dark',he:'סגול כהה',en:'Dark purple'},
   {palette:'red',mode:'dark',he:'אדום יין',en:'Ruby red'},
  ] as const).map(p=><button type="button" key={p.palette+p.mode} aria-pressed={palette===p.palette&&theme===p.mode} onClick={()=>{choose(p.palette);setTheme(p.mode);}}>{english?p.en:p.he}</button>)}</div></fieldset>
  <fieldset disabled={busy}><legend>{t('רקע','Background')}</legend><div className="appearance-modes">{(['light','dark'] as const).map(mode=><button type="button" key={mode} aria-pressed={theme===mode} onClick={()=>setTheme(mode)}>{mode==='light'?<Sun size={18} aria-hidden="true"/>:<Moon size={18} aria-hidden="true"/>}{mode==='light'?t('בהיר','Light'):t('כהה','Dark')}</button>)}</div></fieldset>
  <fieldset disabled={busy}><legend>{t('הצבע שלך','Your color')}</legend><div className="appearance-colors">{palettes.map(p=><button type="button" key={p.id} aria-pressed={palette===p.id} onClick={()=>choose(p.id)}><span className="appearance-swatch" style={{background:p.button}} aria-hidden="true">{palette===p.id&&<Check size={20}/>}</span><span>{english?p.en:p.he}</span></button>)}</div></fieldset>
  <section className="appearance-preview" aria-label={t('תצוגה מקדימה','Preview')}><strong>{t('כך ייראה העיצוב שלך','Your appearance preview')}</strong><p>{t('התוכנית שלי · האימון הבא מחכה לך','My program · Your next workout is ready')}</p><div className="appearance-preview-actions"><span className="appearance-preview-primary">{t('התחלת אימון','Start workout')}</span><span className="appearance-preview-secondary">{t('התקדמות','Progress')}</span></div></section>
  <p className="care-muted">{t('הצבע משתנה מיד במכשיר הזה. שמרו בחשבון כדי להשתמש באותו עיצוב גם במכשיר אחר.','The color changes immediately on this device. Save to your account to use it on another device.')}</p>
  <div className="care-actions"><button type="button" className="button primary" disabled={busy||!signedIn} onClick={()=>void save()}>{busy?t('טוען…','Loading…'):t('שמירת העיצוב בחשבון','Save appearance to account')}</button><button type="button" className="button secondary" disabled={busy} onClick={()=>void load()}>{t('טעינת העיצוב השמור','Load saved appearance')}</button><button type="button" className="text-button" disabled={busy} onClick={()=>{choose('red');setTheme('dark');}}>{t('חזרה לעיצוב המקורי','Reset to original appearance')}</button></div>
  <p role="status" aria-live="polite">{message==='saved'?t('העיצוב נשמר בחשבון.','Appearance saved to your account.'):message==='conflict'?t('ההעדפה השתנתה בחלון אחר. טענו את העיצוב השמור לפני שמירה נוספת.','Appearance changed in another window. Load the saved appearance before saving again.'):message==='failed'?t('לא ניתן לסנכרן את העיצוב כרגע. הבחירה עדיין מוצגת במכשיר; נסו שוב.','Appearance could not be synced. Your preview remains on this device; try again.'):!busy&&!signedIn?t('נדרשת התחברות כדי לשמור בחשבון.','Sign in to save to your account.'):''}</p>
 </div>;
}
