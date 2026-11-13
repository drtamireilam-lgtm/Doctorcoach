import { cardioActivity } from "./cardio.ts";
import { exercises } from "./content.ts";
import {
  TrainingError,
  isRecord,
  defaultPrescription,
  withOccurrenceIds,
  targetRpeForSet,
  type PlanItem,
  type SessionExercise,
} from "./training.ts";
import { workoutDayId } from "./workout-days.ts";
import { israelDay } from "./workout-context.ts";
export class RetrospectiveConflict extends TrainingError {
  code: "duplicate_workout" | "stale_draft";
  constructor(message: string, code: "duplicate_workout" | "stale_draft") {
    super(message, 409);
    this.code = code;
  }
}
export class RetrospectiveTimeError extends TrainingError {
  code: "invalid_workout_time" | "ambiguous_workout_time" | "nonexistent_workout_time" | "future_workout_time";
  constructor(message: string, code: RetrospectiveTimeError["code"] = "invalid_workout_time") {
    super(message);
    this.code = code;
  }
}
export type RetrospectiveSet = {
  done: boolean;
  amount: number | null;
  weight: number | null;
  actualRpe: number | null;
};
export type RetrospectiveExercise = {
  id: string;
  exerciseId: string | null;
  name: string;
  sourceOccurrenceId?: string;
  sets: RetrospectiveSet[];
};
export type RetrospectiveDraft = {
  requestId: string;
  version: number;
  source: "program" | "free";
  programToken?: string;
  programId?: string | null;
  dayId?: string;
  date: string;
  time?: string;
  timeOccurrence?: "earlier" | "later";
  durationMinutes: number | null;
  before: number | null;
  after: number | null;
  note: string;
  exercises: RetrospectiveExercise[];
  acknowledgeDuplicate?: boolean;
};
export type RetrospectiveMetadata = {
  updatedAt?: string;
  correctionFingerprint?: string;
  source: "program" | "free";
  date: string;
  recordedAt: string;
  performedAt?: string | null;
  time?: string | null;
  timeZone?: "Asia/Jerusalem";
  timeOccurrence?: "earlier" | "later";
  durationMinutes: number | null;
  before: number | null;
  prescription: PlanItem[];
  requestFingerprint: string;
};
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function optionalNumber(
  value: unknown,
  max: number,
  min = 0,
  half = false,
): number | null {
  if (value == null) return null;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (half && !Number.isInteger(value * 2))
  )
    throw new TrainingError("ערך אימון אינו בטווח המותר.");
  return value;
}
export function israelDateStart(day: string) {
  let time = Date.parse(day + "T00:00:00Z");
  for (let n = 0; n < 3; n++) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jerusalem",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(time);
    const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    const local = Date.parse(
      `${v.year}-${v.month}-${v.day}T${v.hour}:${v.minute}:${v.second}Z`,
    );
    time += Date.parse(day + "T00:00:00Z") - local;
  }
  return new Date(time).toISOString();
}
// Resolve wall-clock input using the IANA zone, never the device/server zone.
// Nearby zone offsets detect both spring gaps and autumn overlaps, including historical offsets with seconds.
export function israelWorkoutTime(day: string, time: string, occurrence?: "earlier" | "later") {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new RetrospectiveTimeError("בחרו שעת ביצוע תקינה.");
  const target = `${day}T${time}`;
  const wall = Date.parse(`${target}:00Z`);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  const matches: string[] = [];
  const offsets = new Set<number>();
  for (let n = -8; n <= 8; n++) {
    const probe = wall + n * 6 * 3600000;
    const v = Object.fromEntries(formatter.formatToParts(probe).map(p => [p.type, p.value]));
    offsets.add(Date.parse(`${v.year}-${v.month}-${v.day}T${v.hour}:${v.minute}:${v.second}Z`) - probe);
  }
  for (const offset of offsets) {
    const candidate = wall - offset;
    const v = Object.fromEntries(formatter.formatToParts(candidate).map(p => [p.type, p.value]));
    if (`${v.year}-${v.month}-${v.day}T${v.hour}:${v.minute}` === target)
      matches.push(new Date(candidate).toISOString());
  }
  matches.sort();
  if (!matches.length) throw new RetrospectiveTimeError("השעה שנבחרה אינה קיימת בישראל עקב מעבר לשעון קיץ. בחרו שעה אחרת.", "nonexistent_workout_time");
  if (matches.length > 1 && !occurrence)
    throw new RetrospectiveTimeError("השעה מופיעה פעמיים במעבר לשעון חורף. בחרו הופעה ראשונה או שנייה.", "ambiguous_workout_time");
  return occurrence === "later" ? matches[matches.length - 1] : matches[0];
}
export function parseRetrospectiveWorkout(
  value: unknown,
  plan: PlanItem[],
  now = new Date(),
  draft = false,
) {
  if (
    !isRecord(value) ||
    typeof value.requestId !== "string" ||
    !uuid.test(value.requestId) ||
    !Number.isInteger(value.version) ||
    Number(value.version) < 0 ||
    !["program", "free"].includes(String(value.source))
  )
    throw new TrainingError("פרטי רישום האימון אינם תקינים.");
  const date = value.date;
  if (
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date + "T12:00:00Z")) ||
    new Date(date + "T12:00:00Z").toISOString().slice(0, 10) !== date ||
    date < "1900-01-01" ||
    date > israelDay(now.toISOString())
  )
    throw new TrainingError("בחרו תאריך ביצוע תקין שאינו בעתיד.");
  if (value.time !== undefined && typeof value.time !== "string")
    throw new RetrospectiveTimeError("בחרו שעת ביצוע תקינה.");
  if (value.timeOccurrence !== undefined && !["earlier", "later"].includes(String(value.timeOccurrence)))
    throw new TrainingError("בחרו הופעת שעה תקינה.");
  const time = value.time || null;
  const timeOccurrence = value.timeOccurrence as "earlier" | "later" | undefined;
  const performedAt = time ? israelWorkoutTime(date, time, timeOccurrence) : null;
  if (performedAt && Date.parse(performedAt) > now.getTime())
    throw new RetrospectiveTimeError("שעת ביצוע האימון אינה יכולה להיות בעתיד.", "future_workout_time");
  if (typeof value.note !== "string" || value.note.length > 500)
    throw new TrainingError("ההערה מוגבלת ל־500 תווים.");
  if (
    !Array.isArray(value.exercises) ||
    value.exercises.length > 30 ||
    (!draft && !value.exercises.length)
  )
    throw new TrainingError("אפשר לתעד בין תרגיל אחד ל־30 תרגילים.");
  const source = value.source as "program" | "free",
    day = String(value.dayId ?? "1");
  const prescription =
    source === "program"
      ? withOccurrenceIds(plan).filter((i) => workoutDayId(i) === day)
      : [];
  if (source === "program" && !prescription.length)
    throw new TrainingError("יום האימון לא נמצא בתוכנית הנוכחית.");
  const ids = new Set<string>(),
    sources = new Set<string>();
  const rows: RetrospectiveExercise[] = value.exercises.map((raw) => {
    if (
      !isRecord(raw) ||
      typeof raw.id !== "string" ||
      !uuid.test(raw.id) ||
      ids.has(raw.id)
    )
      throw new TrainingError("מזהה תרגיל אינו תקין או כפול.");
    ids.add(raw.id);
    if (
      raw.sourceOccurrenceId !== undefined &&
      (source !== "program" ||
        typeof raw.sourceOccurrenceId !== "string" ||
        sources.has(raw.sourceOccurrenceId) ||
        !prescription.some(
          (i) =>
            (i.occurrenceId ?? `${workoutDayId(i)}:${i.exerciseId}`) ===
            raw.sourceOccurrenceId,
        ))
    )
      throw new TrainingError("הופעת התרגיל אינה שייכת ליום שנבחר.");
    if (typeof raw.sourceOccurrenceId === "string")
      sources.add(raw.sourceOccurrenceId);
    const original = prescription.find(
      (i) =>
        (i.occurrenceId ?? `${workoutDayId(i)}:${i.exerciseId}`) ===
        raw.sourceOccurrenceId,
    );
    const id = raw.exerciseId == null ? null : raw.exerciseId;
    if (
      id !== null &&
      (typeof id !== "string" ||
        (!exercises.some((e) => e.id === id) &&
          !(
            String(id).startsWith("cardio:") &&
            cardioActivity(String(id).slice(7))
          ) &&
          original?.exerciseId !== id))
    )
      throw new TrainingError("בחרו תרגיל מהספרייה או הזינו שם חופשי.");
    if (
      id === null &&
      (typeof raw.name !== "string" ||
        !raw.name.trim() ||
        raw.name.length > 200)
    )
      throw new TrainingError("הזינו שם לתרגיל החופשי.");
    if (!Array.isArray(raw.sets) || raw.sets.length < 1 || raw.sets.length > 20)
      throw new TrainingError("אפשר לתעד בין סט אחד ל־20 סטים לתרגיל.");
    const unit =
      original?.exerciseId === id
        ? original.unit
        : id
          ? defaultPrescription(id as string).unit
          : "reps";
    const sets = raw.sets.map((s) => {
      if (!isRecord(s) || typeof s.done !== "boolean")
        throw new TrainingError("פרטי הסט אינם תקינים.");
      const amount = optionalNumber(
        s.amount,
        String(id).startsWith("cardio:")
          ? 86400
          : unit === "reps"
            ? 100
            : unit === "seconds"
              ? 3600
              : 180,
        1,
      );
      if (amount !== null && !Number.isInteger(amount))
        throw new TrainingError("הכמות צריכה להיות מספר שלם.");
      return {
        done: s.done,
        amount,
        weight: optionalNumber(s.weight, 1000),
        actualRpe: optionalNumber(s.actualRpe, 10, 1, true),
      };
    });
    return {
      id: raw.id,
      exerciseId: id as string | null,
      name:
        id === null
          ? (raw.name as string).trim()
          : (exercises.find((e) => e.id === id)?.name ??
            cardioActivity(String(id).replace(/^cardio:/, ""))?.name ??
            original?.customExercise?.name ??
            String(id)),
      ...(typeof raw.sourceOccurrenceId === "string"
        ? { sourceOccurrenceId: raw.sourceOccurrenceId }
        : {}),
      sets,
    };
  });
  if (!draft && !rows.some((e) => e.sets.some((s) => s.done)))
    throw new TrainingError("סמנו לפחות סט אחד שבוצע.");
  const items: SessionExercise[] = rows.map((row) => {
    const original = prescription.find(
      (i) =>
        (i.occurrenceId ?? `${workoutDayId(i)}:${i.exerciseId}`) ===
        row.sourceOccurrenceId,
    );
    const same = original?.exerciseId === row.exerciseId;
    const base = same
      ? original!
      : row.exerciseId
        ? defaultPrescription(row.exerciseId)
        : {
            exerciseId: `retrospective:${value.requestId}:${row.id}`,
            unit: "reps" as const,
            sets: row.sets.length,
            reps: 1,
            weight: 0,
            notes: "",
          };
    if (base.cardio) {
      if (row.sets.length !== 1 || row.sets[0].weight !== null)
        throw new TrainingError(
          "אירובי מתועד כפעילות אחת עם משך בשניות, ללא שדה משקל.",
        );
      const set = row.sets[0],
        metrics = {
          ...(set.amount === null ? {} : { durationSeconds: set.amount }),
          ...(set.actualRpe === null ? {} : { rpe: set.actualRpe }),
        },
        at = performedAt ?? israelDateStart(date);
      return {
        ...base,
        occurrenceId: original?.occurrenceId ?? row.id,
        name: row.name,
        sets: 1,
        dayId: day,
        results: [],
        cardioResult: set.done
          ? {
              status: "completed",
              elapsedSeconds: 0,
              durationUnreported: set.amount === null,
              checkpointAt: at,
              startedAt: at,
              finishedAt: at,
              metrics,
              metricSources: {
                ...(set.amount === null
                  ? {}
                  : { durationSeconds: "manual" as const }),
                ...(set.actualRpe === null ? {} : { rpe: "manual" as const }),
              },
              actionIds: [],
            }
          : undefined,
      };
    }
    return {
      ...base,
      occurrenceId: original?.occurrenceId ?? row.id,
      name: row.name,
      sets: row.sets.length,
      dayId: day,
      warmupSets: undefined,
      warmupResults: undefined,
      targetRpe: same ? (base.targetRpe ?? null) : null,
      targetRpes: same
        ? row.sets.map((_, n) =>
            n < base.sets ? targetRpeForSet(base, n) : null,
          )
        : undefined,
      results: row.sets,
      notes: same ? base.notes : "",
      ...(!same ? { load: undefined } : {}),
    };
  });
  return {
    requestId: value.requestId,
    version: Number(value.version),
    source,
    date,
    time,
    timeOccurrence,
    performedAt,
    durationMinutes: optionalNumber(value.durationMinutes, 1440, 1),
    before: optionalNumber(value.before, 10),
    after: optionalNumber(value.after, 10),
    note: value.note.trim(),
    items,
    prescription: structuredClone(prescription),
    rows,
    at: performedAt ?? israelDateStart(date),
  };
}
