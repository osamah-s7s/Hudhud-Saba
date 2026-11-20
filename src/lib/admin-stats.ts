/**
 * Pure statistics and formatting for the admin dashboard.
 * No Next.js imports: everything here takes plain data (and an explicit "now")
 * so it can be exercised from a script or a test.
 */
import { questions, sections, type Question, type SectionId } from "@/data/survey";
import { isAnswered } from "@/lib/answers";
import type { StoredResponse } from "@/lib/responses";

/** Every date on the dashboard is shown in this zone, so server output is deterministic. */
export const ADMIN_TIME_ZONE = "Asia/Karachi";
export const ADMIN_TIME_ZONE_LABEL = "Pakistan time (PKT, UTC+5)";

const DAY_MS = 86_400_000;

/* ---------- dates ---------- */

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: ADMIN_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar day ("YYYY-MM-DD") of an instant in the admin time zone; null if the date is invalid. */
export function dayKey(input: string | Date): string | null {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return null;
  const parts = dayKeyFormat.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Moves a "YYYY-MM-DD" key by whole days. */
export function shiftDayKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
}

const dayLabelFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});
const dayLabelLongFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "2026-11-20" → "20 Nov" (or "20 Nov 2026" with `withYear`). */
export function formatDayKey(key: string, withYear = false): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (withYear ? dayLabelLongFormat : dayLabelFormat).format(date);
}

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: ADMIN_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** ISO instant → "20 Nov 2026, 14:05" in the admin time zone. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return dateTimeFormat.format(date);
}

/** ISO instant → "2026-11-20 14:05" in the admin time zone (sorts correctly as text). */
export function formatSortableDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = sortableFormat.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

const sortableFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: ADMIN_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/* ---------- small formatters ---------- */

/** 272 → "4m 32s". */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  const s = total % 60;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes}m ${String(s).padStart(2, "0")}s`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

/** 34.4 → "34%"; tiny non-zero shares show as "<1%" rather than "0%". */
export function formatPercent(percent: number): string {
  if (percent > 0 && percent < 0.5) return "<1%";
  return `${Math.round(percent)}%`;
}

/* ---------- headline numbers ---------- */

export interface Summary {
  total: number;
  /** Responses on the current calendar day (admin time zone). */
  today: number;
  /** Responses in the last 7 calendar days, today included. */
  last7Days: number;
  medianDurationSeconds: number | null;
  /** How many responses carried a usable duration. */
  timedCount: number;
  /** Day key of the oldest response, or null when there are none. */
  firstDay: string | null;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computeSummary(responses: StoredResponse[], now: Date): Summary {
  const todayKey = dayKey(now) ?? "";
  const weekStart = todayKey ? shiftDayKey(todayKey, -6) : "";
  let today = 0;
  let last7Days = 0;
  let firstDay: string | null = null;
  const durations: number[] = [];

  for (const r of responses) {
    const key = dayKey(r.createdAt);
    if (key) {
      if (key === todayKey) today += 1;
      if (key >= weekStart && key <= todayKey) last7Days += 1;
      if (firstDay === null || key < firstDay) firstDay = key;
    }
    const d = r.durationSeconds;
    if (typeof d === "number" && Number.isFinite(d) && d >= 0) durations.push(d);
  }

  return {
    total: responses.length,
    today,
    last7Days,
    medianDurationSeconds: median(durations),
    timedCount: durations.length,
    firstDay,
  };
}

/* ---------- responses over time ---------- */

export interface DayCount {
  /** "YYYY-MM-DD" in the admin time zone. */
  day: string;
  count: number;
}

export interface Timeline {
  days: DayCount[];
  /** Highest single-day count in the window (0 when empty). */
  max: number;
  /** Sum over the window. */
  total: number;
  /** First day holding the maximum, or null when every day is zero. */
  peak: DayCount | null;
}

/**
 * One entry per calendar day for the last `windowDays` days ending today,
 * zero days included, oldest first.
 */
export function responsesPerDay(responses: StoredResponse[], now: Date, windowDays = 30): Timeline {
  const todayKey = dayKey(now);
  if (!todayKey || windowDays < 1) return { days: [], max: 0, total: 0, peak: null };

  const counts = new Map<string, number>();
  for (const r of responses) {
    const key = dayKey(r.createdAt);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const days: DayCount[] = [];
  let max = 0;
  let total = 0;
  let peak: DayCount | null = null;
  for (let offset = windowDays - 1; offset >= 0; offset -= 1) {
    const day = shiftDayKey(todayKey, -offset);
    const entry = { day, count: counts.get(day) ?? 0 };
    days.push(entry);
    total += entry.count;
    if (entry.count > max) {
      max = entry.count;
      peak = entry;
    }
  }
  return { days, max, total, peak };
}

/* ---------- per-question distributions ---------- */

export interface OptionStat {
  id: string;
  label: string;
  count: number;
  /**
   * 0–100, unrounded: share of the respondents who answered the question and
   * picked this option. For multi choice the options of one question can add
   * up to more than 100.
   */
  percent: number;
  /**
   * 0–100, unrounded: share of all selections made on this question — the size
   * of the pie slice, always adding up to 100. Equal to `percent` for single
   * choice.
   */
  share: number;
}

export interface QuestionStat {
  id: string;
  number: number;
  section: SectionId;
  kind: "single" | "multi";
  prompt: string;
  /** Respondents who answered this question: the base of `percent`. */
  answered: number;
  /** Options picked in total (= `answered` for single choice): the base of `share`. */
  selections: number;
  options: OptionStat[];
}

export function questionDistribution(q: Question, responses: StoredResponse[]): QuestionStat {
  const counts = new Map<string, number>(q.options.map((o) => [o.id, 0]));
  let answered = 0;
  let selections = 0;

  for (const r of responses) {
    const value = r.answers?.[q.id];
    if (!isAnswered(q, value)) continue;
    answered += 1;
    // A Set so a malformed row with a repeated id cannot count twice.
    const picked = new Set(Array.isArray(value) ? value : [value as string]);
    for (const id of picked) {
      const current = counts.get(id);
      if (current !== undefined) {
        counts.set(id, current + 1);
        selections += 1;
      }
    }
  }

  return {
    id: q.id,
    number: q.number,
    section: q.section,
    kind: q.kind === "multi" ? "multi" : "single",
    prompt: q.prompt,
    answered,
    selections,
    options: q.options.map((o) => {
      const count = counts.get(o.id) ?? 0;
      return {
        id: o.id,
        label: o.label,
        count,
        percent: answered > 0 ? (count / answered) * 100 : 0,
        share: selections > 0 ? (count / selections) * 100 : 0,
      };
    }),
  };
}

export interface SectionStats {
  id: SectionId;
  title: string;
  questions: QuestionStat[];
}

/** Choice questions (single + multi) in survey order, grouped under their section. */
export function distributionsBySection(responses: StoredResponse[]): SectionStats[] {
  return sections
    .map((s) => ({
      id: s.id,
      title: s.title,
      questions: questions
        .filter((q) => q.section === s.id && q.kind !== "text")
        .map((q) => questionDistribution(q, responses)),
    }))
    .filter((s) => s.questions.length > 0);
}

/* ---------- free text ---------- */

export interface TextAnswer {
  responseId: string;
  createdAt: string;
  text: string;
}

/** Non-empty answers to one free-text question, in the order the responses were given. */
export function textAnswers(responses: StoredResponse[], questionId: string): TextAnswer[] {
  const q = questions.find((item) => item.id === questionId && item.kind === "text");
  if (!q) return [];
  const out: TextAnswer[] = [];
  for (const r of responses) {
    const value = r.answers?.[q.id];
    if (isAnswered(q, value)) {
      out.push({ responseId: r.id, createdAt: r.createdAt, text: (value as string).trim() });
    }
  }
  return out;
}
