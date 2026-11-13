"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { TrainingController } from "../hooks/use-training";
import { defaultPrescription, type PlanItem } from "../lib/training";
import type {
  RetrospectiveDraft,
  RetrospectiveExercise,
  RetrospectiveSet,
} from "../lib/retrospective-workout";
import { cardioActivities } from "../lib/cardio";
import { exercises } from "../lib/content";
import { workoutDayId, workoutDayLabel } from "../lib/workout-days";
import { israelDay } from "../lib/workout-context";
import { ExerciseNameSelect } from "./exercise-name-select";
import { Localize, useLanguage } from "./language-provider";
type Context = {
  draft: RetrospectiveDraft | null;
  plan: PlanItem[];
  programId: string | null;
  programToken: string;
  canSave: boolean;
};
const catalog = [
  ...exercises,
  ...cardioActivities.map((e) => ({
    ...e,
    en: e.nameEn,
    id: "cardio:" + e.id,
  })),
];
const blankSet = (): RetrospectiveSet => ({
  done: false,
  amount: null,
  weight: null,
  actualRpe: null,
});
const empty = (): RetrospectiveDraft => ({
  requestId: crypto.randomUUID(),
  version: 0,
  source: "free",
  date: israelDay(new Date().toISOString()),
  durationMinutes: null,
  before: null,
  after: null,
  note: "",
  exercises: [],
});
async function api<T>(method: string, body?: unknown, sessionId?: string): Promise<T> {
  const response = await fetch("/api/training/retrospective" + (sessionId ? `?session=${encodeURIComponent(sessionId)}` : ""), {
    method,
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const data = (await response.json()) as T & { error?: string; code?: string };
  if (!response.ok)
    throw Object.assign(
      new Error(data.error || "לא ניתן לשמור כרגע. נסו שוב."),
      { code: data.code },
    );
  return data;
}
function RetrospectiveWorkoutEditor({
  controller,
  sessionId,
}: {
  controller: Pick<TrainingController, "auth" | "refresh">;
  sessionId?: string;
}) {
  const en = useLanguage().language === "en",
    t = (he: string, eng: string) => (en ? eng : he),
    id = useId();
  const [open, setOpen] = useState(false),
    [context, setContext] = useState<Context | null>(null),
    [draft, setDraft] = useState<RetrospectiveDraft | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [selected, setSelected] = useState(""),
    [name, setName] = useState(""),
    [day, setDay] = useState("1"),
    [replace, setReplace] = useState(false),
    [saved, setSaved] = useState(false),
    [duplicateWarning, setDuplicateWarning] = useState(false),
    [reloadConfirmed, setReloadConfirmed] = useState(false);
  const lock = useRef(false),
    dirty = useRef(false);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  async function load(preserve = false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const data = await api<Context>("GET", undefined, sessionId);
      setContext(data);
      if (preserve) {
        setMessage(
          t(
            "מצב התוכנית עודכן. העריכה שלך נשארה במסך.",
            "Program context refreshed. Your edits remain in the editor.",
          ),
        );
        return;
      }
      const next = data.draft ?? empty();
      setDraft(next);
      setDay(next.dayId ?? workoutDayId(data.plan[0] ?? { exerciseId: "" }));
      setSaved(!!data.draft);
      setMessage(
        data.draft
          ? sessionId ? t("התיעוד השמור נטען לתיקון.", "Saved workout loaded for correction.") : t("הטיוטה השמורה נטענה.", "Your saved draft has been loaded.")
          : "",
      );
      dirty.current = false;
    } catch (e) {
      setError(
        en
          ? "Your changes were not saved. Review the current program or reload the saved draft, then try again."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  function change(patch: Partial<RetrospectiveDraft>) {
    setDraft((old) =>
      old
        ? {
            ...old,
            ...patch,
            acknowledgeDuplicate: patch.acknowledgeDuplicate ?? false,
          }
        : old,
    );
    if (patch.acknowledgeDuplicate === undefined) setDuplicateWarning(false);
    dirty.current = true;
    setSaved(false);
    setMessage("");
  }
  function rowChange(index: number, patch: Partial<RetrospectiveExercise>) {
    if (draft)
      change({
        exercises: draft.exercises.map((e, n) =>
          n === index ? { ...e, ...patch } : e,
        ),
      });
  }
  function setChange(
    row: number,
    index: number,
    patch: Partial<RetrospectiveSet>,
  ) {
    if (draft)
      rowChange(row, {
        sets: draft.exercises[row].sets.map((s, n) =>
          n === index ? { ...s, ...patch } : s,
        ),
      });
  }
  function add() {
    if (!draft || draft.exercises.length >= 30) return;
    const exercise = catalog.find((e) => e.id === selected);
    if (!exercise && !name.trim()) return;
    change({
      exercises: [
        ...draft.exercises,
        {
          id: crypto.randomUUID(),
          exerciseId: exercise?.id ?? null,
          name: exercise?.name ?? name.trim(),
          sets: [blankSet()],
        },
      ],
    });
    setSelected("");
    setName("");
  }
  function loadProgram() {
    if (!draft || !context || (draft.exercises.length && !replace)) return;
    const items = context.plan.filter((i) => workoutDayId(i) === day);
    change({
      source: "program",
      programToken: context.programToken,
      programId: context.programId,
      dayId: day,
      exercises: items.map((item) => ({
        id: crypto.randomUUID(),
        exerciseId: item.exerciseId,
        name:
          item.customExercise?.name ??
          catalog.find((e) => e.id === item.exerciseId)?.name ??
          item.exerciseId,
        sourceOccurrenceId:
          item.occurrenceId ?? `${workoutDayId(item)}:${item.exerciseId}`,
        sets: Array.from({ length: item.cardio ? 1 : item.sets }, blankSet),
      })),
    });
    setReplace(false);
  }
  async function save(complete: boolean) {
    if (!draft || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (complete) {
        const result = await api<{version:number}>(sessionId ? "PATCH" : "POST", draft);
        dirty.current = false;
        setSaved(false);
        setDraft(sessionId ? {...draft, version: result.version} : empty());
        const refreshed = await controller.refresh();
        setMessage(
          sessionId ? t("התיקון נשמר. הגרסה הקודמת נשמרה ביומן השינויים.", "Correction saved. The previous version is retained in the audit history.") : refreshed
            ? t(
                "האימון נשמר בהיסטוריה בתאריך הביצוע.",
                "Workout saved to history on its performed date.",
              )
            : t(
                "האימון נשמר. יש לרענן את ההיסטוריה כדי לראותו.",
                "Workout saved. Refresh history to view it.",
              ),
        );
      } else {
        const result = await api<{ version: number }>("PUT", draft);
        setDraft({ ...draft, version: result.version });
        dirty.current = false;
        setSaved(true);
        setMessage(
          t(
            "הטיוטה נשמרה בחשבון. היא עדיין אינה אימון שהושלם.",
            "Draft saved to your account. It is not yet a completed workout.",
          ),
        );
      }
    } catch (e) {
      const code = (e as Error & { code?: string }).code;
      const timeErrors: Record<string, string> = {
        invalid_workout_time: "Choose a valid workout time.",
        ambiguous_workout_time: "This Israel time occurred twice when daylight saving ended. Choose first or second occurrence.",
        nonexistent_workout_time: "This Israel time did not exist when daylight saving began. Choose another time.",
        future_workout_time: "The workout time cannot be in the future.",
      };
      const duplicate = code === "duplicate_workout";
      setDuplicateWarning(duplicate);
      setError(
        duplicate
          ? t(
              "כבר קיים אימון בתאריך הזה. בדקו את ההיסטוריה ואשרו שזה אימון נוסף.",
              "A workout already exists on this date. Check history and confirm that this is an additional workout.",
            )
          : en
            ? (code && timeErrors[code]) || "Your changes were not saved. Refresh the program context or explicitly reload the saved draft before retrying."
            : (e as Error).message,
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  const days = [...new Set(context?.plan.map(workoutDayId))];
  return (
    <Localize>
      <section className="panel retrospective-workout">
        <button
          className="button secondary"
          type="button"
          aria-expanded={open}
          aria-controls={id}
          disabled={controller.auth !== "ready" || busy}
          onClick={() => {
            setOpen(!open);
            if (!context) void load();
          }}
        >
          {sessionId ? t("תיקון התיעוד", "Edit recorded workout") : t("הוספת אימון שבוצע", "Log a completed workout")}
        </button>
        {open && (
          <div
            id={id}
            className="care-form retrospective-editor"
            dir={en ? "ltr" : "rtl"}
          >
            <h2>{sessionId ? t("תיקון אימון שבוצע", "Correct a recorded workout") : t("תיעוד אימון בדיעבד", "Record a past workout")}</h2>
            <p>
              {t(
                sessionId ? "מתקנים את הביצוע בלבד. התוכנית המקורית, מועד ההזנה והגרסאות הקודמות נשמרים." : "מתוך התוכנית או אימון חופשי. מזינים רק מה שזוכרים; שדות ריקים נשארים ללא דיווח.",
                sessionId ? "Correct what you performed. The original prescription, recording date and previous versions are retained." : "Use your program or log a free workout. Enter only what you remember; empty fields remain unreported.",
              )}
            </p>
            {busy && !draft && (
              <p role="status">
                {t("טוענים את הטיוטה…", "Loading your draft…")}
              </p>
            )}
            {error && (
              <p className="care-error" role="alert">
                {error}
              </p>
            )}
            {!draft && !busy && (
              <button
                type="button"
                className="button secondary"
                onClick={() => void load()}
              >
                {t("ניסיון נוסף", "Try again")}
              </button>
            )}
            {context && !sessionId && (
              <details>
                <summary>
                  {t(
                    "רענון תוכנית או טעינת טיוטה שמורה",
                    "Refresh program or reload saved draft",
                  )}
                </summary>
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  onClick={() => void load(true)}
                >
                  {t(
                    "רענון התוכנית בלי למחוק את העריכה",
                    "Refresh program without replacing edits",
                  )}
                </button>
                <label className="care-check">
                  <input
                    type="checkbox"
                    checked={reloadConfirmed}
                    onChange={(e) => setReloadConfirmed(e.target.checked)}
                  />
                  <span>
                    {t(
                      "להחליף את העריכה שבמסך בטיוטה השמורה",
                      "Replace the editor with the saved draft",
                    )}
                  </span>
                </label>
                <button
                  type="button"
                  className="text-button"
                  disabled={busy || !reloadConfirmed}
                  onClick={() => {
                    setReloadConfirmed(false);
                    void load();
                  }}
                >
                  {t("טעינת הטיוטה השמורה", "Reload saved draft")}
                </button>
              </details>
            )}
            {context && sessionId && <details>
              <summary>{t("טעינה מחדש של התיעוד השמור", "Reload the saved workout")}</summary>
              <label className="care-check"><input type="checkbox" checked={reloadConfirmed} onChange={e=>setReloadConfirmed(e.target.checked)}/><span>{t("להחליף את העריכה שבמסך בתיעוד השמור", "Replace current edits with the saved workout")}</span></label>
              <button type="button" className="button secondary" disabled={busy || !reloadConfirmed} onClick={()=>{setReloadConfirmed(false);void load();}}>{t("טעינה מחדש", "Reload saved workout")}</button>
            </details>}
            {message && (
              <p role="status" className="inline-note">
                {message}
              </p>
            )}
            {draft && context && (
              <form
                className="care-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void save(true);
                }}
              >
                <fieldset
                  disabled={busy || !context.canSave}
                  className="retrospective-fields"
                >
                  <div className="form-grid">
                    <label className="care-field">
                      {t("תאריך ביצוע האימון", "Workout date")}
                      <input
                        type="date"
                        required
                        min="1900-01-01"
                        max={israelDay(new Date().toISOString())}
                        value={draft.date}
                        onChange={(e) => change({ date: e.target.value })}
                      />
                    </label>
                    <label className="care-field">
                      {t("שעת ביצוע — אם זכורה (שעון ישראל)", "Workout time — if known (Israel time)")}
                      <input type="time" value={draft.time ?? ""}
                        onChange={e => change({ time: e.target.value, timeOccurrence: undefined })} />
                    </label>
                    {draft.time && <label className="care-field">
                      {t("במעבר לשעון חורף, אם השעה חזרה פעמיים", "If this time occurred twice when daylight saving ended")}
                      <select value={draft.timeOccurrence ?? ""} onChange={e => change({ timeOccurrence: e.target.value ? e.target.value as "earlier" | "later" : undefined })}>
                        <option value="">{t("לא רלוונטי / לא ידוע", "Not applicable / unknown")}</option>
                        <option value="earlier">{t("ההופעה הראשונה", "First occurrence")}</option>
                        <option value="later">{t("ההופעה השנייה", "Second occurrence")}</option>
                      </select>
                    </label>}
                    <label className="care-field">
                      {t(
                        "משך האימון בדקות — אם זכור",
                        "Duration in minutes — if known",
                      )}
                      <input
                        type="number"
                        min={1}
                        max={1440}
                        value={draft.durationMinutes ?? ""}
                        onChange={(e) =>
                          change({
                            durationMinutes:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  </div>
                  <label className="care-field">
                    {t("סוג התיעוד", "Workout source")}
                    <select
                      disabled={!!sessionId}
                      value={draft.source}
                      onChange={(e) => {
                        const source = e.target.value as "free" | "program";
                        change({
                          source,
                          programId:
                            source === "program" ? context.programId : null,
                          programToken:
                            source === "program"
                              ? context.programToken
                              : undefined,
                          exercises: draft.exercises.map((x) => ({
                            ...x,
                            sourceOccurrenceId: undefined,
                          })),
                        });
                      }}
                    >
                      <option value="free">
                        {t("אימון חופשי", "Free workout")}
                      </option>
                      <option value="program" disabled={!days.length}>
                        {t("מתוך התוכנית הנוכחית", "From my current program")}
                      </option>
                    </select>
                  </label>
                  {draft.source === "program" && !sessionId && (
                    <div className="care-form">
                      <p className="care-muted">
                        {t(
                          "נטען עותק מהתוכנית הנוכחית. שינויים כאן מתעדים את הביצוע ואינם משנים את תוכנית המאמן.",
                          "Load a copy of your current program. Changes here record what you did and do not change your coach’s program.",
                        )}
                      </p>
                      <label className="care-field">
                        {t("יום אימון לטעינה", "Program day to load")}
                        <select
                          value={day}
                          onChange={(e) => setDay(e.target.value)}
                        >
                          {days.map((d) => (
                            <option key={d} value={d}>
                              {controller.auth === "ready"
                                ? workoutDayLabel(d)
                                : d}
                            </option>
                          ))}
                        </select>
                      </label>
                      {!!draft.exercises.length && (
                        <label className="care-check">
                          <input
                            type="checkbox"
                            checked={replace}
                            onChange={(e) => setReplace(e.target.checked)}
                          />
                          <span>
                            {t(
                              "להחליף את התרגילים שבעורך בעותק של יום האימון",
                              "Replace the editor exercises with a copy of this program day",
                            )}
                          </span>
                        </label>
                      )}
                      <button
                        type="button"
                        className="button secondary"
                        disabled={
                          !days.length || (!!draft.exercises.length && !replace)
                        }
                        onClick={loadProgram}
                      >
                        {t("טעינת התרגילים מהתוכנית", "Load program exercises")}
                      </button>
                    </div>
                  )}
                  <div className="care-stack">
                    {draft.exercises.map((row, r) => {
                      const original = context.plan.find(
                          (i) =>
                            (i.occurrenceId ??
                              `${workoutDayId(i)}:${i.exerciseId}`) ===
                            row.sourceOccurrenceId,
                        ),
                        unit =
                          original?.exerciseId === row.exerciseId
                            ? original.unit
                            : row.exerciseId
                              ? defaultPrescription(row.exerciseId).unit
                              : "reps";
                      return (
                        <section
                          className="care-form retrospective-exercise"
                          key={row.id}
                        >
                          <div className="care-row">
                            <h3 dir="auto">
                              {r + 1}. {row.name}
                            </h3>
                            <button
                              type="button"
                              className="text-button danger-text"
                              onClick={() =>
                                change({
                                  exercises: draft.exercises.filter(
                                    (_, n) => n !== r,
                                  ),
                                })
                              }
                              aria-label={t("הסרת ", "Remove ") + row.name}
                            >
                              {t("הסרה", "Remove")}
                            </button>
                          </div>
                          {original && (
                            <p className="care-muted">
                              {t("בתוכנית: ", "Prescribed: ")}
                              {original.sets} × {original.reps}
                              {original.repsMax ? "–" + original.repsMax : ""} ·
                              RPE{" "}
                              {original.targetRpes?.join(" / ") ??
                                original.targetRpe ??
                                "—"}
                            </p>
                          )}
                          <details>
                            <summary>
                              {t(
                                "החלפת התרגיל שבוצע",
                                "Change the performed exercise",
                              )}
                            </summary>
                            <ExerciseNameSelect
                              label={t("תרגיל שבוצע", "Performed exercise")}
                              value={row.exerciseId ?? ""}
                              items={catalog}
                              onChange={(exerciseId) => {
                                if (exerciseId)
                                  rowChange(r, {
                                    exerciseId,
                                    name: catalog.find(
                                      (e) => e.id === exerciseId,
                                    )!.name,
                                    sets: Array.from(
                                      {
                                        length: exerciseId.startsWith("cardio:")
                                          ? 1
                                          : row.sets.length,
                                      },
                                      (_, n) => ({
                                        ...row.sets[n],
                                        amount: null,
                                        weight: null,
                                      }),
                                    ),
                                  });
                              }}
                            />
                            <label className="care-field">
                              {t(
                                "או שם תרגיל חופשי",
                                "Or a free-text exercise name",
                              )}
                              <input
                                maxLength={200}
                                value={row.exerciseId === null ? row.name : ""}
                                onChange={(e) =>
                                  rowChange(r, {
                                    exerciseId: null,
                                    name: e.target.value,
                                    sets:
                                      row.exerciseId === null
                                        ? row.sets
                                        : row.sets.map((s) => ({
                                            ...s,
                                            amount: null,
                                            weight: null,
                                          })),
                                  })
                                }
                              />
                            </label>
                          </details>
                          {row.sets.map((s, n) => (
                            <fieldset className="retrospective-set" key={n}>
                              <legend>
                                {t("סט", "Set")} {n + 1}
                              </legend>
                              <label className="care-check">
                                <input
                                  type="checkbox"
                                  checked={s.done}
                                  onChange={(e) =>
                                    setChange(r, n, { done: e.target.checked })
                                  }
                                />
                                <span>{t("בוצע", "Performed")}</span>
                              </label>
                              <div className="retrospective-set-grid">
                                <label className="care-field">
                                  {unit === "seconds"
                                    ? t("שניות", "Seconds")
                                    : unit === "minutes"
                                      ? t("דקות", "Minutes")
                                      : t("חזרות", "Reps")}
                                  <input
                                    aria-label={`${t("כמות בסט", "Amount in set")} ${n + 1} · ${row.name}`}
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    max={
                                      row.exerciseId?.startsWith("cardio:")
                                        ? 86400
                                        : unit === "seconds"
                                          ? 3600
                                          : unit === "minutes"
                                            ? 180
                                            : 100
                                    }
                                    value={s.amount ?? ""}
                                    placeholder="—"
                                    onChange={(e) =>
                                      setChange(r, n, {
                                        amount:
                                          e.target.value === ""
                                            ? null
                                            : Number(e.target.value),
                                      })
                                    }
                                  />
                                </label>
                                {!row.exerciseId?.startsWith("cardio:") && (
                                  <label className="care-field">
                                    {original?.exerciseId === row.exerciseId &&
                                    original.load?.basis === "per-side"
                                      ? t(
                                          "משקל ק״ג לכל צד",
                                          "Weight kg per side",
                                        )
                                      : t("משקל ק״ג", "Weight kg")}
                                    <input
                                      aria-label={`${t("משקל בסט", "Weight in set")} ${n + 1} · ${row.name}`}
                                      type="number"
                                      inputMode="decimal"
                                      min={0}
                                      max={1000}
                                      step="any"
                                      value={s.weight ?? ""}
                                      placeholder="—"
                                      onChange={(e) =>
                                        setChange(r, n, {
                                          weight:
                                            e.target.value === ""
                                              ? null
                                              : Number(e.target.value),
                                        })
                                      }
                                    />
                                  </label>
                                )}
                                <label className="care-field">
                                  RPE
                                  <input
                                    aria-label={`RPE ${n + 1} · ${row.name}`}
                                    type="number"
                                    inputMode="decimal"
                                    min={1}
                                    max={10}
                                    step={0.5}
                                    value={s.actualRpe ?? ""}
                                    placeholder="—"
                                    onChange={(e) =>
                                      setChange(r, n, {
                                        actualRpe:
                                          e.target.value === ""
                                            ? null
                                            : Number(e.target.value),
                                      })
                                    }
                                  />
                                </label>
                              </div>
                              {row.sets.length > 1 && (
                                <button
                                  type="button"
                                  className="text-button"
                                  onClick={() =>
                                    rowChange(r, {
                                      sets: row.sets.filter((_, i) => i !== n),
                                    })
                                  }
                                >
                                  {t("הסרת סט", "Remove set")}
                                </button>
                              )}
                            </fieldset>
                          ))}
                          <button
                            type="button"
                            className="text-button"
                            disabled={
                              row.sets.length >= 20 ||
                              row.exerciseId?.startsWith("cardio:")
                            }
                            onClick={() =>
                              rowChange(r, { sets: [...row.sets, blankSet()] })
                            }
                          >
                            {t("הוספת סט", "Add set")}
                          </button>
                        </section>
                      );
                    })}
                  </div>
                  <details
                    className="retrospective-add"
                    open={!draft.exercises.length}
                  >
                    <summary>{t("הוספת תרגיל", "Add exercise")}</summary>
                    <ExerciseNameSelect
                      label={t("תרגיל מהספרייה", "Library exercise")}
                      value={selected}
                      items={catalog}
                      onChange={(value) => {
                        setSelected(value);
                        if (value) setName("");
                      }}
                    />
                    <label className="care-field">
                      {t("או תרגיל בשם חופשי", "Or a free-text exercise")}
                      <input
                        dir="auto"
                        maxLength={200}
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (e.target.value) setSelected("");
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={
                        draft.exercises.length >= 30 ||
                        (!selected && !name.trim())
                      }
                      onClick={add}
                    >
                      {t("הוספה לאימון", "Add to workout")}
                    </button>
                  </details>
                  <label className="care-field">
                    {t("הערה לאימון — אופציונלי", "Workout note — optional")}
                    <textarea
                      maxLength={500}
                      value={draft.note}
                      onChange={(e) => change({ note: e.target.value })}
                    />
                  </label>
                  <details>
                    <summary>
                      {t(
                        "דיווח כאב — רק אם זכור",
                        "Pain report — only if remembered",
                      )}
                    </summary>
                    <div className="form-grid">
                      {(["before", "after"] as const).map((key) => (
                        <label className="care-field" key={key}>
                          {key === "before"
                            ? t("כאב לפני (0–10)", "Pain before (0–10)")
                            : t("כאב אחרי (0–10)", "Pain after (0–10)")}
                          <input
                            type="number"
                            min={0}
                            max={10}
                            value={draft[key] ?? ""}
                            onChange={(e) =>
                              change({
                                [key]:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              })
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </details>
                  {duplicateWarning && (
                    <label className="care-check">
                      <input
                        type="checkbox"
                        checked={draft.acknowledgeDuplicate ?? false}
                        onChange={(e) =>
                          change({ acknowledgeDuplicate: e.target.checked })
                        }
                      />
                      <span>
                        {t(
                          "אם כבר קיים אימון בתאריך הזה, בדקתי שזה אימון נוסף",
                          "If a workout already exists on this date, I checked that this is an additional workout",
                        )}
                      </span>
                    </label>
                  )}
                  <div className="care-actions retrospective-actions">
                    {!sessionId && <button
                      type="button"
                      className="button secondary"
                      onClick={() => void save(false)}
                    >
                      {t("שמירת טיוטה", "Save draft")}
                    </button>}
                    <button
                      type="submit"
                      className="button primary"
                      disabled={
                        !draft.exercises.some((e) => e.sets.some((s) => s.done))
                      }
                    >
                      {busy
                        ? t("שומרים…", "Saving…")
                        : sessionId ? t("שמירת התיקון", "Save correction") : t(
                            "שמירת האימון בהיסטוריה",
                            "Save workout to history",
                          )}
                    </button>
                  </div>
                  <p className="care-muted" role="status">
                    {sessionId ? t("יציאה לפני שמירת התיקון עלולה לאבד את העריכה שבמסך.", "Save corrections before leaving this screen.") : saved
                      ? t("טיוטה שמורה בחשבון", "Draft saved to your account")
                      : t(
                          "שינויים טרם נשמרו. שמרו טיוטה לפני יציאה מהמסך.",
                          "Changes are not yet saved. Save a draft before leaving this screen.",
                        )}
                  </p>
                </fieldset>
                {!context.canSave && (
                  <p role="alert">
                    {t(
                      "אין כרגע הרשאה לשמירת אימון. הטיוטה הקיימת נשמרת.",
                      "Workout saving is not currently available. Your existing draft is retained.",
                    )}
                  </p>
                )}
              </form>
            )}
          </div>
        )}
      </section>
    </Localize>
  );
}

export function RetrospectiveWorkout({
  controller,
  sessionId,
}: {
  controller: Pick<TrainingController, "auth" | "refresh">;
  sessionId?: string;
}) {
  return controller.auth === "ready" ? (
    <RetrospectiveWorkoutEditor controller={controller} sessionId={sessionId} />
  ) : null;
}
