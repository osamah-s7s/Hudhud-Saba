"use client";

import { ui } from "@/data/survey";
import { ArrowRight } from "@/components/icons";
import { survey, useSurvey } from "@/components/survey/store";
import { preloadStepper } from "@/components/survey/SurveyRoot";

export function BeginButton() {
  const { startedAt } = useSurvey();
  const resuming = startedAt !== null;
  return (
    <span className="begin-halo relative isolate inline-block">
      <button
        id="begin"
        type="button"
        className="btn-gold min-h-[3.375rem] min-w-[min(14rem,calc(100vw-2.5rem))] px-10 text-[1.1875rem] tracking-[0.03em] sm:min-w-[min(16rem,calc(100vw-2.5rem))]"
        onPointerEnter={preloadStepper}
        onFocus={preloadStepper}
        onClick={() => survey.start()}
      >
        {resuming ? ui.questionnaire.resume : ui.questionnaire.begin}
        <ArrowRight />
      </button>
    </span>
  );
}
