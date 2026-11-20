"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { ui } from "@/data/survey";
import { survey, useSurvey } from "./store";

/** Shown while the stepper's code is on its way (slow connection). */
function StepperLoading() {
  return (
    <main id="survey" className="stepper-glow grid min-h-dvh place-items-center px-5 text-center">
      <p role="status" className="text-muted">
        {ui.send.loading}
      </p>
    </main>
  );
}

/** Shown if the stepper's code cannot be fetched (offline, or the site was just updated). */
function StepperLoadFailed() {
  return (
    <main id="survey" className="stepper-glow grid min-h-dvh place-items-center px-5 text-center">
      <div className="mx-auto max-w-[30rem]">
        <p role="alert" className="text-sand">
          {ui.send.loadFailed}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button type="button" className="btn-ghost" onClick={() => survey.exit()}>
            {ui.stepper.back}
          </button>
          <button type="button" className="btn-gold" onClick={() => window.location.reload()}>
            {ui.send.reload}
          </button>
        </div>
      </div>
    </main>
  );
}

// A failed download must not crash the page (saved progress would reopen the
// stepper on every reload); fall back to a small retry screen instead.
const loadStepper = () =>
  import("./Stepper").catch(() => ({ default: StepperLoadFailed }));

/** Warm the stepper chunk (on idle, or when the visitor reaches for Begin). */
export function preloadStepper() {
  void import("./Stepper").catch(() => {});
}

// The stepper is only ever shown after mount, so it stays out of the initial bundle.
const Stepper = dynamic(loadStepper, { ssr: false, loading: StepperLoading });

/**
 * Swaps between the server-rendered landing page and the one-question-at-a-time
 * stepper, on the same route. The landing stays in the DOM (hidden) so going
 * back to it is instant and its images don't reload.
 */
export function SurveyRoot({ landing }: { landing: React.ReactNode }) {
  const { phase } = useSurvey();

  useEffect(() => {
    const idle =
      window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(preloadStepper);
    return () => cancel(id);
  }, []);

  return (
    <>
      <div hidden={phase !== "landing"}>{landing}</div>
      {phase !== "landing" ? <Stepper /> : null}
    </>
  );
}
