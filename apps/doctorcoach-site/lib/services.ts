export type ServiceProvider = 'tamir' | 'nadav';
export type ServiceFormat = 'video' | 'clinic';
export type ServiceStatus = 'draft' | 'listed' | 'bookable';
export type ConsultationService = {
  id: string;
  title: string;
  description: string;
  provider: ServiceProvider;
  format: ServiceFormat;
  durationMinutes: number;
  priceAgorot: number;
  priceConfirmed: boolean;
  status: ServiceStatus;
  bookingUrl: string;
  paymentUrl: string;
  paymentInstructions: string;
  version: number;
  updatedAt: string | null;
};
export type PublicService = Omit<ConsultationService, 'version' | 'updatedAt'>;

export const providerNames: Record<ServiceProvider, string> = { tamir: 'ד״ר תמיר עילם', nadav: 'נדב רון' };
export const formatNames: Record<ServiceFormat, string> = { video: 'מפגש מקוון', clinic: 'מפגש פרונטלי' };
export const statusNames: Record<ServiceStatus, string> = { draft: 'טיוטה', listed: 'מוצג ללא הזמנה', bookable: 'פתוח להזמנות' };

// Defaults preserve the previous proposed services without writing on a read.
// Persisted rows override them, including drafts that hide a default service.
export const defaultServices: ConsultationService[] = [
  { id:'medical-video', title:'ייעוץ רפואי בזום', description:'שיחה מרחוק, בירור והכוונה ראשונית.', provider:'tamir', format:'video', durationMinutes:30, priceAgorot:30000, priceConfirmed:true, status:'listed', bookingUrl:'', paymentUrl:'', paymentInstructions:'', version:0, updatedAt:null },
  { id:'medical-clinic', title:'ייעוץ רפואי פרונטלי', description:'מפגש פנים אל פנים עם בדיקה לפי הצורך.', provider:'tamir', format:'clinic', durationMinutes:60, priceAgorot:50000, priceConfirmed:true, status:'listed', bookingUrl:'', paymentUrl:'', paymentInstructions:'', version:0, updatedAt:null },
  { id:'medical-followup', title:'עיון בבדיקות ובממצאים', description:'עיון בבדיקות דם ובממצאים נוספים ומתן דעה רפואית, לפי החומר שהועבר.', provider:'tamir', format:'video', durationMinutes:25, priceAgorot:20000, priceConfirmed:true, status:'listed', bookingUrl:'', paymentUrl:'', paymentInstructions:'', version:0, updatedAt:null },
];

export const coachingPackages = [
  {months:3, priceAgorot:120000, regularPriceAgorot:120000},
  {months:6, priceAgorot:220000, regularPriceAgorot:240000},
  {months:12, priceAgorot:450000, regularPriceAgorot:480000},
];

export class ServiceError extends Error {
  status: number;
  current?: ConsultationService;
  constructor(message: string, status = 400, current?: ConsultationService) {
    super(message); this.status = status; this.current = current;
  }
}

export function bookingLink(value: unknown): string {
  if (typeof value !== 'string' || value.length > 1000) throw new ServiceError('קישור היומן אינו תקין.');
  const text = value.trim();
  if (!text) return '';
  let url: URL;
  try { url = new URL(text); } catch { throw new ServiceError('יש להזין קישור מלא לאירוע ב־Calendly.'); }
  if (url.protocol !== 'https:' || !['calendly.com', 'www.calendly.com'].includes(url.hostname) || url.username || url.password || url.port || url.search || url.hash || !/^\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname)) {
    throw new ServiceError('הזינו קישור HTTPS לאירוע ב־calendly.com, ללא פרטי משתמש, פרמטרים או סימן שאלה.');
  }
  return url.toString();
}

export function externalLink(value:unknown):string {
  if(typeof value!=='string'||value.length>1500)throw new ServiceError('הקישור אינו תקין.');
  if(!value.trim())return '';
  let url:URL;try{url=new URL(value.trim());}catch{throw new ServiceError('יש להזין קישור HTTPS מלא.');}
  if(url.protocol!=='https:'||url.username||url.password||url.port||!url.hostname.includes('.')||url.hostname==='localhost'||/^[\d.]+$/.test(url.hostname)||url.hostname.endsWith('.local'))throw new ServiceError('יש להזין קישור HTTPS לאתר חיצוני מוכר.');
  return url.toString();
}

export function parseService(input: unknown): ConsultationService {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ServiceError('פרטי השירות אינם תקינים.');
  const value = input as Record<string, unknown>;
  if (typeof value.id !== 'string' || !/^[a-z0-9-]{3,64}$/.test(value.id)) throw new ServiceError('מזהה השירות אינו תקין.');
  if (!Number.isSafeInteger(value.version) || Number(value.version) < 0) throw new ServiceError('יש לטעון שוב את השירות לפני שמירה.');
  if (typeof value.title !== 'string' || value.title.trim().length < 3 || value.title.trim().length > 100) throw new ServiceError('שם השירות צריך להכיל 3–100 תווים.');
  if (typeof value.description !== 'string' || value.description.trim().length < 5 || value.description.trim().length > 1200) throw new ServiceError('תיאור השירות צריך להכיל 5–1,200 תווים.');
  if (value.provider !== 'tamir' && value.provider !== 'nadav') throw new ServiceError('בחרו נותן שירות.');
  if (value.format !== 'video' && value.format !== 'clinic') throw new ServiceError('בחרו אופן מפגש.');
  if (!Number.isInteger(value.durationMinutes) || Number(value.durationMinutes) < 5 || Number(value.durationMinutes) > 180) throw new ServiceError('משך המפגש צריך להיות 5–180 דקות.');
  if (!Number.isInteger(value.priceAgorot) || Number(value.priceAgorot) < 0 || Number(value.priceAgorot) > 1000000) throw new ServiceError('המחיר צריך להיות בין 0 ל־10,000 ₪, עד שתי ספרות אחרי הנקודה.');
  if (typeof value.priceConfirmed !== 'boolean') throw new ServiceError('יש לציין אם המחיר אושר.');
  if (!['draft', 'listed', 'bookable'].includes(String(value.status))) throw new ServiceError('בחרו מצב תצוגה.');
  const url = bookingLink(value.bookingUrl);
  const paymentUrl=externalLink(value.paymentUrl??'');
  if(typeof (value.paymentInstructions??'')!=='string'||String(value.paymentInstructions??'').length>1200)throw new ServiceError('הוראות התשלום ארוכות מדי.');
  if(paymentUrl&&!value.priceConfirmed)throw new ServiceError('חיבור קישור תשלום דורש אישור מחיר תואם בשקלים.');
  if (value.status === 'bookable' && (!url || !value.priceConfirmed)) throw new ServiceError('לפתיחת הזמנות דרושים קישור Calendly ואישור שהמחיר תואם ליומן.');
  return {
    id:value.id, title:value.title.trim(), description:value.description.trim(),
    provider:value.provider, format:value.format, durationMinutes:Number(value.durationMinutes),
    priceAgorot:Number(value.priceAgorot), priceConfirmed:value.priceConfirmed,
    status:value.status as ServiceStatus, bookingUrl:url, paymentUrl, paymentInstructions:String(value.paymentInstructions??'').trim(), version:Number(value.version), updatedAt:null,
  };
}

export function publicService(service: ConsultationService): PublicService {
  const { version: _version, updatedAt: _updatedAt, ...visible } = service;
  return { ...visible, bookingUrl: service.status === 'bookable' ? service.bookingUrl : '', paymentUrl:service.status!=='draft'&&service.priceConfirmed?service.paymentUrl:'' };
}

export function servicePrice(priceAgorot: number): string {
  return new Intl.NumberFormat('he-IL', { style:'currency', currency:'ILS', minimumFractionDigits:0, maximumFractionDigits:2 }).format(priceAgorot / 100);
}
