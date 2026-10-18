'use client';
import {Localize,useLanguage} from './language-provider';
import {ThemeProvider as NextThemeProvider,useTheme} from 'next-themes';
import {Moon,Sun,Check} from 'lucide-react';
import {createContext,useCallback,useContext,useEffect,useId,useReducer,useRef,useState,type ReactNode} from 'react';
import {palettes,isAppearance,isHexColor,parseOwnedAppearanceResponse,PALETTE_STORAGE_KEY,customColorKeys,type Appearance,type CustomColorKey} from '../lib/appearance';
import {colorsFor,fromPrimary,resetAppearance,swatchFamilies,themeEditReducer,themePresets,themeTokens,appearanceWithMode,type ThemeEditState} from '../lib/advanced-theme';

type Message='saved'|'failed'|'conflict'|'account-changed'|null;
type PaletteContextValue={state:ThemeEditState;current:Appearance;edit:(a:Appearance)=>void;cancel:()=>void;preview:()=>void;load:()=>Promise<void>;save:()=>Promise<void>;busy:boolean;signedIn:boolean;message:Message};
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
 async function save(){
  const appearance=stateRef.current.draft,expectedOwnerId=owner.current;
  if(busy||!signedIn||!appearance||!expectedOwnerId)return;
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
 return <Localize><button type="button" className="theme-toggle" disabled={context.busy} aria-label={label} title={label} onClick={()=>context.edit(appearanceWithMode(context.current,light?'dark':'light'))}>{light?<Moon size={19} aria-hidden="true"/>:<Sun size={19} aria-hidden="true"/>}<span>{light?'מצב כהה':'מצב בהיר'}</span></button></Localize>;
}
const colorLabels:Record<CustomColorKey,[string,string]>={background:['רקע','Background Color'],primary:['צבע מרכזי','Primary Color'],secondary:['צבע משני וכרטיסים','Secondary Color'],button:['כפתורים','Button Color'],navigation:['ניווט','Navigation Color'],accent:['הדגשות','Accent Color']};
function ColorField({label,value,disabled,onChange}:{label:string;value:string;disabled:boolean;onChange:(v:string)=>void}){
 const id=useId(),[text,setText]=useState(value);
 useEffect(()=>setText(value),[value]);
 const valid=isHexColor(text);
 return <div className="advanced-color-field"><label htmlFor={id}>{label}</label><div><input type="color" aria-label={`${label} — Color Picker`} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}/><input id={id} type="text" dir="ltr" value={text} maxLength={7} spellCheck={false} disabled={disabled} aria-invalid={!valid} aria-describedby={!valid?`${id}-error`:undefined} onChange={e=>{const next=e.target.value;setText(next);if(isHexColor(next))onChange(next);}} onBlur={()=>{if(!valid)setText(value);}}/></div>{!valid&&<small id={`${id}-error`} role="status">#RRGGBB</small>}</div>;
}
export function AppearancePicker({active=true}:{active?:boolean}){
 const context=useContext(PaletteContext),english=useLanguage().language==='en',t=(he:string,en:string)=>english?en:he;
 const [advanced,setAdvanced]=useState(false);const previewId=useId();
 const cancel=context?.cancel;
 useEffect(()=>{if(!active)cancel?.();return()=>cancel?.();},[active,cancel]);
 if(!context)return null;
 const {current,edit,state,busy,signedIn,message,save,load}=context;
 const colors=colorsFor(current),choosePrimary=(primary:string)=>edit({...current,custom:fromPrimary(primary,current.mode)});
 const patch=(key:CustomColorKey,value:string)=>edit({...current,custom:{...colors,[key]:value}});
 return <div className="appearance-picker advanced-appearance" data-no-translate>
  <h2>{t('מראה → ערכת עיצוב וצבעים','Appearance → Theme & Colors')}</h2>
  <p>{t('בחרו צבע מרכזי או התאימו כל אזור בנפרד. השינוי מוצג מיד; Apply שומר בחשבון ו־Cancel מבטל את הטיוטה.','Choose a primary color or customize individual surfaces. Changes preview instantly; Apply saves to your account and Cancel restores the saved design.')}</p>
  <fieldset disabled={busy}><legend>{t('ערכות מוכנות','Theme presets')}</legend><div className="appearance-presets">{themePresets.map(p=><button type="button" key={p.id} aria-pressed={JSON.stringify(current)===JSON.stringify(p.appearance)} onClick={()=>edit(p.appearance)}>{p.name}</button>)}</div></fieldset>
  <fieldset disabled={busy}><legend>{t('מצב תצוגה','Display mode')}</legend><p>{t('החלפת מצב יוצרת מחדש את גווני הרקע. ניתן לערוך אותם שוב בהתאמה המתקדמת.','Switching mode regenerates background shades. You can edit them again in Advanced Customization.')}</p><div className="appearance-modes">{(['dark','light'] as const).map(mode=><button type="button" key={mode} aria-pressed={current.mode===mode} onClick={()=>edit(appearanceWithMode(current,mode))}>{mode==='light'?t('בהיר','Light'):t('כהה','Dark')}</button>)}</div></fieldset>
  <fieldset disabled={busy}><legend>{t('פלטת צבעים','Color palette')}</legend><div className="advanced-swatch-grid">{swatchFamilies.map(f=><div className="advanced-swatch-family" key={f[1]}><span>{english?f[1]:f[0]}</span><div>{f.slice(2).map(color=><button type="button" key={color} style={{background:color}} aria-label={`${english?f[1]:f[0]} ${color}`} aria-pressed={colors.primary.toLowerCase()===color} onClick={()=>choosePrimary(color)}>{colors.primary.toLowerCase()===color&&<Check size={18} style={{color:themeTokens({...current,custom:fromPrimary(color,current.mode)})['--dc-primary-text']}} aria-hidden="true"/>}</button>)}</div></div>)}</div><ColorField label={t('צבע מרכזי מדויק','Exact primary color')} value={colors.primary} disabled={busy} onChange={choosePrimary}/></fieldset>
  <button type="button" className="button secondary" aria-expanded={advanced} aria-controls={`${previewId}-advanced`} disabled={busy} onClick={()=>setAdvanced(v=>!v)}>{t('התאמה מתקדמת','Advanced Customization')}</button>
  {advanced&&<fieldset id={`${previewId}-advanced`} disabled={busy}><legend>{t('צבעים לפי רכיב','Colors by component')}</legend><div className="advanced-color-grid">{customColorKeys.map(key=><ColorField key={key} label={english?colorLabels[key][1]:colorLabels[key][0]} value={colors[key]} disabled={busy} onChange={value=>patch(key,value)}/>)}</div><p>{t('צבעי הטקסט והאייקונים מותאמים אוטומטית לרקע שלהם.','Text and icon colors adapt automatically to their surfaces.')}</p></fieldset>}
  <section id={previewId} tabIndex={-1} className="appearance-preview advanced-live-preview" aria-label="Preview"><strong>{t('תצוגה מקדימה','Preview')}</strong><nav aria-label={t('דוגמת ניווט','Navigation preview')}>{t('בית · התוכנית שלי · התקדמות','Home · My program · Progress')}</nav><p>{t('האימון הבא שלך','Your next workout')}</p><div className="appearance-preview-actions"><button type="button" className="button primary">{t('כפתור לדוגמה','Example button')}</button><span className="preview-accent">{t('הדגשה לדוגמה','Example accent')}</span></div></section>
  <div className="care-actions advanced-theme-actions"><button type="button" className="button secondary" disabled={busy} onClick={()=>{context.preview();document.getElementById(previewId)?.focus();}}>Preview</button><button type="button" className="button primary" disabled={busy||!signedIn||!state.draft} onClick={()=>void save()}>Apply</button><button type="button" className="button secondary" disabled={busy||!state.draft} onClick={context.cancel}>Cancel</button><button type="button" className="text-button" disabled={busy} onClick={()=>edit(resetAppearance)}>Reset to Default</button><button type="button" className="text-button" disabled={busy} onClick={()=>void load()}>{t('טעינת העיצוב השמור','Load saved appearance')}</button></div>
  <p role="status" aria-live="polite">{busy?t('טוען…','Loading…'):message==='saved'?t('העיצוב נשמר בחשבון.','Appearance saved to your account.'):message==='conflict'?t('החשבון או ההעדפה השתנו. טענו את העיצוב השמור לפני שמירה נוספת.','The account or preference changed. Load the saved appearance before saving again.'):message==='account-changed'?t('החשבון השתנה; הוצג העיצוב של החשבון הנוכחי.','Account changed; showing the current account design.'):message==='failed'?t('הסנכרון נכשל. הטיוטה לא נשמרה; נסו לטעון או לשמור שוב.','Sync failed. Your draft has not been saved; retry loading or applying.'):!signedIn?t('יש להתחבר כדי לשמור את העיצוב בחשבון.','Sign in to save your design to your account.'):state.draft?t('תצוגה מקדימה — השינויים עדיין לא נשמרו.','Preview — changes have not been saved.'):t('העיצוב השמור מוצג.','Showing your saved design.')}</p>
 </div>;
}
