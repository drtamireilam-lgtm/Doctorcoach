import hebrew from './locales/he.json';
import english from './locales/en.json';
export type Language = 'he' | 'en';
const normalize = (text: string) => text.trim().replace(/\s+/g, ' ');
const dictionary = new Map(hebrew.map((text, index) => [normalize(text), english[index]]));
const phrases = [...dictionary.keys()].filter(text => text.length > 1).sort((a,b) => b.length-a.length);
const escape = (text:string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = new RegExp(phrases.map(escape).join('|'), 'gu');
export function translateText(text: string, language: Language): string {
  if(language === 'he' || !/[\u0590-\u05ff]/u.test(text)) return text;
  const exact = dictionary.get(normalize(text));
  if(exact) return text.match(/^\s*/)?.[0] + exact + (text.match(/\s*$/)?.[0] ?? '');
  // Compose known labels with numbers/punctuation; preserve unknown free text.
  const normalized = normalize(text);
  const translated = normalized.replace(pattern, (match,offset:number) => { const value=dictionary.get(match) ?? match; return value + (/[a-z]$/i.test(value)&&/^\d/.test(normalized.slice(offset+match.length))?' ':''); });
  return /[\u0590-\u05ff]/u.test(translated) ? text : translated;
}
export function displayLocale(): string {
  return typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en-GB' : 'he-IL';
}
export function translateBookingHref(href:string,language:Language):string {
  if(language==='he'||!href.startsWith('https://wa.me/')) return href;
  const url=new URL(href),message=url.searchParams.get('text');
  if(!message) return href;
  let translated=translateText(message,language);
  const coaching=message.match(/^שלום, אשמח לתאם ליווי עם נדב רון ל־(\d+) חודשים במחיר (\d+) ₪\.$/u);
  const nutrition=message.match(/^שלום, אשמח לפרטים על מסלול תזונה של (\d+) חודשים ב־DoctorCoach$/u);
  if(coaching) translated=`Hello, I'd like to arrange ${coaching[1]} months of coaching with Nadav Ron for ILS ${coaching[2]}.`;
  if(nutrition) translated=`Hello, I'd like information about the ${nutrition[1]}-month nutrition plan at DoctorCoach.`;
  if(translated===message) return href;
  url.searchParams.set('text',translated);
  return url.toString();
}
