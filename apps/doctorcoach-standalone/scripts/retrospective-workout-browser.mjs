// Disposable local SQLite + real React editor; never connects to LAB or a provider.
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir, realpath } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { platform, client } from "../tests/platform-db.mjs";
import { retrospectiveWorkoutStore } from "../lib/retrospective-workout-store.ts";
import { defaultPrescription } from "../lib/training.ts";
const root = fileURLToPath(new URL("../", import.meta.url)),
  req = createRequire(join(root, "package.json"));
const { createServer } = await import(pathToFileURL(req.resolve("vite"))),
  { default: react } = await import(
    pathToFileURL(req.resolve("@vitejs/plugin-react"))
  ),
  { chromium, webkit } = req("@playwright/test");
const close = [],
  f = platform({ after: (fn) => close.push(fn) });
await f.connect();
await f.training.savePlan(client.userId, {
  ...defaultPrescription("goblet"),
  sets: 2,
  targetRpe: 8,
  occurrenceId: "synthetic-a",
  dayId: "1",
});
const store = retrospectiveWorkoutStore(f.db),
  fixture = join(root, ".sites-runtime/retrospective"),
  output = join(fixture, "evidence");
await mkdir(output, { recursive: true });
const css = [
  ...(await readFile(join(root, "app/layout.tsx"), "utf8")).matchAll(
    /import '\.\/(.+\.css)';/g,
  ),
]
  .map((m) => `import '../../app/${m[1]}';`)
  .join("\n");
await writeFile(
  join(fixture, "index.html"),
  '<html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/main.tsx"></script></html>',
);
await writeFile(
  join(fixture, "main.tsx"),
  `import React from 'react';import{createRoot}from'react-dom/client';import{RetrospectiveWorkout}from'../../components/retrospective-workout';import{LanguageProvider}from'../../components/language-provider';${css}\ncreateRoot(document.getElementById('root')).render(<LanguageProvider><main style={{maxWidth:850,margin:'auto',padding:12}}><RetrospectiveWorkout sessionId={new URLSearchParams(location.search).get('session')??undefined} controller={{auth:'ready',refresh:async()=>true}}/></main></LanguageProvider>);`,
);
const server = await createServer({
  configFile: false,
  root: fixture,
  cacheDir: join(fixture, "cache"),
  plugins: [
    react(),
    {
      name: "synthetic-api",
      configureServer(server) {
        server.middlewares.use(
          "/api/training/retrospective",
          async (req, res) => {
            try {
              let bytes = "";
              for await (const chunk of req) bytes += chunk;
              const payload = bytes ? JSON.parse(bytes) : null;
              const data =
                req.method === "GET"
                  ? new URL(req.url, 'http://localhost').searchParams.has('session')
                    ? await store.loadEntry(client.userId,new URL(req.url,'http://localhost').searchParams.get('session'))
                    : await store.load(client.userId)
                  : req.method === "PATCH"
                    ? await store.correct(client.userId, payload)
                  : req.method === "PUT"
                    ? await store.saveDraft(client.userId, payload)
                    : await store.submit(client.userId, payload);
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(data));
            } catch (e) {
              res.statusCode = e.status ?? 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: e.message, code: e.code }));
            }
          },
        );
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 37876,
    hmr: false,
    fs: { allow: [root, await realpath(join(root, "node_modules"))] },
  },
});
await server.listen();
const origin = server.resolvedUrls.local[0];
const results = [];
try {
  for (const engine of (process.env.DC_ENGINES ?? "chromium").split(",")) {
    const browser = await (engine === "webkit" ? webkit : chromium).launch({
      headless: true,
      ...(engine === "chromium"
        ? { executablePath: process.env.DC_CHROMIUM ?? "/usr/bin/chromium" }
        : {}),
    });
    try {
      for (const width of (process.env.DC_WIDTHS ?? '320,390,430,768,1363').split(',').map(Number))
        for (const language of (process.env.DC_LANGUAGES ?? 'he,en').split(',')) {
          f.sql.prepare("DELETE FROM retrospective_workout_drafts").run();
          f.sql
            .prepare("DELETE FROM training_sessions WHERE owner_id='client'")
            .run();
          const context = await browser.newContext({
            viewport: { width, height: 936 },
          });
          await context.route("**/*", (route) =>
            new URL(route.request().url()).origin === new URL(origin).origin
              ? route.continue()
              : route.abort(),
          );
          const page = await context.newPage(),
            errors = [];
          page.on("pageerror", (e) => errors.push(e.message));
          const t = (he, en) => (language === "en" ? en : he);
          await page.goto(origin + "?lang=" + language);
          await page
            .getByRole("button", {
              name: t("הוספת אימון שבוצע", "Log a completed workout"),
              exact: true,
            })
            .click();
          await page
            .getByRole("heading", {
              name: t("תיעוד אימון בדיעבד", "Record a past workout"),
            })
            .waitFor();
          await page
            .getByLabel(t("תאריך ביצוע האימון", "Workout date"))
            .fill("2026-10-20");
          await page.getByLabel(t("שעת ביצוע — אם זכורה (שעון ישראל)", "Workout time — if known (Israel time)")).fill("19:45");
          await page
            .getByLabel(t("או תרגיל בשם חופשי", "Or a free-text exercise"), {
              exact: true,
            })
            .fill("Synthetic exercise");
          await page
            .getByRole("button", {
              name: t("הוספה לאימון", "Add to workout"),
              exact: true,
            })
            .click();
          await page
            .getByRole("checkbox", {
              name: t("בוצע", "Performed"),
              exact: true,
            })
            .check();
          await page
            .getByLabel(
              t("משקל בסט", "Weight in set") + " 1 · Synthetic exercise",
            )
            .fill("33.125");
          await page
            .getByRole("button", {
              name: t("שמירת טיוטה", "Save draft"),
              exact: true,
            })
            .click();
          await page
            .getByText(t("טיוטה שמורה בחשבון", "Draft saved to your account"), {
              exact: true,
            })
            .waitFor();
          await page.reload();
          await page
            .getByRole("button", {
              name: t("הוספת אימון שבוצע", "Log a completed workout"),
              exact: true,
            })
            .click();
          await page
            .getByLabel(
              t("משקל בסט", "Weight in set") + " 1 · Synthetic exercise",
            )
            .waitFor();
          assert.equal(
            await page
              .getByLabel(
                t("משקל בסט", "Weight in set") + " 1 · Synthetic exercise",
              )
              .inputValue(),
            "33.125",
          );
          assert.equal(
            await page
              .getByLabel(
                t("כמות בסט", "Amount in set") + " 1 · Synthetic exercise",
              )
              .inputValue(),
            "",
          );
          const geometry = await page.evaluate(() => ({
            width: innerWidth,
            scroll: document.documentElement.scrollWidth,
            clipped: [
              ...document.querySelectorAll("input,select,button,textarea"),
            ]
              .filter(
                (e) =>
                  e.getClientRects().length &&
                  (e.getBoundingClientRect().right > innerWidth + 1 ||
                    e.getBoundingClientRect().left < -1),
              )
              .map((e) => e.outerHTML.slice(0, 160)),
          }));
          assert.ok(geometry.scroll <= width, JSON.stringify(geometry));
          assert.deepEqual(geometry.clipped, []);
          if (width <= 430) {
            const nativeWidths = await page.locator('input[type="date"],input[type="time"]').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().width));
            assert.ok(nativeWidths.every(value => value >= 180), 'Native date/time text needs room at narrow widths: ' + nativeWidths.join(','));
          }
          await page.screenshot({
            path: join(output, `${engine}-${language}-${width}.png`),
            fullPage: true,
          });
          await page
            .getByRole("button", {
              name: t("שמירת האימון בהיסטוריה", "Save workout to history"),
              exact: true,
            })
            .click();
          await page
            .getByText(
              t(
                "האימון נשמר בהיסטוריה בתאריך הביצוע.",
                "Workout saved to history on its performed date.",
              ),
              { exact: true },
            )
            .waitFor();
          const feed = await f.training.feed(client.userId);
          assert.equal(feed.history.length, 1);
          assert.equal(feed.history[0].retrospective.date, "2026-10-20");
          assert.equal(feed.history[0].retrospective.time, "19:45");
          assert.equal(feed.history[0].retrospective.performedAt, "2026-10-20T16:45:00.000Z");
          assert.notEqual(feed.history[0].retrospective.recordedAt, feed.history[0].retrospective.performedAt);
          assert.equal(feed.history[0].items[0].results[0].amount, null);
          assert.equal(feed.history[0].before, null);
          // Same shared screen loads a prescribed copy without prefilling performed numbers.
          await page
            .getByLabel(t("סוג התיעוד", "Workout source"))
            .selectOption("program");
          await page
            .getByRole("button", {
              name: t("טעינת התרגילים מהתוכנית", "Load program exercises"),
              exact: true,
            })
            .click();
          assert.equal(
            await page.locator(".retrospective-exercise").count(),
            1,
          );
          assert.equal(await page.locator(".retrospective-set").count(), 2);
          assert.equal(
            await page
              .locator(".retrospective-set input[type=number]")
              .first()
              .inputValue(),
            "",
          );
          assert.equal(
            (await f.training.getPlan(client.userId))[0].targetRpe,
            8,
          );
          // Open an existing completed record with the same production editor.
          await page.goto(origin + '?lang=' + language + '&session=' + feed.history[0].id);
          await page.getByRole('button',{name:t('תיקון התיעוד','Edit recorded workout'),exact:true}).click();
          const weight=page.getByLabel(t('משקל בסט','Weight in set')+' 1 · Synthetic exercise');
          await weight.waitFor();
          assert.equal(await weight.inputValue(),'33.125');
          assert.equal(await page.getByLabel(t('סוג התיעוד','Workout source')).isDisabled(),true);
          assert.equal(await page.getByRole('button',{name:t('שמירת טיוטה','Save draft'),exact:true}).count(),0);
          await weight.fill('35.5');
          await page.getByLabel(t('תאריך ביצוע האימון','Workout date')).fill('2026-10-21');
          const correctionGeometry=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
          assert.ok(correctionGeometry.scroll<=width,JSON.stringify(correctionGeometry));
          await page.screenshot({path:join(output,`${engine}-${language}-${width}-correction.png`),fullPage:true});
          await weight.scrollIntoViewIfNeeded();
          const fieldGeometry=await weight.evaluate(node=>({rect:node.getBoundingClientRect().toJSON(),style:getComputedStyle(node).visibility,parent:node.parentElement.outerHTML}));
          assert.ok(fieldGeometry.rect.width>=40 && fieldGeometry.rect.height>=40,JSON.stringify(fieldGeometry));
          assert.equal(await weight.evaluate(node=>{const r=node.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===node;}),true,'Save controls must not cover the weight entry');
          await page.screenshot({path:join(output,`${engine}-${language}-${width}-correction-fields.png`)});
          // A failed write leaves edits available for manual retry.
          await page.route('**/api/training/retrospective',async route=>{
            if(route.request().method()==='PATCH')await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Synthetic unavailable'})});
            else await route.continue();
          });
          await page.getByRole('button',{name:t('שמירת התיקון','Save correction'),exact:true}).click();
          await page.getByRole('alert').waitFor();
          assert.equal(await weight.inputValue(),'35.5');
          assert.equal((await f.training.feed(client.userId)).history[0].version,feed.history[0].version);
          await page.unroute('**/api/training/retrospective');
          await page.getByRole('button',{name:t('שמירת התיקון','Save correction'),exact:true}).click();
          await page.getByText(t('התיקון נשמר. הגרסה הקודמת נשמרה ביומן השינויים.','Correction saved. The previous version is retained in the audit history.'),{exact:true}).waitFor();
          const corrected=(await f.training.feed(client.userId)).history[0];
          assert.equal(corrected.id,feed.history[0].id);
          assert.equal(corrected.retrospective.recordedAt,feed.history[0].retrospective.recordedAt);
          assert.equal(corrected.retrospective.date,'2026-10-21');
          assert.equal(corrected.items[0].results[0].weight,35.5);
          assert.equal(f.sql.prepare('SELECT count(*) AS n FROM retrospective_workout_revisions').get().n,1);
          await page.reload();
          await page.getByRole('button',{name:t('תיקון התיעוד','Edit recorded workout'),exact:true}).click();
          await weight.waitFor();assert.equal(await weight.inputValue(),'35.5');
          assert.deepEqual(errors, []);
          results.push({ engine, width, language, result: "PASS", geometry, correctionGeometry, correction:'edit/failure/retry/reload PASS' });
          await context.close();
          console.log(`${engine} ${language} ${width} PASS`);
        }
    } finally {
      await browser.close();
    }
  }
} finally {
  await writeFile(
    join(output, "results.json"),
    JSON.stringify(results, null, 2),
  );
  await server.close();
  for (const fn of close) fn();
}
