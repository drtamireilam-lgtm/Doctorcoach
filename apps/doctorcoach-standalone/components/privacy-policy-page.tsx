'use client';
import {LanguageToggle,useLanguage} from './language-provider';
import {privacyPolicy} from '../lib/privacy-policy';
export function PrivacyPolicyPage(){
 const {language}=useLanguage(),t=privacyPolicy[language];
 return <main className="care-stack privacy-policy-page" lang={language} dir={language==='he'?'rtl':'ltr'}>
  <header className="workspace-heading"><div><h1>{t.title}</h1><p>{t.updated}</p></div><LanguageToggle/></header>
  <aside className="panel care-form" aria-label={language==='he'?'מצב הטיוטה':'Draft status'}><p>{t.draft}</p></aside>
  {t.sections.map(s=><section className="panel care-form" key={s.title}><h2>{s.title}</h2>{s.paragraphs.map(p=><p key={p}>{p}</p>)}</section>)}
  <footer className="care-actions"><a href="/">{t.back}</a><a href="/account-deletion">{t.deletion}</a><a href="tel:+972546753959">{t.contact}</a></footer>
 </main>;
}
