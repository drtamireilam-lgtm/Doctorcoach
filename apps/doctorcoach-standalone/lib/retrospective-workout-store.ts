import { TrainingError, isRecord, withOccurrenceIds } from "./training.ts";
import { trainingStore, trainingSessionFromRow } from "./training-store.ts";
import { trainingAccess } from "./training-access.ts";
import { trainingWriteGuard } from "./training-write-guard.ts";
import { healthConsentGuard, requireHealthConsent } from "./consent-server.ts";
import { requireTrainingAllowed } from "./safety-store.ts";
import { combineCareGuards } from "./care-write-guard.ts";
import type { ProgramAuthorConfig } from "./program-author.ts";
import {
  israelDateStart,
  parseRetrospectiveWorkout,
  RetrospectiveConflict,
  type RetrospectiveMetadata,
} from "./retrospective-workout.ts";
function canonical(v: unknown): unknown {
  return Array.isArray(v)
    ? v.map(canonical)
    : isRecord(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, canonical(v[k])]),
        )
      : v;
}
async function hash(v: unknown) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(canonical(v))),
      ),
    ),
  ]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
const planColumns = [
  "id",
  "exercise_id",
  "sets",
  "reps",
  "unit",
  "weight",
  "notes",
  "target_rpe",
  "effort_scale",
  "target_rpes_json",
  "workout_section",
  "tempo_json",
  "reps_max",
  "weight_unspecified",
  "custom_exercise_json",
  "day_id",
  "occurrence_id",
  "warmup_sets_json",
  "side",
  "load_json",
  "cardio_json",
];
const selfSnapshotSql = `SELECT COALESCE(json_group_array(json(item)),'[]') AS fingerprint FROM (SELECT json_object(${planColumns.map((c) => `'${c}',${c}`).join(",")}) item FROM program_items WHERE owner_id=? ORDER BY id)`;
export function retrospectiveWorkoutStore(
  db: D1Database,
  config: ProgramAuthorConfig = {},
) {
  const training = trainingStore(db, config);
  async function context(owner: string) {
    const access = await trainingAccess(db, owner, config);
    const selfFingerprint =
      access.mode === "self"
        ? (await db
            .prepare(selfSnapshotSql)
            .bind(owner)
            .first<{ fingerprint: string }>())!.fingerprint
        : null;
    const plan = await training.getPlan(owner);
    return {
      access,
      selfFingerprint,
      plan,
      programId: access.programId,
      programToken: await hash([access.mode, access.programId, plan]),
    };
  }
  async function authorize(owner: string) {
    await requireHealthConsent(db, owner);
    await requireTrainingAllowed(db, owner);
    const ctx = await context(owner);
    if (!ctx.access.canStart)
      throw new TrainingError(
        "אין כרגע הרשאה לשמירת אימון. התוכנית וההרשאות הקיימות נשארות ללא שינוי.",
        403,
      );
    return ctx;
  }
  function checkProgram(
    p: Record<string, unknown>,
    ctx: Awaited<ReturnType<typeof context>>,
  ) {
    if (
      p.source === "program" &&
      (p.programToken !== ctx.programToken ||
        (p.programId ?? null) !== ctx.programId)
    )
      throw new TrainingError(
        "התוכנית השתנתה מאז פתיחת הטיוטה. טענו את התוכנית הנוכחית ובדקו שוב את התיעוד.",
        409,
      );
  }
  // The mutation guard covers the current entitlement, consent, readiness and exact coached snapshot.
  async function writeGuard(
    owner: string,
    ctx: Awaited<ReturnType<typeof context>>,
  ) {
    const base = combineCareGuards(
      trainingWriteGuard(
        owner,
        { planMode: ctx.access.mode, programId: ctx.programId },
        config,
      ),
      healthConsentGuard(owner),
    );
    if (ctx.access.mode === "coached")
      return combineCareGuards(base, {
        sql: ctx.programId?.startsWith("workspace-")
          ? "EXISTS(SELECT 1 FROM workspace_programs WHERE id=? AND client_id=? AND items_json=?)"
          : "EXISTS(SELECT 1 FROM care_programs WHERE id=? AND client_id=? AND items_json=?)",
        args: [ctx.programId!, owner, JSON.stringify(ctx.plan)],
      });
    return combineCareGuards(base, {
      sql: `(${selfSnapshotSql})=?`,
      args: [owner, ctx.selfFingerprint!],
    });
  }
  return {
    async load(owner: string) {
      const ctx = await context(owner);
      const row = await db
        .prepare(
          "SELECT payload_json,version,updated_at FROM retrospective_workout_drafts WHERE owner_id=?",
        )
        .bind(owner)
        .first<{ payload_json: string; version: number; updated_at: string }>();
      return {
        draft: row
          ? { ...JSON.parse(row.payload_json), version: row.version }
          : null,
        updatedAt: row?.updated_at ?? null,
        plan: withOccurrenceIds(ctx.plan),
        programId: ctx.programId,
        programToken: ctx.programToken,
        canSave: ctx.access.canStart,
      };
    },
    async saveDraft(owner: string, payload: unknown) {
      const ctx = await authorize(owner);
      if (!isRecord(payload)) throw new TrainingError("טיוטה לא תקינה.");
      checkProgram(payload, ctx);
      parseRetrospectiveWorkout(payload, ctx.plan, new Date(), true);
      if (
        await db
          .prepare("SELECT id FROM training_sessions WHERE id=? AND owner_id=?")
          .bind(payload.requestId, owner)
          .first()
      )
        throw new TrainingError(
          "האימון כבר נשמר בהיסטוריה; לא ניתן להחזיר אותו לטיוטה.",
          409,
        );
      const g = await writeGuard(owner, ctx),
        at = new Date().toISOString();
      const row =
        Number(payload.version) === 0
          ? await db
              .prepare(
                `INSERT INTO retrospective_workout_drafts(owner_id,payload_json,version,updated_at) SELECT ?,?,1,? WHERE ${g.sql} AND NOT EXISTS(SELECT 1 FROM training_sessions WHERE owner_id=? AND id=?) ON CONFLICT(owner_id) DO NOTHING RETURNING version`,
              )
              .bind(
                owner,
                JSON.stringify(payload),
                at,
                ...g.args,
                owner,
                payload.requestId,
              )
              .first<{ version: number }>()
          : null;
      // Compare-and-swap retains another tab’s newer draft instead of overwriting it.
      if (row) return { version: row.version, updatedAt: at };
      const updated =
        Number(payload.version) > 0
          ? await db
              .prepare(
                `UPDATE retrospective_workout_drafts SET payload_json=?,version=version+1,updated_at=? WHERE owner_id=? AND version=? AND json_extract(payload_json,'$.requestId')=? AND NOT EXISTS(SELECT 1 FROM training_sessions WHERE owner_id=? AND id=?) AND ${g.sql} RETURNING version`,
              )
              .bind(
                JSON.stringify(payload),
                at,
                owner,
                payload.version,
                payload.requestId,
                owner,
                payload.requestId,
                ...g.args,
              )
              .first<{ version: number }>()
          : null;
      if (!updated)
        throw new TrainingError(
          "הטיוטה השתנתה או שההרשאות השתנו. טענו מחדש לפני שמירה.",
          409,
        );
      return { version: updated.version, updatedAt: at };
    },
    async submit(owner: string, payload: unknown) {
      await requireHealthConsent(db, owner);
      await requireTrainingAllowed(db, owner);
      if (!isRecord(payload)) throw new TrainingError("רישום לא תקין.");
      const content = Object.fromEntries(
          Object.entries(payload).filter(
            ([key]) => key !== "version" && key !== "acknowledgeDuplicate",
          ),
        ),
        fingerprint = await hash(content);
      const old = await db
        .prepare("SELECT * FROM training_sessions WHERE id=? AND owner_id=?")
        .bind(payload.requestId, owner)
        .first<Parameters<typeof trainingSessionFromRow>[0]>();
      if (old) {
        const s = trainingSessionFromRow(old);
        if (s.retrospective?.requestFingerprint !== fingerprint)
          throw new TrainingError("מזהה האימון כבר שימש לתיעוד אחר.", 409);
        return s;
      }
      const ctx = await authorize(owner);
      checkProgram(payload, ctx);
      const parsed = parseRetrospectiveWorkout(payload, ctx.plan),
        g = await writeGuard(owner, ctx);
      const nextDay = new Date(
          Date.parse(parsed.date + "T12:00:00Z") + 86400000,
        )
          .toISOString()
          .slice(0, 10),
        end = israelDateStart(nextDay);
      const duplicate = await db
        .prepare(
          "SELECT id FROM training_sessions WHERE owner_id=? AND status='completed' AND COALESCE(finished_at,started_at)>=? AND COALESCE(finished_at,started_at)<? LIMIT 1",
        )
        .bind(owner, israelDateStart(parsed.date), end)
        .first();
      if (duplicate && payload.acknowledgeDuplicate !== true)
        throw new RetrospectiveConflict(
          "כבר קיים אימון בתאריך הזה. בדקו את ההיסטוריה ואשרו שזה אימון נוסף.",
          "duplicate_workout",
        );
      const metadata: RetrospectiveMetadata = {
        source: parsed.source,
        date: parsed.date,
        recordedAt: new Date().toISOString(),
        performedAt: parsed.performedAt,
        time: parsed.time,
        timeZone: "Asia/Jerusalem",
        ...(parsed.timeOccurrence ? { timeOccurrence: parsed.timeOccurrence } : {}),
        durationMinutes: parsed.durationMinutes,
        before: parsed.before,
        prescription: parsed.prescription,
        requestFingerprint: fingerprint,
      };
      const draftGuard =
        "(NOT EXISTS(SELECT 1 FROM retrospective_workout_drafts WHERE owner_id=?) AND ?=0 OR EXISTS(SELECT 1 FROM retrospective_workout_drafts WHERE owner_id=? AND version=? AND json_extract(payload_json,'$.requestId')=?))";
      const duplicateGuard =
        payload.acknowledgeDuplicate === true
          ? { sql: "1", args: [] as string[] }
          : {
              sql: "NOT EXISTS(SELECT 1 FROM training_sessions WHERE owner_id=? AND status='completed' AND COALESCE(finished_at,started_at)>=? AND COALESCE(finished_at,started_at)<?)",
              args: [owner, israelDateStart(parsed.date), end],
            };
      const count = parsed.items.reduce(
          (n, i) => n + i.results.filter((r) => r.done).length,
          0,
        ),
        planned = parsed.items.reduce((n, i) => n + (i.cardio ? 0 : i.sets), 0);
      await db.batch([
        db
          .prepare(
            `INSERT INTO training_sessions(id,owner_id,status,items_json,started_at,finished_at,pain_before,pain_after,planned_sets,completed_sets,plan_mode,program_id,finish_feedback_json,retrospective_json) SELECT ?,?,'completed',?,?,?,?,?,?,?,?,?,?,? WHERE ${g.sql} AND ${draftGuard} AND ${duplicateGuard.sql} ON CONFLICT DO NOTHING`,
          )
          .bind(
            parsed.requestId,
            owner,
            JSON.stringify(parsed.items),
            parsed.at,
            parsed.at,
            parsed.before ?? 0,
            parsed.after,
            planned,
            count,
            parsed.source === "program" ? ctx.access.mode : "self",
            parsed.source === "program" ? ctx.programId : null,
            JSON.stringify({ effort: null, note: parsed.note }),
            JSON.stringify(metadata),
            ...g.args,
            owner,
            parsed.version,
            owner,
            parsed.version,
            parsed.requestId,
            ...duplicateGuard.args,
          ),
        db
          .prepare(
            "DELETE FROM retrospective_workout_drafts WHERE owner_id=? AND version=? AND json_extract(payload_json,'$.requestId')=? AND EXISTS(SELECT 1 FROM training_sessions WHERE owner_id=? AND id=? AND json_extract(retrospective_json,'$.requestFingerprint')=?)",
          )
          .bind(
            owner,
            parsed.version,
            parsed.requestId,
            owner,
            parsed.requestId,
            fingerprint,
          ),
      ]);
      const row = await db
        .prepare("SELECT * FROM training_sessions WHERE id=? AND owner_id=?")
        .bind(parsed.requestId, owner)
        .first<Parameters<typeof trainingSessionFromRow>[0]>();
      if (!row)
        throw new TrainingError(
          "הטיוטה, התוכנית או ההרשאות השתנו. רעננו ובדקו גם אם נשמר אימון בתאריך הזה.",
          409,
        );
      const result = trainingSessionFromRow(row);
      if (result.retrospective?.requestFingerprint !== fingerprint)
        throw new TrainingError("מזהה האימון כבר שימש לתיעוד אחר.", 409);
      return result;
    },
  };
}
