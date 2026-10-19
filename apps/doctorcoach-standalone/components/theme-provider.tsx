'use client';
import {Localize,useLanguage} from './language-provider';
import {ThemeProvider as NextThemeProvider,useTheme} from 'next-themes';
import {Moon,Sun,Check} from 'lucide-react';
import {createContext,useCallback,useContext,useEffect,useReducer,useRef,useState,type ReactNode} from 'react';
import {parseOwnedAppearanceResponse,PALETTE_STORAGE_KEY,type Appearance} from '../lib/appearance';
import {colorsFor,resetAppearance,themeEditReducer,themePresets,themeTokens,appearanceWithMode,type ThemeEditState} from '../lib/advanced-theme';

type Message='saved'|'failed'|'conflict'|'account-changed'|null;
type PaletteContextValue={state:ThemeEditState;current:Appearance;edit:(a:Appearance)=>void;cancel:()=>void;preview:()=>void;load:()=>Promise<void>;save:(appearance?:Appearance)=>Promise<void>;busy:boolean;signedIn:boolean;message:Message};
const PaletteContext=createContext<PaletteContextValue|null>(null);
async function preferenceRequest(init:RequestInit={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{return await fetch('/api/preferences/appearance',{...init,signal:controller.signal});}
 finally{clearTimeout(timer);}
}
export function ThemeProvider({children}:{children:ReactNode}){
 return <NextThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} enableColorScheme={false} storageKey="doctorcoach-theme" disableTransitionOnChange><AppearanceProvider>{children}</AppearanceProvider></NextThemeProvider>;
}
function AppearanceProvider({children}:{children:ReactNode}){
 const {setTheme}=useTheme();
 const [state,dispatch]=useReducer(themeEditReducer,{saved:resetAppearance,draft:null,preview:false});
 const [busy,setBusy]=useState(true),[signedIn,setSignedIn]=useState(false),[message,setMessage]=useState<Message>(null);
 const stateRef=useRef(state);stateRef.current=state;
 const owner=useRef<string|null>(null),version=useRef(0),sequence=useRef(0),saving=useRef(false);
 const current=state.preview&&state.draft?state.draft:state.saved;
 const cancel=useCallback(()=>{dispatch({type:'cancel'});setMessage(null);},[]);
 const edit=useCallback((appearance:Appearance)=>{dispatch({type:'edit',appearance});setMessage(null);},[]);
 const load=useCallback(async(preserveDraft=false)=>{
  if(saving.current)return;
  const request=++sequence.current;setBusy(true);
  try{
   const response=await preferenceRequest({cache:'no-store',credentials:'same-origin'});
   if(request!==sequence.current)return;
   if(response.status===401){owner.current=null;version.current=0;setSignedIn(false);dispatch({type:'load',appearance:resetAppearance});setMessage(null);return;}
   if(!response.ok)throw Error('preferences load');
   const data=parseOwnedAppearanceResponse(await response.json());
   if(request!==sequence.current)return;
   const changed=owner.current!==null&&owner.current!==data.ownerId;
   const sameOwner=owner.current===data.ownerId;
   setSignedIn(true);
   if(preserveDraft&&sameOwner&&stateRef.current.draft){if(version.current!==data.version)setMessage('conflict');return;}
   owner.current=data.ownerId;version.current=data.version;
   dispatch({type:'load',appearance:data.appearance??resetAppearance});
   setTheme((data.appearance??resetAppearance).mode);setMessage(changed?'account-changed':null);
  }catch{if(request===sequence.current){setSignedIn(false);setMessage('failed');}}
  finally{if(request===sequence.current)setBusy(false);}
 },[setTheme]);
 useEffect(()=>{
  // Server response is authoritative. Never restore another account's custom draft from shared browser storage.
  void load();
  const focus=()=>void load(true);
  const visible=()=>{if(document.visibilityState==='visible')void load(true);};
  const sync=(event:StorageEvent)=>{if(owner.current&&event.key===`doctorcoach-appearance-version:${owner.current}`)void load(true);};
  window.addEventListener('focus',focus);document.addEventListener('visibilitychange',visible);window.addEventListener('storage',sync);
  return()=>{sequence.current++;window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visible);window.removeEventListener('storage',sync);};
 },[load]);
 useEffect(()=>{
  const root=document.documentElement;
  root.dataset.palette=current.palette;root.dataset.customTheme='true';
  root.classList.toggle('light',current.mode==='light');root.classList.toggle('dark',current.mode==='dark');
  root.style.colorScheme=current.mode;
  const tokens=themeTokens(current);
  for(const [key,value] of Object.entries(tokens))root.style.setProperty(key,value);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',colorsFor(current).background);
  return()=>{for(const key of Object.keys(tokens))root.style.removeProperty(key);delete root.dataset.customTheme;};
 },[current]);
 async function save(nextAppearance?:Appearance){
  const appearance=nextAppearance??stateRef.current.draft,expectedOwnerId=owner.current;
  if(saving.current||busy||!signedIn||!appearance||!expectedOwnerId)return;
  saving.current=true;setBusy(true);setMessage(null);const request=++sequence.current;
  try{
   const response=await preferenceRequest({method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({appearance,version:version.current,expectedOwnerId})});
   if(request!==sequence.current)return;
   if(response.status===401){setSignedIn(false);owner.current=null;version.current=0;dispatch({type:'load',appearance:resetAppearance});setMessage('account-changed');return;}
   if(response.status===409){setMessage('conflict');return;}
   if(!response.ok)throw Error('preferences save');
   const data=parseOwnedAppearanceResponse(await response.json());
   if(request!==sequence.current||owner.current!==expectedOwnerId)return;
   if(data.ownerId!==expectedOwnerId||!data.appearance)throw Error('owner mismatch');
   version.current=data.version;dispatch({type:'commit',appearance:data.appearance});setTheme(data.appearance.mode);setMessage('saved');
   try{localStorage.setItem(PALETTE_STORAGE_KEY,data.appearance.palette);localStorage.setItem(`doctorcoach-appearance-version:${expectedOwnerId}`,`${data.version}:${Date.now()}`);}catch{/* Server save remains successful if local storage is unavailable. */}
  }catch{if(request===sequence.current)setMessage('failed');}
  finally{saving.current=false;if(request===sequence.current)setBusy(false);}
 }
 return <PaletteContext.Provider value={{state,current,edit,cancel,preview:()=>dispatch({type:'preview'}),load:()=>load(),save,busy,signedIn,message}}>{children}</PaletteContext.Provider>;
}
export function ThemeToggle(){
 const context=useContext(PaletteContext);if(!context)return null;
 const light=context.current.mode==='light',label=light?'מעבר למצב כהה':'מעבר למצב בהיר';
 return <Localize><button type="button" className="theme-toggle" disabled={context.busy} aria-label={label} title={label} onClick={()=>{const next=appearanceWithMode(context.current,light?'dark':'light');context.edit(next);void context.save(next);}}>{light?<Moon size={19} aria-hidden="true"/>:<Sun size={19} aria-hidden="true"/>}<span>{light?'מצב כהה':'מצב בהיר'}</span></button><span role="status" aria-live="polite" className="theme-toggle-status">{context.message==='failed'?'שמירת העיצוב נכשלה. נסו שוב בהגדרות המראה.':context.message==='conflict'?'העיצוב השתנה בחלון אחר. טענו אותו בהגדרות המראה.':context.message==='saved'?'העיצוב נשמר בחשבון.':!context.signedIn?'יש להתחבר לשמירת העיצוב.':''}</span></Localize>;
}
export function AppearancePicker({active=true}:{active?:boolean}){
 const context=useContext(PaletteContext),english=useLanguage().language==='en',t=(he:string,en:string)=>english?en:he;
 if(!context||!active)return null;
 const {current,busy,signedIn,message,edit,save,load}=context;
 return <section className="appearance-picker simple-appearance" data-no-translate>
  <h2>{t('מראה האפליקציה','App appearance')}</h2>
  <p>{t('בחרו ערכה בלחיצה אחת. הבחירה מוחלת מיד ונשמרת אוטומטית בחשבון.','Choose a theme with one tap. It applies immediately and saves automatically to your account.')}</p>
  <div className="appearance-presets" role="group" aria-label={t('ערכות צבעים','Color themes')}>
   {themePresets.map(p=>{const selected=JSON.stringify(current)===JSON.stringify(p.appearance),tokens=themeTokens(p.appearance);return <button type="button" key={p.id} disabled={busy||!signedIn} aria-pressed={selected} onClick={()=>{edit(p.appearance);void save(p.appearance);}}><i className="premium-swatch" aria-hidden="true" style={{background:tokens['--dc-button-gradient'],borderColor:colorsFor(p.appearance).accent}}/>{english?p.name:p.he}{selected&&<Check size={18} aria-hidden="true"/>}</button>;})}
  </div>
  <p role="status" aria-live="polite">{busy?t('מסנכרן…','Syncing…'):message==='saved'?t('הערכה נשמרה בחשבון.','Theme saved to your account.'):message==='failed'?t('הסנכרון נכשל. הבחירה עדיין לא נשמרה. נסו שוב.','Sync failed. Your selection has not been saved. Try again.'):message==='conflict'?t('ההעדפה השתנתה במכשיר אחר. טענו מחדש ובחרו שוב.','The preference changed on another device. Reload and choose again.'):!signedIn?t('יש להתחבר לשמירת העיצוב.','Sign in to save your appearance.'):''}</p>
  {(message==='conflict'||message==='failed')&&<button type="button" className="button secondary" disabled={busy} onClick={()=>void load()}>{t('טעינה מחדש','Reload')}</button>}
 </section>;
}
