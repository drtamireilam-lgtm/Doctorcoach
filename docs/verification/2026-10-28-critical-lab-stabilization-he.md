# DoctorCoach — אימות ייצוב LAB, 28.10.2026

**מצב כולל: BLOCKED לפריסה. הבדיקה בוצעה בפועל; לא הושלמה גרסת LAB משולבת.**

מקור שנבדק: `8d0302273f33f5e7420666eb0169ba6b7ae45b53`, ענף `audit/full-lab-20261027`, PR #59. אין התחלה מחדש או מערכת כפולה. אין merge ל-main, פריסת Production, שינוי סודות, מחיקת נתונים, שינוי הרשאות משתמשי האפליקציה או אירוע ביומן אישי.

## VERIFIED — GitHub ומקור

כל ה-PRs המבוקשים נקראו מחדש דרך GitHub. כולם פתוחים ולא מוזגו; GitHub דיווח mergeable=true מול בסיסו של כל PR. זה אינו מוכיח שכל שילוב שרירותי ביניהם נטול קונפליקטים. מקור #59 נשלף ושוחזר מקומית; הוא מועמד האינטגרציה הקיים.

| PR | מצב | ניתן למיזוג מול הבסיס | HEAD | CI הקשור ל-HEAD |
| --- | --- | --- | --- | --- |
| [#44](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/44) | open / draft | כן | `ccfc5d61` | 40170419390 — success |
| [#45](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/45) | open / draft | כן | `0ea9c69a` | 40182769160 — success |
| [#46](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/46) | open / draft | כן | `33032923` | 40192654502 — success |
| [#47](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/47) | open / draft | כן | `0b70f97f` | 40200717945 — success |
| [#48](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/48) | open / draft | כן | `62d3bd6e` | 40202201363 — success |
| [#49](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/49) | open / draft | כן | `6059dbd2` | 40203205681 — success |
| [#50](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/50) | open / draft | כן | `7464660d` | 40212634615 — success |
| [#52](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/52) | open / draft | כן | `5b213b4f` | 40327260955 — success |
| [#53](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/53) | open / draft | כן | `0a819011` | 40288026919 — success |
| [#54](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/54) | open | כן | `b2f80b4b` | 40451342954 — success |
| [#55](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/55) | open / draft | כן | `df02a342` | 40457560974 — success |
| [#56](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/56) | open / draft | כן | `054dfb0a` | 40500058639 — success |
| [#57](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/57) | open / draft | כן | `7b489266` | 40508366747 — success |
| [#58](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/58) | open / draft | כן | `711e95aa` | 40635538207 — success |
| [#59](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/59) | open / draft | כן | `8d030227` | 40636451916 — success |

CI של #59 [40636451916](https://github.com/drtamireilam-lgtm/Doctorcoach/actions/runs/40636451916) הושלם בהצלחה בשני jobs. נבדקו גם ה-steps: browser workflows לניהול, ייעוץ, OAuth סינתטי, ייבוא, Cardio, אנטומיה, כניסה/חזרה ו-Premium Home עברו שם. אלו בדיקות CI עם fixtures, לא משתמש אמיתי ב-LAB. כלי workflow lookup מחזיר ריצות PR בעמוד הראשון; אין טענה לביקורת כל הריצות בכל הענפים.

#59 משלב את Calendar #57, ניהול #55/#56 ותיקוני כניסה/שפה עם Premium #58. שרשרת הייבוא #44/#45/#48/#49/#50/#53 והאירובי #52 כבר קיימת בו. לא בוצע cherry-pick או merge נוסף.

## VERIFIED — מיגרציה 0060 וסיבת החסם

`apps/doctorcoach-standalone/drizzle/0060_calendar_delivery_receipts.sql` מכילה ארבע פעולות ALTER TABLE על `google_calendar_sync`:

| עמודה | טיפוס | ערך ברירת מחדל |
| --- | --- | --- |
| last_attempt_at | TEXT | NULL |
| last_synced_at | TEXT | NULL |
| last_error_code | TEXT NOT NULL | מחרוזת ריקה |
| time_zone | TEXT NOT NULL | Asia/Jerusalem |

אין בה מחיקה, שינוי תורים או backfill של הצלחה היסטורית. היא אינה idempotent: הפעלה חוזרת לאחר החלה מלאה או חלקית תיכשל בעמודה כפולה. לכן אין להפעיל runner כללי או להסתיר שגיאות.

שחזור חדש עם הקוד בפועל ו-SQLite:
- נבנתה סכמת המקור עד 0059 והוכנסה רשומת outbox סינתטית.
- קריאות `googleCalendarStore(..., {}).statuses`, `details`, `pendingIds` נכשלו עם `no such column` לפני 0060, גם כאשר Calendar אינו מוגדר.
- אחרי החלת 0060 מקומית: שלוש הקריאות עברו; המצב נשאר disabled; lastSynced נשאר NULL; אזור הזמן נשמר Asia/Jerusalem.
- בדיקות calendar-migration ו-user-management-migration עברו: שימור נתונים קיימים ושחזור גיבוי סינתטי.

**לא אומת מרחוק:** האם 0060 כבר קיימת ב-D1 LAB, האם הוחלה חלקית, מיגרציות קודמות חסרות, ledger, drift, גיבוי מלא או שחזור שלו. רשימות המיגרציות שטרם הוחלו בדוח הקודם הן היסטוריה ולא ראיה עדכנית על המסד.

היעד הסטטי נבדק: Worker ו-D1 בשם doctorcoach-isolated-staging, D1 UUID `0e7a9467-5758-4d6f-b52a-ee4385a2d37d`, Supabase `jbfkzkzcznfacsjdawmf`. בדיקת target סטטית אינה הוכחת ownership או מצב הסודות המרוחק.

**מיגרציות שבוצעו ב-LAB במהלך המשימה: אפס.** רק מסדי בדיקות מקומיים שונו.

## VERIFIED — הרצות חדשות על המקור הקיים

| בדיקה | תוצאה בפועל |
| --- | --- |
| npm ci בשורש / התקנת pnpm נעולה באפליקציה | עברו |
| npm test באפליקציה | 1,690 עברו, 0 כשלו, 0 דולגו |
| npm test בשורש | 10 + 6 בדיקות אבטחה/RLS עברו |
| npm run typecheck באפליקציה | עבר |
| npm run build בשורש | עבר; אזהרת bundle גדול |
| DC_ISOLATED_STAGING_BUILD=true npm run build:standalone | עבר |
| check-isolated-staging על dist/server/wrangler.json | עבר — סטטי בלבד |
| runtime-smoke עם workerd/D1/R2 מקומיים | עבר |
| בדיקות מיגרציות Calendar וניהול בנפרד | 2/2 עברו |
| cardio-migration ו-native-activity-client | 9/9 עברו — חוזים מקומיים, ללא מכשיר |
| npm run lint מלא | **נכשל: 78 errors, 116 warnings** |
| התקנת Chromium מקומית | נכשלה: הורדה אינה ZIP תקין |
| Browser E2E מקומי חדש | BLOCKED בהיעדר Chromium |
| HTTP smoke ישיר מה-shell ל-LAB | לא הושלם: התקבל 403 במסלול הרשת הזה; אין להסיק תקלה ב-Worker |
| git diff --check לפני כתיבת הדוח | עבר |

runtime-smoke עבר על HTTP של Worker בנוי עם זהויות וספקים סינתטיים: כניסה, OTP שגוי, רישום, refresh, logout replay, תוכנית/אימון/RIR/היסטוריה, בידוד בין משתמשים, קבצים פרטיים, תפקידי צוות, העברת ושחרור שיוך, ביטול הרשאות מיידי, ייעוץ, כשל Calendar, retry, readback, מניעת כפילות, שינוי מועד וביטול.

lint נמדד מחדש על מקור #59 ללא שינוי קוד: כולל כללי hooks, refs, purity, קישורי Next וטיפוס any. אין טענה שה-lint נקי או שכל ממצא כזה הוא תקלה תפעולית. לא הושתקו כללים ולא בוצע refactor רוחבי לצורך הסתרת החוב.

## VERIFIED — LAB חי, בדיקה ציבורית בלבד

ב-Cloud Browser:
- נפתח בפועל [LAB](https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev/).
- Premium Home מופיע: Hero, CTA לאימון, ייעוץ, מדדים, צעדים, פעולות מהירות וניווט.
- Empty states מציגים שאין נתונים. צעדים: נתונים לא זמינים, עם הסבר שנדרש מקור זמין ומאושר; לא נצפה מספר מדומה.
- מתוך התוכנית נלחץ קישור ההתחברות הקטן: הגיע למסך הכניסה בעברית עם return_to לתוכנית.
- לאחר החלפה לאנגלית במסך הכניסה ולחיצה Back to DoctorCoach, חזר בפועל ל-`/?lang=en#plan` באנגלית.
- כפתור Google נעשה זמין לאחר בדיקת ספקים; Apple מציג ממתין להגדרת ספק.
- לא נשלח OTP ולא הושלמה כניסת Google. אין טענה שבדיקת קישור מוכיחה session, refresh או הרשאות משתמש מחובר.
- לא בוצעה בדיקה חדשה במכשיר iPhone/Android פיזי; matrix מובייל/desktop בעברית/אנגלית נבדק ב-CI הסינתטי בלבד.

Supabase זוהה מחדש דרך החיבור כ-DoctorCoach-Staging, ACTIVE_HEALTHY. זהו שירות הזהות; הוא אינו D1, ואין בכך אימות סכמת האימונים/ייעוצים.

## IMPLEMENTED BUT NOT VERIFIED — קיים ומשולב, אך ללא אימות חי מלא

| מערכת | מה אומת מקומית/ב-CI | מה חסר בפועל |
| --- | --- | --- |
| Calendar #57 | refresh/readback, event ID, idempotency, retry מפורש, כשל לעומת אישור, Asia/Jerusalem, מניעת הרשאות | OAuth של האפליקציה ליומן בדיקות, אירוע אמיתי, reschedule/cancel אמיתיים |
| Google / OTP | gateway ו-session סינתטיים; קישור חי מהתוכנית ושפה/חזרה | מסירת OTP אמיתית, Google אמיתי, refresh/logout במשתמש LAB אמיתי |
| ניהול #55/#56 | UID Owner/secretary, roles, transfer/removal, שרת ובידוד רפואי; fixtures | סכמה/הפעלה מרוחקת, Owner ושירה מזוהים ומורשים, שמירה בחשבון LAB |
| Import #53 והשרשרת | Excel רב-גיליונות, CSV ו-PDF טקסטואלי; review, שמירת draft, שיוך ואימון/reload מקומיים | העלאה עד פתיחה ושמירה בחשבון מתאמן אמיתי ב-LAB |
| Premium #58 | מופיע ב-LAB; matrix עיצוב CI עבר | נתונים אמיתיים של משתמש מחובר ובדיקה פיזית בטלפון |
| Cardio #52 | התמדה/התקדמות וחוזים מקומיים; ממשק CI | שמירת פעילות במשתמש LAB מחובר ומקור צעדים פיזי אמיתי |
| מסלול משתמש מלא | Worker מקומי עם ספקים סינתטיים | רישום/התחברות/שיוך/ייבוא/אימון/התקדמות ב-LAB מחובר |
| מסלול רפואי | lifecycle וגבולות הרשאה סינתטיים | מסלול חי נפרד עם חשבונות בדיקות מורשים |

ייבוא נשאר שמרני: fuzzy מספק הצעות בלבד; התאמה עמומה אינה הוכחה לבחירה אוטומטית. לא נוסף importer חדש. PDF סרוק אינו כלול.

Calendar מאוחסן ומופעל בצד השרת ולא תלוי בחיבור Google במכשיר המשתמש. קיים retry מפורש; לא נמצאה הוכחה במשימה זו ל-scheduler אוטומטי בשרת, ולכן אין טענה ל-retry אוטומטי מתוזמן.

## BLOCKED — חסמי גישה ופריסה

1. `wrangler whoami`: You are not authenticated. `wrangler d1 info` נכשל בשל היעדר CLOUDFLARE_API_TOKEN/גישה מאומתת. לא בוצע SQL מרוחק.
2. לא נמצא plugin Cloudflare בחיפוש החיבורים הזמינים. Dashboard נפתח למסך כניסה.
3. בקשת כניסה מאובטחת בוצעה; המשתמש בחר GitHub. התהליך הגיע למסך **Authorize Cloudflare**, עבור `drtamireilam-lgtm`, המבקש **Email addresses (read-only)**. ההרשאה החדשה לא אושרה על ידי הסוכן. נדרשת השלמת הסכמה זו לפני גישה לחשבון. בחירת שיטת כניסה אינה הוכחה שהכניסה הושלמה.
4. גם לאחר Dashboard login, Wrangler אינו בהכרח מחובר. יש להשלים את מסלול הגישה הרלוונטי בלי להעתיק cookies או לחשוף tokens.
5. אין עדיין סכמה/ledger, גיבוי מוגן מלא, restore מקומי של גיבוי LAB, או גרסת Worker/bindings עדכנית. **לא פרסתי.**
6. Google Calendar list החזיר יומן אישי primary בבעלותך ושני יומנים לקריאה בלבד. לא הוחזר יומן בדיקות משני בבעלותך עם הרשאת כתיבה; לא נוצר אירוע.
7. ניהול משתמשים דורש זיהוי קנוני של Owner ושירה לפני הענקת הרשאות. לא ניתן grant במהלך המשימה.
8. lint מלא אינו עובר. browser מקומי חדש חסום על הורדת Chromium. לא הוצגו בדיקות CI כאילו בוצעו על משתמש אמיתי.

הרשאת המשימה הקיימת מספיקה לביצוע מיגרציה בטוחה ולא הרסנית ב-LAB לאחר אימות גיבוי ושחזור; אין צורך באישור כללי נוסף לפריסת LAB שכבר התבקשה. חסמי הגישה, ההסכמה החדשה וזהות היומן/מנהלים נפרדים מכך.

## NOT STARTED — פעולות התלויות בחסמים

- schema/ledger/backup/restore מרוחקים; החלת המיגרציות המדויקות שיתבררו כחסרות ואימות העמודות לאחר מכן.
- פריסת המועמד המשולב ל-LAB ובדיקת גרסת Worker אחרי הפריסה.
- אירוע בדיקה אמיתי ביומן מאושר דרך DoctorCoach.
- מסלול משתמש ומסלול רפואי חיים עם חשבונות בדיקות מורשים.
- בריאות native/שעון ומכשירים פיזיים. לא התבקשו הרשאות בריאות חדשות.

## שינויים וקישורים

לא שונה קוד אפליקטיבי, SQL או הרשאות; לא נמצא בסיס בטוח לשינוי מסד מרוחק ללא הגישה והגיבוי. הקובץ היחיד שנוסף בסבב זה הוא דוח זה. התיקונים הקיימים נשמרו ולא פותחו מחדש.

- [PR האינטגרציה #59](https://github.com/drtamireilam-lgtm/Doctorcoach/pull/59)
- [מקור שנבדק](https://github.com/drtamireilam-lgtm/Doctorcoach/commit/8d0302273f33f5e7420666eb0169ba6b7ae45b53)
- [CI מאומת](https://github.com/drtamireilam-lgtm/Doctorcoach/actions/runs/40636451916)
- [תיקון הכניסה/שפה הקיים ב-LAB](https://github.com/drtamireilam-lgtm/Doctorcoach/commit/711e95aa7f0316f6e4c77f3032a67592e7468fd5)

פעולה ידנית נדרשת כעת: הסכמה למסך OAuth של Cloudflare/גישה מתאימה ל-LAB. בהמשך נדרשים יומן בדיקות משני מאושר וחשבונות בדיקות מזוהים; אין להעביר סיסמאות או tokens בצ'אט.
