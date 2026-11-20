/**
 * CSV export of every response. Pure (no Next.js imports) so it can be tested.
 */
import { questions } from "@/data/survey";
import { formatAnswer, isAnswered } from "@/lib/answers";
import type { StoredResponse } from "@/lib/responses";

/**
 * One CSV cell.
 * - Text starting with = + - @ (or a tab / carriage return) would be run as a
 *   formula by Excel and Sheets, so it gets a leading single quote.
 * - Cells holding a quote, comma or line break are quoted, quotes doubled.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value !== "number" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** UTF-8 CSV with a BOM (so Excel reads it as UTF-8) and CRLF line endings. */
export function buildResponsesCsv(responses: StoredResponse[]): string {
  const header = [
    "id",
    "submitted_at",
    "duration_seconds",
    ...questions.map((q) => `Q${q.number} ${q.prompt}`),
  ];
  const rows = responses.map((r) => [
    r.id,
    r.createdAt,
    typeof r.durationSeconds === "number" && Number.isFinite(r.durationSeconds)
      ? r.durationSeconds
      : null,
    ...questions.map((q) => {
      const value = r.answers?.[q.id];
      // Unanswered stays an empty cell; multi answers arrive joined with "; ".
      return isAnswered(q, value) ? formatAnswer(q, value) : "";
    }),
  ]);
  const lines = [header, ...rows].map((cells) => cells.map(csvCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}
