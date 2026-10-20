'use client';
import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { translateBookingHref, translateText, type Language } from '../lib/localization';
const LanguageContext = createContext<{language: Language; setLanguage:(language: Language)=>void}>({language:'he',setLanguage:()=>{}});
export const useLanguage = () => useContext(LanguageContext);
export function LanguageProvider({children}:{children:ReactNode}) {
  const [language, updateLanguage] = useState<Language>('he');
  const apply = (next:Language) => {
    document.documentElement.lang=next;
    document.documentElement.dir=next==='en'?'ltr':'rtl';
    updateLanguage(next);
  };
  useEffect(()=>{
    const query=new URLSearchParams(location.search).get('lang');
    const saved=localStorage.getItem('doctorcoach-language');
    apply(query==='en'||query==='he'?query:saved==='en'?'en':'he');
  },[]);
  const setLanguage=(next:Language)=>{
    localStorage.setItem('doctorcoach-language',next);
    const url=new URL(location.href);url.searchParams.set('lang',next);history.replaceState(null,'',url);
    apply(next);
  };
  useEffect(()=>{
    document.title=language==='en'?'DoctorCoach | Smart Movement':'DoctorCoach | תנועה חכמה';
    document.querySelector('meta[name="description"]')?.setAttribute('content',language==='en'?'Strength training, injury-aware adaptations and a personal training plan with Nadav Ron and Dr. Tamir Eilam':'תרגילי כוח, התאמות סביב פציעות ותוכנית אימונים אישית עם נדב רון וד״ר תמיר עילם');
  },[language]);
  return <LanguageContext.Provider value={{language,setLanguage}}>{children}</LanguageContext.Provider>;
}
export function LanguageToggle({className=''}:{className?:string}) {
  const {language,setLanguage}=useLanguage();
  return <button type="button" className={`language-toggle ${className}`} lang={language==='he'?'en':'he'} onClick={()=>setLanguage(language==='he'?'en':'he')} aria-label={language==='he'?'Switch to English':'מעבר לעברית'}>{language==='he'?'EN':'עברית'}</button>;
}
function localize(node:ReactNode, language:Language):ReactNode {
  if(typeof node==='string') return translateText(node,language);
  if(Array.isArray(node)) return Children.map(node,child=>localize(child,language));
  if(!isValidElement<Record<string,unknown>>(node)) return node;
  if(node.props['data-no-translate']) return node;
  const props:Record<string,unknown>={};
  for(const key of ['title','placeholder','alt','aria-label','label','description']) {
    if(typeof node.props[key]==='string') props[key]=translateText(node.props[key] as string,language);
  }
  if(typeof node.props.href==='string') props.href=translateBookingHref(node.props.href,language);
  if(node.props.dir==='rtl') props.dir=language==='en'?'ltr':'rtl';
  // Values, identifiers, handlers and form state deliberately stay canonical.
  if(node.props.children!==undefined) props.children=localize(node.props.children as ReactNode,language);
  return cloneElement(node,props);
}
export function Localize({children}:{children:ReactNode}) {
  const {language}=useLanguage();
  return <>{localize(children,language)}</>;
}
