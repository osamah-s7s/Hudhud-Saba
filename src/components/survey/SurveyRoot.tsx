"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useSurvey } from "./store";

const loadStepper = () => import("./Stepper");

/** Warm the stepper chunk (on idle, or when the visitor reaches for Begin). */
export function preloadStepper() {
  void loadStepper();
}

// The stepper is only ever shown after mount, so it stays out of the initial bundle.
const Stepper = dynamic(loadStepper, { ssr: false });

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
