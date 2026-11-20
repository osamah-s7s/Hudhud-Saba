import { questions, type Question } from "@/data/survey";

/** Single → option id, multi → option ids, text → the typed text. */
export type AnswerValue = string | string[];
export type Answers = Record<string, AnswerValue>;

export interface SubmitPayload {
  answers: Answers;
  /** Honeypot. Real visitors never see or fill this field. */
  website: string;
  /** Epoch ms when the visitor pressed Begin. */
  startedAt: number;
}

export type SubmitResponse =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "rate_limited" | "not_configured" | "send_failed" | "bad_request";
      /** Question ids that failed validation. */
      fields?: string[];
    };

export function isAnswered(q: Question, value: AnswerValue | undefined): boolean {
  if (q.kind === "text") return typeof value === "string" && value.trim().length > 0;
  if (q.kind === "single") return typeof value === "string" && value.length > 0;
  return Array.isArray(value) && value.length > 0;
}

/**
 * Applies the "exclusive option" rule (question 14): choosing an exclusive
 * option clears the others; choosing any other clears the exclusive one.
 */
export function toggleMulti(q: Question, current: string[], optionId: string): string[] {
  if (current.includes(optionId)) return current.filter((id) => id !== optionId);
  const option = q.options.find((o) => o.id === optionId);
  if (!option) return current;
  if (option.exclusive) return [optionId];
  const exclusiveIds = new Set(q.options.filter((o) => o.exclusive).map((o) => o.id));
  const next = [...current.filter((id) => !exclusiveIds.has(id)), optionId];
  // Keep survey order so stored answers are stable.
  return q.options.map((o) => o.id).filter((id) => next.includes(id));
}

/** Is this one stored value well-formed for its question? (Does not check "required".) */
function isWellFormed(q: Question, value: unknown): boolean {
  if (value === undefined) return true;
  const ids = new Set(q.options.map((o) => o.id));
  if (q.kind === "text") {
    return typeof value === "string" && value.length <= (q.maxLength ?? 2000);
  }
  if (q.kind === "single") return typeof value === "string" && ids.has(value);
  if (!Array.isArray(value)) return false;
  if (new Set(value).size !== value.length) return false;
  if (!value.every((v) => typeof v === "string" && ids.has(v))) return false;
  const hasExclusive = value.some((v) => q.options.find((o) => o.id === v)?.exclusive);
  return !(hasExclusive && value.length > 1);
}

/**
 * Full validation, shared by the client (before sending) and the server
 * (which never trusts the client). Returns the ids of invalid questions.
 */
export function validateAnswers(input: unknown): { ok: boolean; fields: string[] } {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, fields: questions.filter((q) => q.required).map((q) => q.id) };
  }
  const answers = input as Record<string, unknown>;
  const known = new Set(questions.map((q) => q.id));
  const fields: string[] = [];
  for (const key of Object.keys(answers)) {
    if (!known.has(key)) fields.push(key);
  }
  for (const q of questions) {
    const value = answers[q.id];
    if (!isWellFormed(q, value)) fields.push(q.id);
    else if (q.required && !isAnswered(q, value as AnswerValue | undefined)) fields.push(q.id);
  }
  return { ok: fields.length === 0, fields };
}

/** Drops anything malformed (used when restoring answers from localStorage). */
export function sanitizeAnswers(input: unknown): Answers {
  const out: Answers = {};
  if (typeof input !== "object" || input === null) return out;
  const raw = input as Record<string, unknown>;
  for (const q of questions) {
    const value = raw[q.id];
    if (value !== undefined && isWellFormed(q, value)) out[q.id] = value as AnswerValue;
  }
  return out;
}

/** Human-readable answer for the email, e.g. "Student" or "A; B; C". */
export function formatAnswer(q: Question, value: AnswerValue | undefined): string {
  if (!isAnswered(q, value)) return "(no answer)";
  if (q.kind === "text") return (value as string).trim();
  const label = (id: string) => q.options.find((o) => o.id === id)?.label ?? id;
  return q.kind === "single" ? label(value as string) : (value as string[]).map(label).join("; ");
}
