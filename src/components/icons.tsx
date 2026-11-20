/* Small decorative SVGs. All are aria-hidden: the text next to them carries the meaning. */

export function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
    </svg>
  );
}

export function ArrowLeft({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13.5 8h-11M7 3.5 2.5 8 7 12.5" />
    </svg>
  );
}

/** Single-choice marker: outlined diamond; selected = filled diamond with a dot. */
export function DiamondMarker({ selected }: { selected: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" className="marker">
      <path
        d="M12 1.5 22.5 12 12 22.5 1.5 12Z"
        fill={selected ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {selected ? <path d="M12 9 15 12 12 15 9 12Z" fill="var(--color-gold-pale)" /> : null}
    </svg>
  );
}

/** Multi-select marker: square box; selected = filled box with a check. */
export function CheckMarker({ selected }: { selected: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20" className="marker">
      <rect
        x="1.5"
        y="1.5"
        width="17"
        height="17"
        rx="2.5"
        fill={selected ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.3"
      />
      {selected ? (
        <path
          d="M5.5 10.2 8.6 13.2 14.5 6.8"
          fill="none"
          stroke="var(--color-gold-pale)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}

/** Eight-point star (two squares) with a small diamond at its heart. */
export function StarGlyph({ size = 30, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <rect x="7.5" y="7.5" width="17" height="17" />
      <rect x="7.5" y="7.5" width="17" height="17" transform="rotate(45 16 16)" />
      <path d="M16 11.5 20.5 16 16 20.5 11.5 16Z" />
      <path d="M16 14 18 16 16 18 14 16Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Thin gold lines either side of the star. */
export function Ornament({ lines = true, size = 30 }: { lines?: boolean; size?: number }) {
  return (
    <div aria-hidden="true" className="flex items-center justify-center gap-6 text-gold">
      {lines ? <span className="ornament-line" /> : null}
      <StarGlyph size={size} />
      {lines ? <span className="ornament-line is-right" /> : null}
    </div>
  );
}

/** A line-drawn hoopoe in flight-pose, facing right. */
export function Hoopoe({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 44 36"
      width="44"
      height="36"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* crest */}
      <path d="M25.5 9.2 20.8 2.6M26.6 8.6 24.2 1.6M27.8 8.4 27.6 1.4M28.9 8.8 30.8 2.4M29.8 9.6 33.4 4.6" />
      <path d="M20.8 2.6l-.5 1.4M24.2 1.6v1.5M27.6 1.4l.5 1.4M30.8 2.4l-.1 1.5" strokeWidth="1.8" />
      {/* head + beak */}
      <path d="M24.6 13.4c-.2-2.6 1.6-4.6 4-4.6 2.1 0 3.6 1.4 3.9 3.2" />
      <path d="M32.5 12c2.6.4 5.6 2 8.6 4.8" />
      <path d="M32.3 13.5c2.4.5 5 2 8.8 3.3" />
      <circle cx="29.3" cy="11.6" r=".7" fill="currentColor" stroke="none" />
      {/* body */}
      <path d="M24.6 13.4c-4.6.6-9.2 3.4-12 7.6-1.5 2.2-3.9 4.4-8.8 6.2" />
      <path d="M32 14.2c.6 3.6-1.2 7.6-5.4 9.8-4 2-9.4 2.2-14.8 1.6" />
      {/* wing bars */}
      <path d="M15.6 19.4c3.4.4 6.8.4 10.2-.6M14.2 21.6c3.8.6 7.6.6 11.4-.6M13.2 23.6c3.4.4 7 .2 10.2-1" />
      {/* tail */}
      <path d="M11.8 25.6 3.2 29.4M12.8 25.8 5.2 31" />
      {/* legs */}
      <path d="M19 26.2l-1 6.4M22.4 26l.4 6.6M16.6 32.6h3.2M21.2 32.6h3.2" />
    </svg>
  );
}
