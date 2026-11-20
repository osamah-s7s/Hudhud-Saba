import { qamariya } from "@/data/survey";
import { QamariyaEdge, QamariyaFace, QamariyaLight } from "./QamariyaGlass";
import { QamariyaTurn } from "./QamariyaTurn";

const EDGE_LAYERS = [2, 4, 6, 8, 10, 12, 14];

export function Qamariya() {
  return (
    <section aria-labelledby="qamariya-title" className="overflow-x-clip px-4 pt-14 sm:pt-16">
      <QamariyaTurn>
        <div aria-hidden="true" className="niche">
          <div className="q-stage absolute inset-x-[3%] bottom-0">
            <div className="q-turn relative">
              {EDGE_LAYERS.map((z, i) => (
                <div
                  key={z}
                  className="q-layer"
                  style={{ transform: `translateZ(-${z}px)` }}
                >
                  <QamariyaEdge shade={i / (EDGE_LAYERS.length - 1)} />
                </div>
              ))}
              <div className="relative">
                <QamariyaFace />
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-[3%] top-full">
            <div className="q-floor">
              <div className="q-floor-inner">
                <QamariyaLight />
              </div>
            </div>
          </div>
        </div>
      </QamariyaTurn>

      <div className="mx-auto mt-[clamp(7rem,14vw,10rem)] max-w-xl text-center">
        <p className="kicker flex items-center justify-center gap-3">
          <span lang="ar" dir="rtl" className="font-arabic text-lg tracking-normal normal-case">
            {qamariya.arabic}
          </span>
          <span aria-hidden="true" className="text-subtle">
            ·
          </span>
          <span>{qamariya.kicker}</span>
        </p>
        <h2
          id="qamariya-title"
          className="mt-4 font-serif text-[clamp(1.9rem,1.4rem+1.8vw,2.6rem)] leading-tight text-sand italic"
        >
          {qamariya.title}
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[1.0625rem] leading-relaxed text-muted">
          {qamariya.body}
        </p>
      </div>
    </section>
  );
}
