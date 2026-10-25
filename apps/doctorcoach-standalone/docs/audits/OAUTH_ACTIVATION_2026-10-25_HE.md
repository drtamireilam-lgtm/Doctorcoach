# הפעלת Google ו־Apple ב־LAB — 25.10.2026

## מצב כולל: BLOCKED / PARTIAL — לא הושלמה כניסה אמיתית

נבדקו קוד OAuth ו־OTP, PKCE, שמירת session, רענון, יציאה, מיפוי זהות, הרשאות, דוחות 24–25 באוקטובר ו־PR46. בסיס העבודה הוא `3303292328e8fe664b4cd944224350aa13adcaa5` מענף PR46. בדיקות GitHub של הבסיס עברו בריצה 40192654502. לא בוצעה פריסה, מיזוג ל־main או שינוי משתמשים/סכמה מרוחקת.

## מה כבר קיים ומה אומת

- כניסה ל־Google/Apple דרך Supabase PKCE כבר ממומשת. כתובת הספק קבועה, callback של האפליקציה קבוע, ויעד החזרה הפנימי מוצפן ונבדק.
- cookie זמני: Secure/HttpOnly/SameSite=Lax, הצפנת AES-GCM הקשורה ל־origin, זמן חיים עשר דקות. Cookie האפליקציה אטום, Secure/HttpOnly/SameSite=Strict.
- Supabase מנהל state מול ספק הזהות. האפליקציה משתמשת ב־PKCE וב־cookie הקשור לדפדפן; אינה מממשת nonce של זרימת ID-token מקומית. אין לכבות בדיקות nonce אצל הספק.
- קבלת זהות מתבססת על אימות server-side של הטוקן המדויק באמצעות `/user`, issuer/subject/session ועל RPC לבדיקת session פעיל. access/refresh token אינם מוחזרים ל־JavaScript בדפדפן.
- דוא״ל אינו פותר בעלות ב־D1; הרשאות Doctor/Coach/Admin אינן נלקחות מ־user_metadata. חשבון חדש דורש פעולה מפורשת. חשבונות צוות שמורים אינם נרשמים אוטומטית כחדשים.
- ביטול/כשל OAuth משמר session קודם; התחברות מוצלחת מבטלת את session האפליקציה המוחלף. קישור legacy כולל חתימה, תוקף, אישור מפורש ומניעת replay.
- PR46 מוסיף רציפות שפה לקישורי כניסה/יציאה וליעד החזרה. השינויים נכללים בענף הזה, אך נצפתה ב־LAB גרסה ישנה יותר שבה קישור החזרה באנגלית עדיין חסר lang.

## ממצא פתוח מהותי: קישור זהויות אוטומטי במעלה הזרימה

תיעוד Supabase העדכני אומר ש־Auth מקשר אוטומטית זהויות בעלות כתובת דוא״ל זהה ומאומתת לאותו user. לכן גם כשהאפליקציה פותרת בעלות לפי issuer/subject בלבד, provider חדש עלול לקבל אותו subject שכבר ממופה ב־D1. מימוש קישור legacy אינו מהווה הסכמה מפורשת לקישור ספק Google/Apple נוסף.

זהו פער מול הדרישה המחמירה של הפרויקט; **לא הוכחה השתלטות על חשבון בפועל**. אין להציג את הכלל הקיים ״איננו ממזגים לפי דוא״ל״ כהוכחה שהדרישה מתקיימת גם ב־Supabase. הפעלת הספקים למשתמשים קיימים צריכה להמתין למימוש ואימות של קישור ספק מפורש עם הוכחת בעלות נוספת בחשבון הקיים, מדיניות הרשאה הנשמרת בצד השרת ובדיקות ספק אמיתיות. אין לכבות email verification, לבצע merge לפי metadata או למחוק זהויות כדי לעקוף זאת. לא שונתה מדיניות חשבונות קיימת ללא פתרון מלא.

מקור: https://supabase.com/docs/guides/auth/auth-identity-linking

## תצפיות חיות וגישה לשירותים

| תחום | סטטוס | מה אומת בפועל |
|---|---|---|
| Supabase LAB | PASS חלקי | connector זיהה DoctorCoach-Staging, project ref נכון ו־ACTIVE_HEALTHY |
| בדיקת session מרוחקת | PASS בקריאת קוד/הרשאות | RPC קיים; public wrapper הוא INVOKER; הפונקציה הפרטית בודקת auth.uid, session_id, תוקף/ביטול/איסור/חלונות זמן. anon אינו רשאי לבצע; authenticated רשאי. לא בוצעה בדיקת טוקן של משתמש אמיתי |
| Google ב־LAB | BLOCKED | הכפתור מושבת ומציג Awaiting provider setup. לא נצפתה התחברות ספק אמיתית |
| Apple ב־LAB | BLOCKED | אותו מצב; חשבון Apple ששימש לכניסה למנהל אינו בדיקת DoctorCoach |
| OTP ב־LAB | PARTIAL | טופס קוד הדוא״ל זמין; לא נשלח קוד ולא הושלמה כניסה ל־DoctorCoach בסבב זה |
| הגדרות Supabase Auth | BLOCKED | כלי connector זמינים ל־DB, אך לא ל־Auth management; לוח הניהול דרש התחברות. ההתחברות הובילה ל־GitHub/Apple ולאישור הרשאת Supabase לקריאת דוא״ל בלבד; טרם אומתה חזרה לפרויקט |
| Google Cloud | BLOCKED | לוח OAuth הציג Site Unavailable בסביבת הדפדפן. לא הוכח שהשירות אינו זמין למשתמש |
| Apple Developer | BLOCKED | מסך כניסה; Membership/Team/App/Service/Key לא אומתו |
| Cloudflare | BLOCKED | לוח הניהול מציג כניסה ו־Wrangler דיווח שאינו מאומת. לא ניתן לאמת רשימת secrets/גרסת Worker מרוחקת |
| פנייה ב־HTTP מהטרמינל ל־LAB | BLOCKED | Cloudflare השיב 403/code1010; לא פורש כתגובה של שער OAuth ולא נעשה ניסיון לעקוף |

לא נקראו רשומות מטופלים או משתמשי auth. בקריאת advisors התקבלו אזהרות SECURITY DEFINER בפונקציות צוות קיימות, RLS ללא policies בשתי טבלאות והגנת סיסמאות דלופות כבויה. אלה אינם הוכחה לפריצת הרשאות; לא שונו grants או RLS. קוד ה־session RPC הרלוונטי נבדק בנפרד.

## שינויים שבוצעו בסבב זה

1. בדיקת OAuth UI השתמשה בנתיב Chrome קבוע של Windows ונכשלה ב־Linux. היא מקבלת כעת `DC_OAUTH_CHROMIUM`, או את הדפדפן הרגיל של Playwright. שרת הבדיקה נסגר גם אם הדפדפן אינו מצליח להיפתח/להיסגר.
2. CI בוחר את Chrome שב־runner, מפעיל את מסך ההתחברות האמיתי מול ספקים סינתטיים ושומר דוח וצילומים. בדיקות אלה **אינן כניסה אמיתית** ל־Google/Apple.
3. כפתור הדוא״ל מציג `Continue with Email` / `המשך עם דוא"ל`; מנגנון שליחת קוד OTP נותר קיים. נוספה רגרסיה לשלוש האפשרויות בשתי השפות ולמניעת כפתורים כפולים.
4. נוסף סינון CI ל־PR מדורג מעל ענף PR46. לא נוספה פעולת פריסה.

## תוצאות בדיקות

| בדיקה | סטטוס | ראיה/גבול |
|---|---|---|
| שחזור כשל דפדפן Windows | PASS | הסקריפט נכשל לפני התיקון כי executable לא קיים ב־Linux |
| רגרסיית כפתור דוא״ל לפני/אחרי | PASS | כשל על Continue with Email לפני התיקון; לאחריו עברה |
| כלל בדיקות האפליקציה | PASS | 1,449 עברו, 0 נכשלו, 0 דולגו; כולל OAuth/OTP/session/roles/import/training/learning/calendar |
| בדיקות אימות ממוקדות | PASS | 44 עברו |
| TypeScript | PASS | tsc --noEmit |
| lint בקבצים ששונו | PASS | אפס שגיאות ואזהרות; כלל האפליקציה עדיין בעל חוב lint מהסבבים הקודמים |
| בניית LAB מבודד | PASS | DC_ISOLATED_STAGING_BUILD=true npm run build:standalone |
| יעד LAB סטטי | PASS | נבדק dist/server/wrangler.json מול המשאבים הנדרשים |
| Worker HTTP סינתטי | PASS | OTP, session, refresh/logout, role isolation, private media, RIR, next-set load, היסטוריה וקישור legacy; ספק סינתטי בלבד |
| ביקורת עצמאית | PASS | לא נמצאו חסמים בתיקון הממוקד; שופר cleanup בעקבות הערה קטנה |
| Chrome UI מקומי | BLOCKED | אין executable מקומי; בדיקת הדפדפן המלאה תבוצע ב־CI |
| iPhone Safari | NOT TESTED | לא נבדק מכשיר פיזי |
| Android Chrome | NOT TESTED | לא נבדק מכשיר פיזי |
| Desktop Safari | NOT TESTED | אינו זמין בסביבה |
| Desktop Chrome — ספק אמיתי | NOT TESTED | ב־LAB נצפה המסך בלבד; לא הושלם round trip |
| PWA/session אחרי סגירת דפדפן | NOT TESTED | דורש חשבון LAB מחובר ומכשיר/דפדפן מתאים |
| Calendar חיצוני | NOT TESTED | בדיקות הקוד קיימות; אינטגרציות חיצוניות כבויות במכוון בתצורת LAB. לא חובר יומן Production |

## הגדרות מדויקות להשלמה לאחר פתיחת הגישה

### Google

- לבחור פרויקט Google Cloud ייעודי ונכון; לבדוק Branding, Audience, Test users ומצב פרסום. לא להניח ששם הפרויקט הוא Client ID.
- ליצור/לבדוק OAuth Client מסוג Web application. Authorized JavaScript origin: `https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev`.
- Authorized redirect URI אצל Google: `https://jbfkzkzcznfacsjdawmf.supabase.co/auth/v1/callback`.
- להכניס Client ID אמיתי ו־Client Secret ישירות ל־Google provider ב־Supabase LAB, ללא העתקה לצ׳אט, Git או דוח. scope מינימלי openid/email/profile בלבד; אין הרשאת Calendar.

### Apple

- לבדוק Apple Developer membership ו־Team ID; App ID עם Sign in with Apple ו־Services ID לאתר.
- בזרימת Supabase web OAuth, Website domain של Services ID הוא `jbfkzkzcznfacsjdawmf.supabase.co` וה־return URL הוא `https://jbfkzkzcznfacsjdawmf.supabase.co/auth/v1/callback`.
- Services ID ראשון ב־Client IDs של Supabase; מפתח חתימה, Key ID ו־Team ID מאומתים. Client secret נוצר ומוזן בסביבה מאובטחת, לא כאן. נדרש חידוש לכל היותר בכל שישה חודשים.
- אין מידע מספיק כדי לקבוע שהמשתמש אינו חבר Apple Developer; זו בדיקה חסומה, לא קביעה שאין membership.

### Supabase / Worker

- Site URL: `https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev`.
- Redirect allowlist מדויק: `https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev/auth/oauth/callback`. זו כתובת שונה מה־callback שמוגדר אצל Google/Apple; אין להחליף ביניהן או להוסיף wildcard.
- לשמר OTP, אישור דוא״ל ו־nonce checks; לפתור קודם את דרישת קישור הזהויות המפורש.
- Worker דורש DC_SUPABASE_PUBLIC_KEY ו־DC_SESSION_KEY מאובטחים, בנוסף למשתני ה־LAB הקיימים. OAuth Client Secrets נשמרים ב־Supabase; אין צורך להפיץ אותם ל־frontend או ל־Worker.
- אחרי הרשאת Cloudflare: לאמת חשבון, בעלות במשאבי D1/R2, migrations ללא פעולה הרסנית, secrets לפי שמות בלבד, קומיט מדויק וגיבוי/אפשרות rollback. לפרוס רק doctorcoach-isolated-staging, לאמת version ואז לבדוק כניסות ספק אמיתיות ו־OTP, ביטול, שפה, return target, רענון, logout, נתונים והרשאות.

## הפעולה המינימלית הנדרשת מהבעלים

להשלים את אישור ההרשאה המוצג ל־Supabase דרך GitHub (כתובות דוא״ל בקריאה בלבד), כדי שניתן יהיה לקרוא את הגדרות Auth בפועל. בהמשך תידרש התחברות Cloudflare וממשקי ספקים; אין לשלוח סיסמאות, קודים, secrets או p8 בצ׳אט.

מומלץ להמשיך מיד לאחר פתיחת גישת הניהול בבדיקת הגדרות Auth ובתכנון/מימוש מדיניות קישור ספק מפורשת. עד שהפער הזה נפתר וכל דרישות הקבלה נבדקו, הסטטוס הכולל נשאר BLOCKED.

מקורות רשמיים שנבדקו: https://supabase.com/docs/guides/auth/social-sign-in/auth-google ; https://supabase.com/docs/guides/auth/social-sign-in/auth-apple ; https://supabase.com/docs/guides/auth/auth-identity-linking ; https://supabase.com/changelog.md
