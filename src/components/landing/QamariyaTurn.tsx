"use client";

import { useEffect, useRef } from "react";

const MAX_TURN = 28; // degrees either side of facing front

/**
 * Turns the qamariya as its section scrolls through the viewport by writing
 * one CSS custom property (--turn). No React re-renders on scroll; a passive
 * listener schedules at most one update per animation frame, and only while
 * the section is on screen. Under prefers-reduced-motion it never attaches,
 * and the CSS keeps the window facing front.
 */
export function QamariyaTurn({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let frame = 0;
    let listening = false;

    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 0 when the stage's top enters at the bottom, 1 when its bottom leaves the top.
      const progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
      const turn = (progress - 0.5) * 2 * MAX_TURN;
      el.style.setProperty("--turn", `${turn.toFixed(2)}deg`);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const start = () => {
      if (listening || motion.matches) return;
      listening = true;
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      onScroll();
    };
    const stop = () => {
      if (!listening) return;
      listening = false;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { rootMargin: "100px 0px" },
    );
    observer.observe(el);

    const onMotionChange = () => {
      if (motion.matches) {
        stop();
        el.style.removeProperty("--turn");
      } else {
        start();
      }
    };
    motion.addEventListener("change", onMotionChange);

    return () => {
      observer.disconnect();
      motion.removeEventListener("change", onMotionChange);
      stop();
    };
  }, []);

  return (
    <div ref={ref} className="q-scene">
      {children}
    </div>
  );
}
