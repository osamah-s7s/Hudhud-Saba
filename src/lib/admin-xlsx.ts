/**
 * Excel export of the survey, dressed in the site's "Night Majlis" identity:
 * night background, sand text, gold hairlines and kickers, and the same slice
 * colour per option as the charts on the admin page.
 *
 * Server-only: exceljs is a Node library and must never be imported from a
 * client component.
 */
import ExcelJS from "exceljs";
import { questions, site } from "@/data/survey";
import { formatAnswer, isAnswered } from "@/lib/answers";
import { INK, sliceColors } from "@/lib/admin-charts";
import {
  ADMIN_TIME_ZONE_LABEL,
  computeSummary,
  distributionsBySection,
  formatDuration,
  formatSortableDateTime,
  textAnswers,
  type QuestionStat,
} from "@/lib/admin-stats";
import type { StoredResponse } from "@/lib/responses";

/**
 * Text for a cell. Always written as a string value (never as a formula
 * object), and anything that starts like a formula gets a leading single
 * quote so no spreadsheet program will evaluate it.
 */
export function safeText(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/* ---------- identity ---------- */

const argb = (hex: string) => `FF${hex.replace("#", "").toUpperCase()}`;

const C = {
  night: argb(INK.night),
  panel: argb(INK.panel),
  /** Zebra row: halfway between night and panel. */
  nightAlt: argb("#23201d"),
  line: argb(INK.line),
  edge: argb(INK.edge),
  sand: argb(INK.sand),
  muted: argb(INK.muted),
  gold: argb(INK.gold),
  goldLight: argb(INK.goldLight),
};

/** Web fonts cannot travel in a workbook; these are the closest installed ones. */
const SERIF = "Georgia";
const SANS = "Calibri";

const fill = (color: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb: color } });
const sans = (size: number, color: string, bold = false): Partial<ExcelJS.Font> => ({
  name: SANS,
  size,
  bold,
  color: { argb: color },
});
const serif = (size: number, color: string): Partial<ExcelJS.Font> => ({ name: SERIF, size, color: { argb: color } });
const hairline = (color: string, style: ExcelJS.BorderStyle = "thin"): Partial<ExcelJS.Border> => ({
  style,
  color: { argb: color },
});

/** "HUDHUD SABA" → "H U D H U D   S A B A": cells have no letter-spacing. */
const spaced = (text: string) => text.toUpperCase().split(" ").map((w) => w.split("").join(" ")).join("   ");

/** Columns painted night beyond the data, so the sheet never ends in white. */
const FILLER_COLUMNS = 30;
/** First row under the masthead. */
const BODY_START = 7;

interface SheetOptions {
  name: string;
  title: string;
  subtitle: string;
  tab: string;
  /** Widths of the data columns, starting at column B (A is a narrow margin). */
  widths: number[];
}

/**
 * A worksheet with the night background on every column, no gridlines, and
 * the site masthead in rows 2–5: kicker, serif title, muted line, gold rule.
 */
function createSheet(workbook: ExcelJS.Workbook, options: SheetOptions): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(options.name, {
    properties: { tabColor: { argb: options.tab }, defaultRowHeight: 18 },
    views: [{ showGridLines: false, zoomScale: 100 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const widths = [3, ...options.widths];
  const last = widths.length;
  for (let i = 1; i <= last + FILLER_COLUMNS; i += 1) {
    const column = sheet.getColumn(i);
    column.width = widths[i - 1] ?? 12;
    // Column-level style: Excel applies it to every row, including empty ones.
    column.fill = fill(C.night);
    column.font = sans(11, C.sand);
    column.alignment = { vertical: "top", wrapText: true };
  }

  const overflow: Partial<ExcelJS.Alignment> = { vertical: "middle", wrapText: false };
  sheet.getRow(1).height = 14;

  const kicker = sheet.getCell(2, 2);
  kicker.value = spaced(site.name);
  kicker.font = sans(9, C.goldLight, true);
  kicker.alignment = overflow;
  sheet.getRow(2).height = 20;

  const title = sheet.getCell(3, 2);
  title.value = options.title;
  title.font = serif(24, C.sand);
  title.alignment = overflow;
  sheet.getRow(3).height = 38;

  const subtitle = sheet.getCell(4, 2);
  subtitle.value = options.subtitle;
  subtitle.font = sans(10, C.muted);
  subtitle.alignment = overflow;
  sheet.getRow(4).height = 20;

  sheet.getRow(5).height = 8;
  for (let i = 2; i <= last; i += 1) sheet.getCell(5, i).border = { bottom: hairline(C.gold) };
  sheet.getRow(6).height = 12;

  return sheet;
}

/** Table header cell: panel fill, gold small caps, gold rule underneath. */
function styleHeaderCell(cell: ExcelJS.Cell, align: "left" | "right" | "center" = "left") {
  cell.fill = fill(C.panel);
  cell.font = sans(9, C.goldLight, true);
  cell.alignment = { vertical: "middle", horizontal: align, wrapText: true, indent: 1 };
  cell.border = { top: hairline(C.line), bottom: hairline(C.gold) };
}

/** Body cell: zebra night, sand text, faint rule underneath. */
function styleBodyCell(cell: ExcelJS.Cell, index: number, align: "left" | "right" | "center" = "left") {
  cell.fill = fill(index % 2 === 0 ? C.night : C.nightAlt);
  cell.font = sans(11, C.sand);
  cell.alignment = { vertical: "top", horizontal: align, wrapText: true, indent: 1 };
  cell.border = { bottom: hairline(C.line) };
}

/** A muted one-line message under the masthead (empty states). */
function writeEmpty(sheet: ExcelJS.Worksheet, message: string) {
  const cell = sheet.getCell(BODY_START, 2);
  cell.value = message;
  cell.font = sans(11, C.muted);
  cell.alignment = { vertical: "middle", wrapText: false };
}

const bullets = (items: string[]) => (items.length > 1 ? items.map((item) => `• ${item}`).join("\n") : (items[0] ?? ""));

/* ---------- sheets ---------- */

function addSummarySheet(workbook: ExcelJS.Workbook, responses: StoredResponse[], now: Date, stamp: string) {
  // B swatch · C option · D count · E % of respondents · F bar · G share of selections
  const sheet = createSheet(workbook, {
    name: "Summary",
    title: "Survey Results",
    subtitle: stamp,
    tab: C.gold,
    widths: [3.5, 50, 12, 18, 34, 20],
  });
  sheet.views = [{ showGridLines: false, state: "frozen", ySplit: 5 }];

  /* Headline numbers */
  const kpi = computeSummary(responses, now);
  const kpis: Array<[column: number, label: string, value: string | number]> = [
    [3, "Total responses", kpi.total],
    [5, "Last 7 days", kpi.last7Days],
    [6, "Today", kpi.today],
    [7, "Median completion", formatDuration(kpi.medianDurationSeconds)],
  ];
  sheet.getRow(BODY_START).height = 20;
  sheet.getRow(BODY_START + 1).height = 36;
  for (let column = 2; column <= 7; column += 1) {
    sheet.getCell(BODY_START, column).fill = fill(C.panel);
    sheet.getCell(BODY_START, column).border = { top: hairline(C.edge) };
    sheet.getCell(BODY_START + 1, column).fill = fill(C.panel);
    sheet.getCell(BODY_START + 1, column).border = { bottom: hairline(C.edge) };
  }
  for (const [column, label, value] of kpis) {
    const labelCell = sheet.getCell(BODY_START, column);
    labelCell.value = label.toUpperCase();
    labelCell.font = sans(9, C.muted, true);
    labelCell.alignment = { vertical: "bottom", horizontal: "left", wrapText: false, indent: 1 };
    const valueCell = sheet.getCell(BODY_START + 1, column);
    valueCell.value = value;
    valueCell.font = serif(22, C.sand);
    valueCell.alignment = { vertical: "middle", horizontal: "left", wrapText: false, indent: 1 };
  }

  let row = BODY_START + 3;
  if (responses.length === 0) {
    const cell = sheet.getCell(row, 2);
    cell.value = "No responses yet.";
    cell.font = sans(11, C.muted);
    cell.alignment = { vertical: "middle", wrapText: false };
    return;
  }

  for (const section of distributionsBySection(responses)) {
    const heading = sheet.getCell(row, 2);
    heading.value = {
      richText: [
        { text: `${section.id}   `, font: serif(18, C.goldLight) },
        { text: safeText(section.title), font: serif(18, C.sand) },
      ],
    };
    heading.alignment = { vertical: "middle", wrapText: false };
    sheet.getRow(row).height = 32;
    for (let column = 2; column <= 7; column += 1) sheet.getCell(row, column).border = { bottom: hairline(C.gold) };
    row += 2;

    for (const question of section.questions) row = writeQuestionBlock(sheet, question, row);
  }
}

/** One question: kicker, serif prompt, note, then a small table with colour swatches and bars. */
function writeQuestionBlock(sheet: ExcelJS.Worksheet, q: QuestionStat, start: number): number {
  let row = start;
  const multi = q.kind === "multi";

  const kicker = sheet.getCell(row, 2);
  kicker.value = `${spaced(`Question ${q.number}`)}   ·   ${multi ? "Select all that apply" : "Single choice"}`;
  kicker.font = sans(9, C.goldLight, true);
  kicker.alignment = { vertical: "middle", wrapText: false };
  row += 1;

  sheet.mergeCells(row, 2, row, 7);
  const prompt = sheet.getCell(row, 2);
  prompt.value = safeText(q.prompt);
  prompt.font = serif(14, C.sand);
  prompt.alignment = { vertical: "middle", wrapText: true };
  sheet.getRow(row).height = Math.max(1, Math.ceil(q.prompt.length / 95)) * 22;
  row += 1;

  const note = sheet.getCell(row, 2);
  note.value = multi
    ? `${q.answered} respondents answered · ${q.selections} selections`
    : `${q.answered} respondents answered`;
  note.font = sans(10, C.muted);
  note.alignment = { vertical: "middle", wrapText: false };
  row += 1;

  const headers: Array<[column: number, text: string, align: "left" | "right"]> = [
    [2, "", "left"],
    [3, "OPTION", "left"],
    [4, "COUNT", "right"],
    [5, "% OF RESPONDENTS", "right"],
    [6, "", "left"],
    [7, multi ? "SHARE OF SELECTIONS" : "", "right"],
  ];
  for (const [column, text, align] of headers) {
    const cell = sheet.getCell(row, column);
    cell.value = text;
    styleHeaderCell(cell, align);
  }
  sheet.getRow(row).height = 22;
  row += 1;

  const colors = sliceColors(q.options.length);
  q.options.forEach((option, index) => {
    const color = argb(colors[index] ?? INK.gold);
    sheet.getRow(row).height = 21;
    for (let column = 2; column <= 7; column += 1) {
      const cell = sheet.getCell(row, column);
      cell.fill = fill(C.night);
      cell.border = { bottom: hairline(C.line) };
      cell.alignment = { vertical: "middle", horizontal: column === 3 || column === 6 ? "left" : "right", wrapText: false, indent: 1 };
      cell.font = sans(11, C.sand);
    }

    // Swatch: the option's slice colour, inset with night borders so it reads as a square.
    const swatch = sheet.getCell(row, 2);
    swatch.fill = fill(color);
    swatch.border = {
      top: hairline(C.night, "medium"),
      bottom: hairline(C.night, "medium"),
      left: hairline(C.night, "medium"),
      right: hairline(C.night, "medium"),
    };

    sheet.getCell(row, 3).value = safeText(option.label);
    sheet.getCell(row, 4).value = option.count;
    sheet.getCell(row, 4).font = sans(11, C.muted);

    // Fractions with a percent format, so they chart and sort as numbers.
    const percent = sheet.getCell(row, 5);
    percent.value = option.percent / 100;
    percent.numFmt = "0%";
    percent.font = sans(11, C.sand, true);

    // In-cell bar drawn with block characters: works in every spreadsheet program.
    const blocks = option.percent > 0 ? Math.max(1, Math.round((option.percent / 100) * 26)) : 0;
    const bar = sheet.getCell(row, 6);
    bar.value = "█".repeat(blocks);
    bar.font = { name: "Arial", size: 9, color: { argb: color } };

    if (multi) {
      const share = sheet.getCell(row, 7);
      share.value = option.share / 100;
      share.numFmt = "0%";
      share.font = sans(11, C.muted);
    }
    row += 1;
  });

  if (multi) {
    const footnote = sheet.getCell(row, 3);
    footnote.value = "Respondents could choose several options, so “% of respondents” can add up to more than 100%.";
    footnote.font = { ...sans(9, C.muted), italic: true };
    footnote.alignment = { vertical: "middle", wrapText: false };
    row += 1;
  }
  return row + 2;
}

function addResponsesSheet(workbook: ExcelJS.Workbook, responses: StoredResponse[], stamp: string) {
  // B # · C submitted · D duration · then one column per question
  const sheet = createSheet(workbook, {
    name: "Responses",
    title: "All Responses",
    subtitle: stamp,
    tab: C.sand,
    widths: [8, 21, 13, ...questions.map((q) => (q.kind === "text" ? 70 : q.kind === "multi" ? 48 : 30))],
  });
  const last = 4 + questions.length;
  sheet.views = [{ showGridLines: false, state: "frozen", ySplit: BODY_START, xSplit: 3 }];

  const header = sheet.getRow(BODY_START);
  header.height = 64;
  const fixed: Array<[column: number, text: string, align: "left" | "right"]> = [
    [2, "#", "right"],
    [3, "SUBMITTED", "left"],
    [4, "DURATION", "right"],
  ];
  for (const [column, text, align] of fixed) {
    const cell = sheet.getCell(BODY_START, column);
    cell.value = text;
    styleHeaderCell(cell, align);
  }
  questions.forEach((q, index) => {
    const cell = sheet.getCell(BODY_START, 5 + index);
    styleHeaderCell(cell);
    cell.value = {
      richText: [
        { text: `Q${q.number}\n`, font: sans(9, C.goldLight, true) },
        { text: q.prompt, font: sans(10, C.sand) },
      ],
    };
  });
  sheet.autoFilter = { from: { row: BODY_START, column: 2 }, to: { row: BODY_START, column: last } };

  if (responses.length === 0) {
    const cell = sheet.getCell(BODY_START + 1, 3);
    cell.value = "No responses yet.";
    cell.font = sans(11, C.muted);
    cell.alignment = { vertical: "middle", wrapText: false };
    return;
  }

  responses.forEach((response, index) => {
    const row = BODY_START + 1 + index;

    const number = sheet.getCell(row, 2);
    number.value = responses.length - index;
    styleBodyCell(number, index, "right");
    number.font = sans(11, C.goldLight, true);

    const submitted = sheet.getCell(row, 3);
    submitted.value = formatSortableDateTime(response.createdAt);
    styleBodyCell(submitted, index);

    const duration = sheet.getCell(row, 4);
    duration.value =
      typeof response.durationSeconds === "number" && Number.isFinite(response.durationSeconds)
        ? formatDuration(response.durationSeconds)
        : null;
    styleBodyCell(duration, index, "right");
    duration.font = sans(11, C.muted);

    questions.forEach((q, qIndex) => {
      const cell = sheet.getCell(row, 5 + qIndex);
      const value = response.answers?.[q.id];
      styleBodyCell(cell, index);
      if (!isAnswered(q, value)) {
        cell.value = "—";
        cell.font = sans(11, C.edge);
      } else if (q.kind === "multi" && Array.isArray(value)) {
        cell.value = safeText(bullets(value.map((id) => formatAnswer(q, [id]))));
      } else {
        cell.value = safeText(formatAnswer(q, value));
      }
    });
  });
}

function addSuggestionsSheet(workbook: ExcelJS.Workbook, responses: StoredResponse[], stamp: string) {
  // B # · C submitted · D suggestion
  const sheet = createSheet(workbook, {
    name: "Suggestions",
    title: "Suggestions",
    subtitle: stamp,
    tab: C.muted,
    widths: [8, 21, 110],
  });
  sheet.views = [{ showGridLines: false, state: "frozen", ySplit: BODY_START + 1 }];

  let row = BODY_START;
  let any = false;
  for (const q of questions.filter((item) => item.kind === "text")) {
    const answers = textAnswers(responses, q.id);
    if (answers.length === 0) continue;
    any = true;

    sheet.mergeCells(row, 2, row, 4);
    const prompt = sheet.getCell(row, 2);
    prompt.value = {
      richText: [
        { text: `Q${q.number}   `, font: serif(13, C.goldLight) },
        { text: safeText(q.prompt), font: serif(13, C.sand) },
      ],
    };
    prompt.alignment = { vertical: "middle", wrapText: true };
    sheet.getRow(row).height = Math.max(1, Math.ceil(q.prompt.length / 110)) * 24;
    row += 1;

    const headers: Array<[column: number, text: string, align: "left" | "right"]> = [
      [2, "#", "right"],
      [3, "SUBMITTED", "left"],
      [4, "SUGGESTION", "left"],
    ];
    for (const [column, text, align] of headers) {
      const cell = sheet.getCell(row, column);
      cell.value = text;
      styleHeaderCell(cell, align);
    }
    sheet.getRow(row).height = 22;
    row += 1;

    answers.forEach((answer, index) => {
      const number = sheet.getCell(row, 2);
      number.value = index + 1;
      styleBodyCell(number, index, "right");
      number.font = sans(11, C.goldLight, true);

      const submitted = sheet.getCell(row, 3);
      submitted.value = formatSortableDateTime(answer.createdAt);
      styleBodyCell(submitted, index);
      submitted.font = sans(11, C.muted);

      const text = sheet.getCell(row, 4);
      text.value = safeText(answer.text);
      styleBodyCell(text, index);
      row += 1;
    });
    row += 2;
  }
  if (!any) writeEmpty(sheet, "No suggestions yet.");
}

export async function buildResponsesWorkbook(responses: StoredResponse[]): Promise<ArrayBuffer> {
  const now = new Date();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hudhud Saba";
  workbook.created = now;

  const count = `${responses.length} ${responses.length === 1 ? "response" : "responses"}`;
  const stamp = `${site.tagline}  ·  ${count}  ·  exported ${formatSortableDateTime(now.toISOString())}  ·  ${ADMIN_TIME_ZONE_LABEL}`;

  // Summary first: it is the sheet the workbook opens on.
  addSummarySheet(workbook, responses, now, stamp);
  addResponsesSheet(workbook, responses, stamp);
  addSuggestionsSheet(workbook, responses, stamp);

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}
