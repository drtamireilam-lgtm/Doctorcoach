import type {reviewCatalog,ContentReview} from './content-review-store.ts';
type Item=Awaited<ReturnType<typeof reviewCatalog>>[number]&{state:string;review:ContentReview|null};
export const reviewLabels:Record<string,string>={pending:'טרם נבדק',approved:'אושר כתוכן לימודי',changes_requested:'נדרש תיקון',changed:'התוכן השתנה — נדרשת בדיקה חוזרת'};
const groups=[['train_around_recommended','אפשרות לשקילה'],['train_around_modify','דורש התאמה'],['rehab','שיקום'],['avoid_if_provocative','להימנע אם מעורר תסמינים']] as const;
export function contentReviewReport(items:Item[]):string{
 const lines=['# DoctorCoach — דוח בדיקת תוכן שיקום','',`מיפויים בדוח: ${items.length}`,'','האישור מתייחס לתוכן לימודי בלבד. הוא אינו אישור רפואי למתאמן מסוים.','שינויים בתוכן מחייבים בדיקה מחדש בתוך האפליקציה.'];
 for(const item of items){lines.push('',`## ${item.mapping.name_he}`,`מזהה: ${item.mapping.injury_id}`,`מצב נוכחי: ${reviewLabels[item.state]??item.state}`,`חתימת התוכן הנוכחי: ${item.contentHash}`);
  if(item.review)lines.push(`בדיקה אחרונה: ${item.review.reviewerName} · ${item.review.updatedAt} · גרסה ${item.review.version}`,`חתימת התוכן בבדיקה האחרונה: ${item.review.contentHash}`,'','### הערות הבדיקה',item.review.notes);
  for(const [key,label] of groups){lines.push('',`### ${label}`);if(!item.mapping[key].length)lines.push('אין תרגילים בקטגוריה זו.');
   for(const id of item.mapping[key]){const e=item.details.find(d=>d.sourceId===id)?.exercise;if(!e){lines.push(`תרגיל חסר: ${id}`);continue;}lines.push('',`#### ${e.name}`,`מזהה מקור: ${id} · מזהה תרגיל: ${e.id}`,`מינון: ${e.dose}`,e.desc,...e.cues.map(c=>`- ${c}`),`הקלה: ${e.easier}`,`התקדמות: ${e.harder}`);}
  }
 }
 return lines.join('\n')+'\n';
}
