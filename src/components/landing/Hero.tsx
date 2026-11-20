import Image from "next/image";
import { heroPins, site, ui } from "@/data/survey";
import { Hoopoe } from "@/components/icons";

function PinMarker({ number }: { number: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 26" width="20" height="26" className="block drop-shadow-[0_2px_3px_rgba(0,0,0,0.55)]">
      <defs>
        <linearGradient id={`pin-g-${number}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2c690" />
          <stop offset="1" stopColor="#b58a45" />
        </linearGradient>
      </defs>
      <path
        d="M10 25.2C10 25.2 1.2 15.6 1.2 9.6a8.8 8.8 0 0 1 17.6 0c0 6-8.8 15.6-8.8 15.6Z"
        fill={`url(#pin-g-${number})`}
        stroke="#34302c"
        strokeWidth="1.2"
      />
      <text
        x="10"
        y="12.9"
        textAnchor="middle"
        fontSize="9.5"
        fontWeight="700"
        fill="#1d1a18"
        fontFamily="var(--font-hanken), sans-serif"
      >
        {number}
      </text>
    </svg>
  );
}

function Pins() {
  return (
    <ul aria-label={ui.pinsLabel} className="absolute inset-0 m-0 list-none p-0">
      {heroPins.map((pin) => (
        <li
          key={pin.number}
          className="absolute"
          style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
        >
          {/* The pin's tip sits exactly on (x, y); the label rides beside its head. */}
          <span className="absolute bottom-0 left-0 block -translate-x-1/2">
            <PinMarker number={pin.number} />
          </span>
          <span
            className={`absolute bottom-[0.4rem] ${
              pin.labelSide === "left" ? "right-[0.9rem]" : "left-[0.9rem]"
            }`}
          >
            <span className="sr-only">{pin.number}, </span>
            <span className="pin-label">{pin.label}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function JourneyTicket() {
  const { journey } = site;
  return (
    <div className="ticket mx-auto mt-10 w-full max-w-[34rem] px-6 py-4 sm:mt-14 sm:px-8 sm:py-[1.05rem]">
      <p className="sr-only">
        {journey.fromLabel} {journey.from} {journey.toLabel.toLowerCase()} {journey.to}
      </p>
      <div aria-hidden="true" className="flex items-end justify-between gap-2">
        <div className="text-left">
          <span className="block text-[0.625rem] font-bold uppercase tracking-[0.28em] text-gold-light">
            {journey.fromLabel}
          </span>
          <span className="mt-1 block font-serif text-[1.65rem] leading-none font-medium text-sand sm:text-[1.9rem]">
            {journey.from}
          </span>
        </div>
        <div className="relative mb-1 flex min-w-0 flex-1 items-center justify-center self-center text-gold-light">
          <svg
            viewBox="0 0 240 30"
            preserveAspectRatio="none"
            className="absolute inset-x-1 top-1/2 h-6 w-[calc(100%-0.5rem)] -translate-y-1/2 sm:inset-x-3 sm:w-[calc(100%-1.5rem)]"
            fill="none"
          >
            <path
              d="M2 22 Q 120 2 238 22"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
              opacity="0.85"
            />
          </svg>
          <span className="relative -mt-3 bg-[color-mix(in_srgb,var(--color-charcoal)_76%,var(--color-night))] px-1.5">
            <Hoopoe className="h-7 w-auto sm:h-8" />
          </span>
        </div>
        <div className="text-right">
          <span className="block text-[0.625rem] font-bold uppercase tracking-[0.28em] text-gold-light">
            {journey.toLabel}
          </span>
          <span className="mt-1 block font-serif text-[1.65rem] leading-none font-medium text-sand sm:text-[1.9rem]">
            {journey.to}
          </span>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <header className="relative overflow-x-clip">
      <div className="hero-frame">
        <Image
          src="/hero.png"
          alt={ui.heroAlt}
          fill
          preload
          sizes="(min-width: 768px) 100vw, 119vw"
          className="object-cover"
        />
        <div aria-hidden="true" className="hero-fade absolute inset-0" />
        <Pins />
      </div>

      <div className="relative z-10 -mt-12 px-4 text-center md:-mt-[9.9vw]">
        <p className="kicker text-[0.6875rem] tracking-[0.38em] sm:text-xs sm:tracking-[0.42em]">
          {site.kicker}
        </p>
        <p
          lang="ar"
          dir="rtl"
          className="mt-3 font-arabic text-[clamp(2.6rem,1.9rem+2.2vw,3.75rem)] leading-[1.45] font-bold text-gold-light"
        >
          {site.arabicName}
        </p>
        <h1 className="title-glow mt-1 pl-[0.13em] font-serif text-[clamp(3.1rem,1.6rem+6.6vw,7.5rem)] leading-[1.12] font-normal tracking-[0.13em] text-sand uppercase">
          {site.name}
        </h1>
        <p className="mt-5 font-serif text-[clamp(1.2rem,0.95rem+1vw,1.75rem)] text-muted italic sm:mt-6">
          {site.tagline}
        </p>
        <JourneyTicket />
      </div>
    </header>
  );
}
