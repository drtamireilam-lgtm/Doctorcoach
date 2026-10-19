'use client';
import {useLanguage} from './language-provider';
export function PrivacyLinks(){const {language}=useLanguage();return <footer className="privacy-links" aria-label={language==='he'?'פרטיות וחשבון':'Privacy and account'}><a href={'/privacy-policy?lang='+language}>{language==='he'?'מדיניות פרטיות':'Privacy policy'}</a><a href={'/account-deletion?lang='+language}>{language==='he'?'בקשת מחיקת חשבון':'Request account deletion'}</a></footer>;}
