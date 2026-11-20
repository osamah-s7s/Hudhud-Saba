/*
 * The qamariya, drawn as SVG: a sand-coloured gypsum half-disc with a dotted
 * border and four rings of carved openings filled with coloured glass.
 * Purely decorative (the text beneath explains it), so everything is aria-hidden.
 * Geometry is computed once on the server; the client only turns it.
 */

type RGB = [number, number, number];

const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const toHex = (c: RGB) =>
  `#${c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
/** Mix palette colour a toward b by t (0..1). Keeps every colour a tint/shade/mix of the palette. */
const mix = (a: string, b: string, t: number) => {
  const x = hex(a);
  const y = hex(b);
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as RGB);
};

const SAND = "#e8d5b7";
const TERRACOTTA = "#b96b45";
const EARTH = "#713b2e";
const BURGUNDY = "#762f35";
const GOLD = "#b58a45";
const OLIVE = "#68734b";
const WHITE = "#ffffff";
const BLACK = "#000000";

const glass = {
  gold: mix(GOLD, WHITE, 0.24),
  terracotta: mix(TERRACOTTA, WHITE, 0.14),
  rose: mix(mix(BURGUNDY, TERRACOTTA, 0.25), WHITE, 0.3),
  olive: mix(OLIVE, WHITE, 0.2),
  pale: mix(SAND, WHITE, 0.3),
  amber: mix(mix(TERRACOTTA, GOLD, 0.5), WHITE, 0.2),
};

export const gypsum = {
  light: mix(SAND, WHITE, 0.32),
  base: SAND,
  bevel: mix(SAND, EARTH, 0.2),
  dot: mix(SAND, EARTH, 0.42),
  hole: mix(EARTH, BLACK, 0.55),
  edge: mix(SAND, EARTH, 0.38),
  edgeDark: mix(EARTH, BLACK, 0.2),
};

const CX = 300;
const CY = 300;
const R = 290;

type ShapeId = "qa-dot" | "qa-oval" | "qa-arch" | "qa-petal";

interface Opening {
  shape: ShapeId;
  x: number;
  y: number;
  angle: number; // rotation so the shape's local "up" points outward
  cy: number; // local centroid y, for scaling about the middle of the shape
  fill: string;
}

/** n openings evenly spread over the half-circle at radius r. */
function ring(
  n: number,
  r: number,
  shape: ShapeId,
  cy: number,
  colours: string[],
  margin = 0,
): Opening[] {
  return Array.from({ length: n }, (_, i) => {
    const theta = margin + ((180 - 2 * margin) * (i + 0.5)) / n;
    const rad = (theta * Math.PI) / 180;
    return {
      shape,
      x: +(CX - r * Math.cos(rad)).toFixed(2),
      y: +(CY - r * Math.sin(rad)).toFixed(2),
      angle: +(theta - 90).toFixed(2),
      cy,
      fill: colours[i % colours.length],
    };
  });
}

const openings: Opening[] = [
  ...ring(18, 256, "qa-dot", 0, [glass.rose, glass.amber, glass.olive, glass.gold, glass.terracotta, glass.olive, glass.gold], 2),
  ...ring(15, 190, "qa-oval", -18, [glass.terracotta, glass.olive, glass.gold, glass.rose, glass.amber, glass.olive, glass.gold], 3),
  ...ring(10, 116, "qa-arch", -27, [glass.rose, glass.gold, glass.olive, glass.terracotta, glass.amber, glass.gold, glass.olive, glass.rose], 6),
  ...ring(9, 44, "qa-petal", -29, [glass.gold, glass.terracotta, glass.olive, glass.rose, glass.amber], 8),
];

const tf = (o: Opening, scale: number, dx = 0, dy = 0) =>
  `translate(${o.x} ${o.y}) rotate(${o.angle}) translate(${dx} ${o.cy + dy}) scale(${scale}) translate(0 ${-o.cy})`;

/** Outline of the whole window (half-disc on a sill), used for the face and the extrusion layers. */
export const SILHOUETTE = `M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY} L596 ${CY} L596 324 L4 324 L4 ${CY} Z`;

function Dots() {
  const dots: { x: number; y: number }[] = [];
  const r = 278;
  const n = 64;
  for (let i = 0; i <= n; i++) {
    const rad = (Math.PI * i) / n;
    dots.push({ x: +(CX - r * Math.cos(rad)).toFixed(1), y: +(CY - r * Math.sin(rad)).toFixed(1) });
  }
  for (let x = 18; x <= 582; x += 13.2) dots.push({ x: +x.toFixed(1), y: 314 });
  return (
    <g fill={gypsum.dot}>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="1.9" />
      ))}
    </g>
  );
}

/** Front face of the qamariya. Defines #q-glass (reused for the floor) and #q-sil. */
export function QamariyaFace() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 600 326"
      className="block h-auto w-full"
    >
      <defs>
        <ellipse id="qa-dot" cx="0" cy="0" rx="10.5" ry="13" />
        <path id="qa-oval" d="M-12 0 L-12 -30 A12 12 0 0 1 12 -30 L12 0 A12 6 0 0 1 -12 0Z" />
        <path id="qa-arch" d="M-8 0 L-15 -40 A15 15 0 0 1 15 -40 L8 0 Q0 4 -8 0Z" />
        <path id="qa-petal" d="M0 0 Q18 -28 0 -58 Q-18 -28 0 0Z" />
        <path id="q-sil" d={SILHOUETTE} />
        <linearGradient id="q-face" x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0" stopColor={gypsum.light} />
          <stop offset="0.7" stopColor={gypsum.base} />
          <stop offset="1" stopColor={gypsum.bevel} />
        </linearGradient>
        <radialGradient id="q-shine" cx="0.5" cy="1" r="0.8">
          <stop offset="0" stopColor={WHITE} stopOpacity="0.38" />
          <stop offset="0.6" stopColor={WHITE} stopOpacity="0" />
        </radialGradient>
      </defs>

      <use href="#q-sil" fill="url(#q-face)" />
      <path
        d={SILHOUETTE}
        fill="none"
        stroke={gypsum.edge}
        strokeWidth="1.5"
        opacity="0.6"
      />
      {/* inner carved band */}
      <path
        d={`M${CX - 244} ${CY} A244 244 0 0 1 ${CX + 244} ${CY}`}
        fill="none"
        stroke={gypsum.bevel}
        strokeWidth="1.2"
        opacity="0.55"
      />
      <path
        d={`M${CX - 160} ${CY} A160 160 0 0 1 ${CX + 160} ${CY}`}
        fill="none"
        stroke={gypsum.bevel}
        strokeWidth="1.2"
        opacity="0.45"
      />
      <Dots />

      {/* carved chamfer around each opening */}
      <g fill={gypsum.bevel}>
        {openings.map((o, i) => (
          <use key={i} href={`#${o.shape}`} transform={tf(o, 1.15)} />
        ))}
      </g>
      {/* the depth of the cut */}
      <g fill={gypsum.hole}>
        {openings.map((o, i) => (
          <use key={i} href={`#${o.shape}`} transform={tf(o, 1)} />
        ))}
      </g>
      {/* glass, set slightly back so a sliver of depth shows */}
      <g id="q-glass">
        {openings.map((o, i) => (
          <use key={i} href={`#${o.shape}`} transform={tf(o, 0.84, 1.4, 1.8)} fill={o.fill} />
        ))}
        {/* half-sun at the heart */}
        <path
          d={`M${CX - 36} ${CY} A36 36 0 0 1 ${CX + 36} ${CY}Z`}
          fill={glass.pale}
          stroke={gypsum.hole}
          strokeWidth="3"
        />
      </g>
      <path d={`M${CX - 36} ${CY} A36 36 0 0 1 ${CX + 36} ${CY}Z`} fill="url(#q-shine)" />
      <rect x="4" y={CY - 1} width="592" height="2.5" fill={gypsum.bevel} opacity="0.8" />
    </svg>
  );
}

/** A slice of the window's edge, stacked a few times behind the face to give it thickness. */
export function QamariyaEdge({ shade }: { shade: number }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 600 326" className="block h-auto w-full">
      <use href="#q-sil" fill={mix(gypsum.edge, gypsum.edgeDark, shade)} />
    </svg>
  );
}

/** The glass colours again, for the light thrown on the floor. */
export function QamariyaLight() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 600 326" className="block h-auto w-full">
      <use href="#q-glass" />
    </svg>
  );
}
