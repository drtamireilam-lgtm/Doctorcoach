export type TourStep={section:string;target:string;title:string;text:string};
export const fullTourSteps:TourStep[]=[
 {section:'home',target:'',title:'בית',text:'כאן נמצאים קיצורי הדרך לאזורים המרכזיים. בטלפון: בית, התוכנית שלי, התיק שלי ועוד. הצוות וסיפורי ההתקדמות נמצאים בעוד.'},
 {section:'care',target:'',title:'התיק שלי',text:'בחרו נושא בתיק: פרטים ושאלונים, פציעות, מסמכים, הצוות או דיווחים. כל נושא נפתח בנפרד; כפתור החזרה מחזיר לרשימת הנושאים. מנוי ופרטיות נמצאים בהגדרות וחשבון דרך עוד.'},
 {section:'plan',target:'',title:'התוכנית שלי',text:'התוכנית שנדב הקצה לך ופתיחת האימון נמצאות כאן. בנייה עצמאית זמינה רק במנוי אישי פעיל. אפשר לעדכן מוכנות לפני שמתחילים.'},
 {section:'history',target:'',title:'התקדמות',text:'אימונים, ביצועים ו־e1RM, ובאותו אזור גם תזונה ומדידות ודיווחי כאב וטווח תנועה. בחרו את הנושא בשורת הניווט העליונה.'},
 {section:'library',target:'',title:'ספריית תרגילים',text:'חיפוש תרגילים, דגשי ביצוע וסרטוני הדרכה. הוספה עצמאית לתוכנית תלויה במסלול ובהרשאה שלך.'},
 {section:'learn',target:'body-map',title:'אנטומיה ולמידה',text:'בחרו אזור במפת הגוף, פתחו שריר ולמדו על התפקוד והתנועה. אפשר להשתמש גם בכפתורי האזורים שמתחת למפה.'},
 {section:'contact',target:'',title:'יצירת קשר',text:'הודעות לצוות, תורים, משוב וקישורי האינסטגרם מרוכזים כאן. בטלפון כפתור ״עוד״ פותח את התפריט המלא.'},
];
export function navigationTourSteps(_simpleMobile:boolean,_activeWorkout:boolean):TourStep[]{return fullTourSteps;}
