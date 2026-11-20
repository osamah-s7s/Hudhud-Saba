/**
 * Pie / donut geometry and the standalone SVG exports of the results board.
 * Pure: no Next.js, no DOM. The export SVGs are self-contained on purpose
 * (literal hex colours, presentation attributes, system fonts only) because
 * they are rasterised to PNG through an <img>, where neither the page's CSS
 * variables nor its web fonts are available.
 */
import { formatPercent, type QuestionStat, type SectionStats } from "@/lib/admin-stats";

/* ---------- colours (literal copies of the tokens in globals.css) ---------- */

export const INK = {
  night: "#1d1a18",
  panel: "#2a2623",
  line: "#4a4038",
  edge: "#7a6a55",
  sand: "#e8d5b7",
  muted: "#b6a690",
  gold: "#b58a45",
  goldLight: "#d2ad6c",
} as const;

/**
 * Categorical slice colours: only the site's identity colours, or mixes of
 * them with sand where the pure colour would sink into the night background.
 * Ordered so neighbours differ clearly in hue or lightness.
 */
const SLICE = {
  gold: "#b58a45",
  burgundy: "#844345", // burgundy #762f35 + 12% sand
  sand: "#e8d5b7",
  terracotta: "#b96b45",
  sage: "#a29f7c", // olive #68734b + 45% sand
  earth: "#8e644e", // earth #713b2e + 25% sand
  olive: "#68734b",
} as const;

const SLICE_ORDER = [
  SLICE.gold,
  SLICE.burgundy,
  SLICE.sand,
  SLICE.terracotta,
  SLICE.sage,
  SLICE.earth,
  SLICE.olive,
];

/** Colours for a chart of `n` slices; the last never sits beside a look-alike first. */
export function sliceColors(n: number): string[] {
  // With four slices the fourth (terracotta) would close the circle next to gold.
  if (n === 4) return [SLICE.gold, SLICE.burgundy, SLICE.sand, SLICE.olive];
  return Array.from({ length: n }, (_, i) => SLICE_ORDER[i % SLICE_ORDER.length]);
}

/** Dark text on light slices, light text on dark ones. */
function textOn(hex: string): string {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return luminance > 0.2 ? INK.night : "#f3e9d8";
}

/* ---------- geometry ---------- */

export interface PieSlice {
  id: string;
  label: string;
  count: number;
  /** 0–100: size of the slice (share of all selections). */
  share: number;
  /** 0–100: share of respondents who picked it. */
  percent: number;
  color: string;
  textColor: string;
  /** Path around the origin; empty for a zero-count option. */
  path: string;
  /** Where the on-slice % label goes, and whether the slice is big enough for one. */
  labelX: number;
  labelY: number;
  showLabel: boolean;
}

export interface Pie {
  /** Pie for single choice, donut for "select all that apply". */
  form: "pie" | "donut";
  radius: number;
  innerRadius: number;
  empty: boolean;
  slices: PieSlice[];
}

const TAU = Math.PI * 2;
const n2 = (v: number) => (Math.round(v * 100) / 100).toString();

/** A wedge (innerRadius 0) or ring segment from angle a0 to a1, clockwise, centred on 0,0. */
function segmentPath(outer: number, inner: number, a0: number, a1: number): string {
  if (a1 - a0 >= TAU - 1e-6) {
    // A lone 100% slice: two half-circles, because an arc cannot start and end on one point.
    const circle = (r: number, sweep: 0 | 1) =>
      `M${n2(r)} 0A${n2(r)} ${n2(r)} 0 1 ${sweep} ${n2(-r)} 0A${n2(r)} ${n2(r)} 0 1 ${sweep} ${n2(r)} 0Z`;
    return inner > 0 ? circle(outer, 1) + circle(inner, 0) : circle(outer, 1);
  }
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const p = (r: number, a: number) => `${n2(r * Math.cos(a))} ${n2(r * Math.sin(a))}`;
  const outerArc = `M${p(outer, a0)}A${n2(outer)} ${n2(outer)} 0 ${large} 1 ${p(outer, a1)}`;
  return inner > 0
    ? `${outerArc}L${p(inner, a1)}A${n2(inner)} ${n2(inner)} 0 ${large} 0 ${p(inner, a0)}Z`
    : `${outerArc}L0 0Z`;
}

/** Slices start at 12 o'clock and run clockwise in survey order. */
export function buildPie(stat: QuestionStat, radius = 100): Pie {
  const form = stat.kind === "multi" ? "donut" : "pie";
  const innerRadius = form === "donut" ? radius * 0.54 : 0;
  const labelRadius = form === "donut" ? (radius + innerRadius) / 2 : radius * 0.64;
  const colors = sliceColors(stat.options.length);
  const total = stat.options.reduce((sum, o) => sum + o.count, 0);

  let angle = -Math.PI / 2;
  const slices = stat.options.map((o, i): PieSlice => {
    const sweep = total > 0 ? (o.count / total) * TAU : 0;
    const a0 = angle;
    const a1 = angle + sweep;
    angle = a1;
    const mid = (a0 + a1) / 2;
    return {
      id: o.id,
      label: o.label,
      count: o.count,
      share: o.share,
      percent: o.percent,
      color: colors[i],
      textColor: textOn(colors[i]),
      path: o.count > 0 ? segmentPath(radius, innerRadius, a0, a1) : "",
      labelX: Math.round(labelRadius * Math.cos(mid) * 10) / 10,
      labelY: Math.round(labelRadius * Math.sin(mid) * 10) / 10,
      showLabel: o.share >= 6,
    };
  });

  return { form, radius, innerRadius, empty: total === 0, slices };
}

/** One sentence that reads the whole chart aloud. */
export function describeChart(stat: QuestionStat): string {
  if (stat.answered === 0) return `Question ${stat.number}: ${stat.prompt} No answers yet.`;
  const parts = stat.options.map(
    (o) => `${o.label}: ${o.count} (${formatPercent(stat.kind === "multi" ? o.percent : o.share)})`,
  );
  const base =
    stat.kind === "multi"
      ? `${stat.answered} respondents, percentages are of respondents`
      : `${stat.answered} respondents`;
  return `Question ${stat.number}: ${stat.prompt} ${base}. ${parts.join("; ")}.`;
}

/* ---------- file names ---------- */

const SLUGS: Record<string, string> = {
  q1: "age-group",
  q2: "occupation",
  q3: "visit-frequency",
  q4: "familiarity",
  q5: "interest-in-visiting",
  q6: "heritage-aspects",
  q7: "activities",
  q8: "visitor-experience",
  q9: "spaces",
  q10: "spatial-arrangement",
  q11: "seating",
  q12: "lighting",
  q13: "colour-atmosphere",
  q14: "barriers",
};

export function chartFileName(stat: QuestionStat): string {
  const slug =
    SLUGS[stat.id] ??
    stat.prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .split("-")
      .filter(Boolean)
      .slice(0, 4)
      .join("-");
  return `hudhud-saba-q${String(stat.number).padStart(2, "0")}-${slug}.png`;
}

/* ---------- standalone SVG export ---------- */

const SERIF = `Georgia, 'Times New Roman', serif`;
const SANS = `Arial, Helvetica, sans-serif`;

const esc = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Greedy word wrap by character count (text cannot be measured without a DOM). */
export function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}

interface TextOptions {
  size: number;
  fill: string;
  family?: string;
  weight?: number | string;
  anchor?: "start" | "middle" | "end";
  spacing?: number;
}

function text(x: number, y: number, content: string, o: TextOptions): string {
  return (
    `<text x="${n2(x)}" y="${n2(y)}" font-family="${o.family ?? SANS}" font-size="${o.size}"` +
    ` font-weight="${o.weight ?? 400}" fill="${o.fill}" text-anchor="${o.anchor ?? "start"}"` +
    (o.spacing ? ` letter-spacing="${o.spacing}"` : "") +
    `>${esc(content)}</text>`
  );
}

export const CARD_WIDTH = 800;
const PAD = 40;
const RADIUS = 112;

/** The inside of one chart card, drawn from 0,0, CARD_WIDTH wide. */
function cardContent(stat: QuestionStat): { body: string; height: number } {
  const multi = stat.kind === "multi";
  const out: string[] = [];

  // Heading: question number + answer type, then the wrapped prompt.
  out.push(
    text(PAD, 60, `QUESTION ${stat.number}  ·  ${multi ? "SELECT ALL THAT APPLY" : "SINGLE CHOICE"}`, {
      size: 15,
      weight: 700,
      fill: INK.goldLight,
      spacing: 2,
    }),
  );
  out.push(
    text(CARD_WIDTH - PAD, 60, "HUDHUD SABA", { size: 12, weight: 700, fill: INK.muted, anchor: "end", spacing: 3 }),
  );
  let y = 104;
  for (const line of wrapText(stat.prompt, 44)) {
    out.push(text(PAD, y, line, { size: 29, family: SERIF, fill: INK.sand }));
    y += 38;
  }
  y -= 6;
  const base = multi
    ? `${stat.answered} ${stat.answered === 1 ? "respondent" : "respondents"} answered  ·  ${stat.selections} ${stat.selections === 1 ? "selection" : "selections"}`
    : `${stat.answered} ${stat.answered === 1 ? "respondent" : "respondents"} answered`;
  out.push(text(PAD, y, base, { size: 16, fill: INK.muted }));
  y += 20;
  out.push(
    `<line x1="${PAD}" y1="${y}" x2="${CARD_WIDTH - PAD}" y2="${y}" stroke="${INK.gold}" stroke-opacity="0.45" stroke-width="1"/>`,
  );
  const top = y + 32;

  // Chart.
  const pie = buildPie(stat, RADIUS);
  const cx = PAD + RADIUS;
  const cy = top + RADIUS;
  out.push(`<g transform="translate(${cx} ${cy})">`);
  if (pie.empty) {
    const mid = pie.form === "donut" ? (RADIUS + pie.innerRadius) / 2 : RADIUS - 1;
    const width = pie.form === "donut" ? RADIUS - pie.innerRadius : 2;
    out.push(
      `<circle r="${n2(mid)}" fill="none" stroke="${INK.line}" stroke-width="${n2(width)}"${pie.form === "pie" ? ` stroke-dasharray="6 6"` : ""}/>`,
      text(0, 6, "No answers yet", { size: 16, fill: INK.muted, anchor: "middle" }),
    );
  } else {
    for (const s of pie.slices) {
      if (s.path) {
        out.push(
          `<path d="${s.path}" fill="${s.color}" fill-rule="evenodd" stroke="${INK.panel}" stroke-width="2.5" stroke-linejoin="round"/>`,
        );
      }
    }
    for (const s of pie.slices) {
      if (s.path && s.showLabel) {
        out.push(
          text(s.labelX, s.labelY + 5.5, formatPercent(s.share), {
            size: 16,
            weight: 700,
            fill: s.textColor,
            anchor: "middle",
          }),
        );
      }
    }
    if (pie.form === "donut") {
      out.push(
        text(0, 4, String(stat.answered), { size: 34, family: SERIF, fill: INK.sand, anchor: "middle" }),
        text(0, 24, "ANSWERED", { size: 11, weight: 700, fill: INK.muted, anchor: "middle", spacing: 1.5 }),
      );
    }
  }
  out.push(`</g>`);

  // Legend: swatch, label, then the figures in columns.
  const lx = PAD + RADIUS * 2 + 44;
  const right = CARD_WIDTH - PAD;
  const columns = multi
    ? [
        { x: right - 172, head: "COUNT" },
        { x: right - 92, head: "SHARE" },
        { x: right, head: "OF RESP." },
      ]
    : [
        { x: right - 84, head: "COUNT" },
        { x: right, head: "%" },
      ];
  const labelChars = multi ? 25 : 36;
  let ly = top + 12;
  out.push(text(lx + 26, ly, "OPTION", { size: 12, weight: 700, fill: INK.muted, spacing: 1.5 }));
  for (const c of columns) {
    out.push(text(c.x, ly, c.head, { size: 12, weight: 700, fill: INK.muted, anchor: "end", spacing: 1.5 }));
  }
  ly += 12;
  out.push(`<line x1="${lx}" y1="${ly}" x2="${right}" y2="${ly}" stroke="${INK.line}" stroke-width="1"/>`);
  ly += 26;

  for (const s of pie.slices) {
    out.push(
      `<rect x="${lx}" y="${ly - 13}" width="15" height="15" rx="2" fill="${s.color}" stroke="${INK.night}" stroke-width="1"/>`,
    );
    const figures = multi
      ? [String(s.count), formatPercent(s.share), formatPercent(s.percent)]
      : [String(s.count), formatPercent(s.share)];
    figures.forEach((value, i) => {
      const last = i === figures.length - 1;
      out.push(
        text(columns[i].x, ly, value, {
          size: 16,
          weight: last ? 700 : 400,
          fill: last ? INK.sand : INK.muted,
          anchor: "end",
        }),
      );
    });
    const lines = wrapText(s.label, labelChars);
    lines.forEach((line, i) => {
      out.push(text(lx + 26, ly + i * 21, line, { size: 16, fill: INK.sand }));
    });
    ly += lines.length * 21 + 13;
  }

  let bottom = Math.max(top + RADIUS * 2, ly - 16);
  if (multi) {
    bottom += 34;
    const note =
      "Slices show each option’s share of all selections. “Of resp.” is the share of respondents who chose the option, so that column can add up to more than 100%.";
    for (const line of wrapText(note, 100)) {
      out.push(text(PAD, bottom, line, { size: 13.5, fill: INK.muted }));
      bottom += 19;
    }
    bottom -= 12;
  }

  return { body: out.join(""), height: Math.ceil(bottom + PAD) };
}

export interface SvgImage {
  svg: string;
  width: number;
  height: number;
}

const svgOpen = (width: number, height: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

/** One question as a self-contained SVG image. */
export function buildCardSvg(stat: QuestionStat): SvgImage {
  const { body, height } = cardContent(stat);
  const svg =
    svgOpen(CARD_WIDTH, height) +
    `<rect width="${CARD_WIDTH}" height="${height}" fill="${INK.panel}"/>` +
    `<rect x="0.5" y="0.5" width="${CARD_WIDTH - 1}" height="${height - 1}" fill="none" stroke="${INK.gold}" stroke-opacity="0.4"/>` +
    body +
    `</svg>`;
  return { svg, width: CARD_WIDTH, height };
}

/**
 * The whole results board as one image: title band, then the four sections,
 * three cards to a row (roughly the proportions of a portrait page).
 */
export function buildBoardSvg(
  sections: SectionStats[],
  meta: { arabicName: string; name: string; title: string; subtitle: string },
): SvgImage {
  const COLS = 3;
  const MARGIN = 56;
  const GAP = 28;
  const width = MARGIN * 2 + COLS * CARD_WIDTH + (COLS - 1) * GAP;
  const out: string[] = [];

  // Title band.
  // Title band, in the order of the site's own masthead: Arabic name, Latin name, title.
  out.push(
    `<text x="${width / 2}" y="92" font-family="'Traditional Arabic', 'Geeza Pro', 'Noto Naskh Arabic', ${SERIF}" font-size="50" font-weight="700" fill="${INK.goldLight}" text-anchor="middle" direction="rtl">${esc(meta.arabicName)}</text>`,
    text(width / 2, 142, meta.name.toUpperCase(), {
      size: 22,
      weight: 700,
      fill: INK.goldLight,
      anchor: "middle",
      spacing: 9,
    }),
    text(width / 2, 226, meta.title, { size: 68, family: SERIF, fill: INK.sand, anchor: "middle" }),
    text(width / 2, 272, meta.subtitle, { size: 22, fill: INK.muted, anchor: "middle" }),
    `<line x1="${MARGIN}" y1="312" x2="${width - MARGIN}" y2="312" stroke="${INK.gold}" stroke-opacity="0.7" stroke-width="1.5"/>`,
  );
  let y = 312;

  for (const section of sections) {
    y += 78;
    out.push(
      text(MARGIN, y, section.id, { size: 46, family: SERIF, fill: INK.goldLight }),
      text(MARGIN + 52, y - 4, section.title, { size: 32, family: SERIF, fill: INK.sand }),
    );
    y += 30;

    const cards = section.questions.map(cardContent);
    for (let start = 0; start < cards.length; start += COLS) {
      const row = cards.slice(start, start + COLS);
      const rowHeight = Math.max(...row.map((c) => c.height));
      row.forEach((card, i) => {
        const x = MARGIN + i * (CARD_WIDTH + GAP);
        out.push(
          `<g transform="translate(${x} ${y})">` +
            `<rect width="${CARD_WIDTH}" height="${rowHeight}" rx="6" fill="${INK.panel}" stroke="${INK.gold}" stroke-opacity="0.4"/>` +
            card.body +
            `</g>`,
        );
      });
      y += rowHeight + GAP;
    }
    y -= GAP;
  }

  const height = Math.ceil(y + MARGIN);
  const svg =
    svgOpen(width, height) + `<rect width="${width}" height="${height}" fill="${INK.night}"/>` + out.join("") + `</svg>`;
  return { svg, width, height };
}
