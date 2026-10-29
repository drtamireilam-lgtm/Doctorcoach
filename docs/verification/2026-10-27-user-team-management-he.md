# DoctorCoach — User & Team Management 3.0

27.10.2026 — מועמד מקומי שנבדק; אינו מופעל ב־LAB.

## בסיס העבודה

ענף: `codex/user-team-management-3-20261027`, מעל `codex/consultation-management-2-20261027` בקומיט `b2f80b4b4331cfb368314c82c5721013231977dc` (PR #54). נבדקו refs של המאגר ו־PRs עדכניים; #54 היה האחרון בעת הבדיקה. הוא כולל את CARDIO 2.0 מ־PR #52 ואת תשתית הייבוא של #53. לא נמצאו קובצי AGENTS.md בקבצים הנמצאים במאגר.

PR #9 עדיין פתוח כ־Draft בראש `739616ad7124f8b640e56e89b3b6e711510e5471`. הוא וענף `feature/lab-team-management` אינם אבות של הבסיס הנבחר. לא הועתקו ענפים ישנים בשלמותם מעל המימוש החדש. מנגנוני care/media/guards הושוו, ובידוד המאמנים והמדיה נבדק בבדיקות המועמד וב־HTTP של Worker בנוי.

Supabase משמש לאימות; `dc_identity_principals` ו־`dc_identity_aliases` ממפים למזהה קבוע ב־D1. הרשאות ונתוני היישום נמצאים ב־D1; אין הסתמכות על RLS של Supabase להגנתם.

## מומש ונבדק מקומית

- רשימת משתמשים עם שם, אימייל, תפקיד, מאמן, סטטוס ותאריך; חיפוש מילולי, מסננים ודפים של 50 משתמשים. בנייד: כרטיסי משתמש; במחשב: טבלה.
- רישום חדש יוצר רשומה Pending באמצעות trigger באותה עסקת יצירת הזהות. אין הרשאה מקצועית או ניהולית אוטומטית.
- בורר תפקיד מקצועי אחד, טיוטה מקומית, חלון אישור לפני/אחרי, ביטול ללא POST, נעילת שמירה כפולה והודעת הצלחה רק לאחר תשובת השרת.
- Owner ומזכירה לפי canonical user ID. רק Owner מעניק/מבטל מזכירה, עם אישור המציג גם את המזהה המדויק. אין הענקה לפי שם/אימייל ואין הרשאה אמיתית לשירה.
- הממשק חסום לעריכת הבעלים והחשבון המבצע. המזכירה מוגבלת ל־API ניהול המשתמשים; אינה מקבלת גישה לייעוצים, מסמכים, הודעות או תוכן רפואי גם אם יש לה תווית Physician או הרשאת אימייל ישנה.
- פעולות ניהול ותיקות משתמשות ב־`isAdmin`: כאשר המצב החדש פעיל, מקור ההרשאה הוא מטא־נתוני UID מאומתים מה־gateway. לפני ההפעלה נשמרת תאימות למנגנון הקודם. שינויי צוות ישנים נחסמים גם ב־store, ולא רק לפי נתיב URL.
- שיוך/העברה/הסרת מאמן, שינוי סטטוס ותפקיד נשמרים ב־D1 batch עם guard עדכני, בדיקת גרסה וביקורת אטומית. כל ניסיון כתיבה מקבל מזהה פנימי נפרד; retry של פעולה מוצלחת אינו משכפל אותה.
- קשר שנוצר מהשיוך הניהולי מסומן במקורו. בהעברה מבוטלת גישה שנבעה ממנו. קשר עצמאי תקף נשמר; קבלת הסכמה עצמאית בהמשך מקדמת את הקשר למסלול העצמאי. לא נמחקות תוכניות, אימונים או היסטוריה.
- מאמן צריך להיות פעיל ומאושר, עם אישור מקצועי פעיל. משתמש קיים במצב Legacy דורש אישור מפורש לפני בחירתו כמאמן חדש. מתאמן משויך מופיע ברשימת המאמן גם לפני השלמת שאלון התיק.
- השבתה חוסמת API מוגנים גם עם session קיים; ההתחברות מחדש אינה משחזרת הרשאה שבוטלה.
- תווית Physician אינה יוצרת הרשאה רפואית. הרשאה קלינית עצמאית קיימת נשמרת בשמירת תפקיד Physician ללא שינוי; שינוי תפקיד/השבתה אינו משאיר גישת allowlist דרך רשומת צוות חסרה.
- לוג append-only כולל יעד, מבצע, פעולה, לפני/אחרי, זמן ותוצאה; כישלון אינו שומר בקשה רגישה או פרטי יעד למבצע בלתי מורשה. היסטוריה מוצגת בשפה נוחה לקריאה, ללא תוכן רפואי.
- עברית RTL ואנגלית LTR, אישור native dialog עם מקלדת, רענון ובדיקת הרשאה מחודשת בחזרה לחלון. שינוי חשבון/כישלון הרשאה מסלק נתוני ניהול ישנים מהתצוגה.

## שינויי מסד — לא הוחלו מרחוק

1. `drizzle/0059_management_assignment_provenance.sql`: עמודת `management_derived` ב־`care_connections`, ברירת מחדל 0 לקשרים הקיימים; trigger שמזהה כתיבת הסכמה עצמאית במסלולים הקיימים.
2. `standalone/migrations/0002_user_management.sql`: `dc_managed_users`, `dc_management_grants`, `dc_management_audit`, אינדקסים, Pending trigger והגנת append-only. זהויות קיימות מועתקות כ־Legacy בלי לשנות נתוני צוות/תוכניות/רפואה. קישור מאוחר של חשבון ותיק באמצעות גשר הבעלות המאומת משמר את מעמדו הקודם כ־Legacy; אינו נרשם חדש ואינו מקבל הרשאה ניהולית. **אין bootstrap אוטומטי של Owner או מזכירה.**

SHA256:

```text
a7ae7172ea4b5a515f54a125fb06629f21d9bd2231d6f4ad1cd4621ff53d48c1  0059_management_assignment_provenance.sql
a9d02a481691ab0fe3631c613d0aa3cfe92fa2a1c44dd8890a4c4734075ff8b7  0002_user_management.sql
```

המערכת נשארת כבויה עד הפעלה מפורשת של `DC_USER_MANAGEMENT_ENABLED=true`. לפני ההפעלה נדרש אימות ואישור של מזהה הבעלים המדויק ויצירת הרשאתו באופן מבוקר. אין להריץ runner כללי או להניח שה־ledger משקף סכמה שהוחלה ידנית.

## ראיות בדיקה

| בדיקה | תוצאה |
|---|---|
| `pnpm test` באפליקציה | 1,648 עברו, 0 נכשלו/דולגו; מתוכן 22 בדיקות חדשות לניהול, gateway ומיגרציה |
| `npm test` בשורש | 10 foundation + 6 PostgreSQL/RLS עברו |
| TypeScript באפליקציה | עבר |
| בניית שורש | עברה; אזהרת גודל chunk קיימת |
| בניית Standalone ליעד isolated LAB | עברה; אזהרת סיווג routes של vinext |
| אימות תצורה סטטי ל־LAB | עבר; אינו אימות בעלות משאבים או מצב מרוחק |
| Worker בנוי עם workerd ו־D1/R2 מקומיים | עבר: אימות, OTP סינתטי, רישום וקישור, בידוד מדיה/מאמנים, ייעוצים, ניהול לפי UID, שיוך וביטול גישה, מזכירה והשבתת session |
| Chromium מקומי | 4 מסלולים: HE/EN × 390/1440; ביטול ללא POST, אישור תפקיד, שיוך/העברה, רענון, Audit, עריכה מקבילה, RTL/LTR, סילוק מידע לאחר שלילת הרשאה; ללא שגיאות JS או גלישת עמוד |
| מיגרציה ושחזור | עותק סינתטי עם סכמה עד 0058 וזהויות; גיבוי נפתח מחדש ונבדק; נתוני כל הטבלאות המקוריות נשמרו; `integrity_check=ok` |
| ESLint למודולים החדשים ולליבת האכיפה | ללא שגיאות או אזהרות; לא הורץ lint מלא לכל המאגר |
| סקירה עצמאית | תוקנו תאימות לפני מיגרציה, שימור הרשאה קלינית, שיוך לקשר מבוטל וחסימת מסלול staff הישן |

צילומים סינתטיים: [נייד בעברית](user-team-management-2026-10-27/he-390.png), [מחשב באנגלית](user-team-management-2026-10-27/en-1440.png). [תוצאות הדפדפן](user-team-management-2026-10-27/result.json).

הורדת הדפדפן הרגילה של Playwright נכשלה בארכיון קטוע. הבדיקות בוצעו בפועל עם Chromium 153 ממקור npm, בסביבת בדיקה זמנית מחוץ למאגר. אין טענה לבדיקה על iPhone/Safari או מכשיר פיזי. ה־CI משתמש בדפדפן שב־runner.

## LAB ומה חסום

`wrangler whoami` מחזיר `You are not authenticated`. לכן לא אומתו עצמאית D1 schema/ledger, גרסת Worker נוכחית, גיבוי מרוחק או שחזורו. דף `/auth/signin` ב־LAB החזיר HTTP 200; זה מוכיח זמינות ציבורית בלבד.

גרסה `5158f381-c03e-4942-96a6-5ef454429af2` ומיגרציה 0058 מדווחות ב־PR #54, **לא אומתו מרחוק בעבודה זו**. לא בוצעו מיגרציה מרוחקת, פריסה, שינוי משתמש אמיתי, merge ל־main או פעולה ב־Production.

**זמינות:** מועמד פיתוח שנבדק מקומית. אינו זמין לשימוש ב־LAB, ולא נחשב מאומת במלואו.

## המשך נדרש, לפי סדר

1. חיבור Cloudflare מאובטח בסביבה המתאימה; אין למסור סודות בצ׳אט. בדיקת קריאה בלבד של Worker, D1 UUID `0e7a9467-5758-4d6f-b52a-ee4385a2d37d`, הסכמה וה־ledger בפועל.
2. גיבוי מוגן ובדיקת שחזור של מצב ה־LAB האמיתי; השוואה לסכמה שעליה נבדק המועמד. בדיקת עבודה מקבילה ועדכניות PR #54 לפני כל פריסה.
3. זיהוי חשבון הבעלים לפי principal ו־alias מאומתים. הצגת SQL מדויק ל־0059/0002, bootstrap הבעלים ותצורת ההפעלה, עם hashes ופקודת פריסה מדויקת; קבלת אישור מפורש לפני כל שינוי מרוחק.
4. לאחר האישור בלבד: LAB, ואז קבלה עם חשבונות בדיקה ייעודיים: נרשם חדש, תפקיד, שני מאמנים, ביטול גישה, השבתה, Audit, פרטיות רפואית וטלפון/מחשב.
5. הרשאת Shira נשארת חסומה עד אימות חשבונה ואישור הבעלים לחשבון המדויק. אין ברירת מחדל לפי השם או האימייל.

אם קשר עצמאי למאמן בוטל בעבר, שיוך ניהולי אליו נדחה ב־409; אין שחזור שקט של הסכמה שנמשכה. נדרשת הסכמה מחודשת במסלול הקיים לפני שימוש בקשר זה. חיבורי workspace או הסכמות עצמאיות תקפות אינם נמחקים עקב מעבר המאמן האחראי.

## קבצים שהשתנו

- `.github/workflows/ci.yml`
- `apps/doctorcoach-standalone/app/api/account/route.ts`
- `apps/doctorcoach-standalone/app/api/admin/services/route.ts`
- `apps/doctorcoach-standalone/app/api/media/route.ts`
- `apps/doctorcoach-standalone/app/chatgpt-auth.ts`
- `apps/doctorcoach-standalone/app/globals.css`
- `apps/doctorcoach-standalone/app/page.tsx`
- `apps/doctorcoach-standalone/components/user-management.tsx`
- `apps/doctorcoach-standalone/drizzle/0059_management_assignment_provenance.sql`
- `apps/doctorcoach-standalone/lib/account-deletion.ts`
- `apps/doctorcoach-standalone/lib/appointments-store.ts`
- `apps/doctorcoach-standalone/lib/billing-sandbox.ts`
- `apps/doctorcoach-standalone/lib/care-server.ts`
- `apps/doctorcoach-standalone/lib/care-store.ts`
- `apps/doctorcoach-standalone/lib/community-store.ts`
- `apps/doctorcoach-standalone/lib/dashboard-store.ts`
- `apps/doctorcoach-standalone/lib/deletion-journal.ts`
- `apps/doctorcoach-standalone/lib/document-retention.ts`
- `apps/doctorcoach-standalone/lib/feedback-report.ts`
- `apps/doctorcoach-standalone/lib/google-calendar.ts`
- `apps/doctorcoach-standalone/lib/media-store.ts`
- `apps/doctorcoach-standalone/lib/membership-store.ts`
- `apps/doctorcoach-standalone/lib/onboarding-store.ts`
- `apps/doctorcoach-standalone/lib/pilot-store.ts`
- `apps/doctorcoach-standalone/lib/push-maintenance.ts`
- `apps/doctorcoach-standalone/lib/services-store.ts`
- `apps/doctorcoach-standalone/lib/staff.ts`
- `apps/doctorcoach-standalone/lib/team-photo-store.ts`
- `apps/doctorcoach-standalone/scripts/user-management-browser-smoke.mjs`
- `apps/doctorcoach-standalone/standalone/gateway.ts`
- `apps/doctorcoach-standalone/standalone/migrations/0002_user_management.sql`
- `apps/doctorcoach-standalone/standalone/scripts/runtime-smoke.mjs`
- `apps/doctorcoach-standalone/standalone/user-management.ts`
- `apps/doctorcoach-standalone/standalone/worker.ts`
- `apps/doctorcoach-standalone/tests/fixtures/user-management-browser.tsx`
- `apps/doctorcoach-standalone/tests/user-management-gateway.test.mjs`
- `apps/doctorcoach-standalone/tests/user-management-migration.test.mjs`
- `apps/doctorcoach-standalone/tests/user-management.test.mjs`
- `docs/superpowers/plans/2026-10-27-user-team-management.md`
- `docs/verification/2026-10-27-user-team-management-he.md`
- `docs/verification/user-team-management-2026-10-27/en-1440.png`
- `docs/verification/user-team-management-2026-10-27/he-390.png`
- `docs/verification/user-team-management-2026-10-27/result.json`
