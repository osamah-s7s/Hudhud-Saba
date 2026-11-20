"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { questions, site, totalQuestions, ui } from "@/data/survey";
import { isAnswered, validateAnswers, type AnswerValue, type SubmitPayload, type SubmitResponse } from "@/lib/answers";
import { survey, useSurvey } from "./store";
import { stepIndex, steps, type Step } from "./steps";
import { QuestionStep, SectionCard, SendStep, StepNav, ThankYou, type SubmitState } from "./StepViews";

const requiredMessage = (kind: string) =>
  kind === "multi" ? ui.stepper.required.multi : ui.stepper.required.single;

/** Is this keydown an "Enter to continue" (and not Enter meant for something else)? */
function isAdvanceKey(e: KeyboardEvent): boolean {
  // e.repeat: a held Enter must not run through several steps.
  if (e.key !== "Enter" || e.repeat || e.isComposing || e.defaultPrevented) return false;
  if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return false;
  const t = e.target as HTMLElement | null;
  if (!t) return true;
  if (t.closest("textarea, button, a, select, [contenteditable='true']")) return false;
  if (t instanceof HTMLInputElement && !["radio", "checkbox"].includes(t.type)) return false;
  return true;
}

function TopBar({ step, answered }: { step: Step; answered: number }) {
  const section = step.kind === "send" ? null : step.section;
  const pct = Math.round((answered / totalQuestions) * 100);
  return (
    <header className="border-b border-transparent bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-night-deep)_70%,transparent),transparent)]">
      <h1 className="sr-only">{site.name}</h1>
      <div className="mx-auto max-w-[64rem]">
        <div className="flex min-h-14 items-center justify-between gap-x-4 px-5 max-[19.5rem]:flex-wrap max-[19.5rem]:py-2">
          <p className="flex min-w-0 items-baseline gap-2 text-sm text-muted">
            {section ? (
              <>
                <span className="font-serif text-lg leading-none text-gold-light">
                  <span className="sr-only">{ui.stepper.section} </span>
                  {section.id}
                </span>
                <span aria-hidden="true" className="text-subtle">
                  /
                </span>
                <span className="min-w-0 leading-snug wrap-break-word text-sand/90">{section.title}</span>
              </>
            ) : (
              <span className="text-sand/90">{ui.send.crumb}</span>
            )}
          </p>
          <p className="flex-none text-sm text-muted">
            <span className="font-semibold text-sand">{answered}</span> / {totalQuestions}{" "}
            {ui.stepper.answered}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label={ui.stepper.progressLabel}
          aria-valuemin={0}
          aria-valuemax={totalQuestions}
          aria-valuenow={answered}
          aria-valuetext={`${answered} / ${totalQuestions} ${ui.stepper.answered}`}
          className="relative h-px bg-gold/35"
        >
          <div
            className="absolute top-[-0.5px] left-0 h-[2px] bg-gold-light shadow-[0_0_10px_var(--color-gold)] transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </header>
  );
}

export default function Stepper() {
  const { phase, stepId, answers, submissionId } = useSurvey();
  const index = stepIndex(stepId);
  const step = steps[index];
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });
  const [honeypot, setHoneypot] = useState("");

  const answered = questions.filter((q) => isAnswered(q, answers[q.id])).length;

  // Orient keyboard and screen-reader users on every step change.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [stepId, phase]);

  const goTo = (id: string) => {
    if (submit.status !== "sending") setSubmit({ status: "idle" });
    survey.goTo(id);
  };

  const back = () => {
    setError(null);
    if (index === 0) {
      survey.exit();
      requestAnimationFrame(() => {
        document.getElementById("questionnaire")?.scrollIntoView({ block: "start" });
        document.getElementById("begin")?.focus({ preventScroll: true });
      });
      return;
    }
    goTo(steps[index - 1].id);
  };

  const next = () => {
    if (step.kind === "send") return;
    if (step.kind === "question") {
      const q = step.question;
      if (q.required && !isAnswered(q, answers[q.id])) {
        setError({ id: q.id, message: requiredMessage(q.kind) });
        return;
      }
    }
    setError(null);
    goTo(steps[Math.min(index + 1, steps.length - 1)].id);
  };

  const change = (questionId: string, value: AnswerValue | undefined) => {
    survey.answer(questionId, value);
    if (error?.id === questionId) setError(null);
  };

  const jumpTo = (questionId: string, message?: string) => {
    setError(message ? { id: questionId, message } : null);
    goTo(questionId);
  };

  const send = async () => {
    if (submit.status === "sending") return;
    const check = validateAnswers(answers);
    if (!check.ok) {
      const first = questions.find((q) => check.fields.includes(q.id));
      if (first) jumpTo(first.id, requiredMessage(first.kind));
      return;
    }
    setSubmit({ status: "sending" });
    const payload: SubmitPayload = { answers, website: honeypot, submissionId: submissionId ?? "" };
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let data: SubmitResponse | null = null;
      try {
        data = (await res.json()) as SubmitResponse;
      } catch {
        data = null;
      }
      if (res.ok && data?.ok) {
        survey.finish();
        return;
      }
      if (res.status === 429 || (data && !data.ok && data.error === "rate_limited")) {
        setSubmit({ status: "error", kind: "rate_limited" });
        return;
      }
      if (data && !data.ok && data.error === "validation") {
        const first = questions.find((q) => data.fields?.includes(q.id));
        if (first) {
          setSubmit({ status: "idle" });
          jumpTo(first.id, ui.stepper.checkAnswer);
          return;
        }
        setSubmit({ status: "error", kind: "validation" });
        return;
      }
      // The server answered but could not accept the response (5xx, not configured…).
      setSubmit({ status: "error", kind: "server" });
    } catch {
      // No answer at all: offline, or the connection dropped.
      setSubmit({ status: "error", kind: "generic" });
    }
  };

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (phase !== "survey" || step.kind === "send" || !isAdvanceKey(e)) return;
    e.preventDefault();
    next();
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKeyDown(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (phase === "done") {
    return (
      <main id="survey" className="stepper-glow min-h-dvh px-5">
        <h1 className="sr-only">{site.name}</h1>
        <div className="step-enter mx-auto flex min-h-dvh max-w-[45.5rem] flex-col justify-center py-16">
          <ThankYou headingRef={headingRef} />
        </div>
      </main>
    );
  }

  return (
    <div className="stepper-glow min-h-dvh">
      <TopBar step={step} answered={answered} />
      <main id="survey" className="px-5">
        <div
          key={step.id}
          className="step-enter mx-auto flex min-h-[calc(100dvh-3.6rem)] max-w-[45.5rem] flex-col justify-center pt-10 pb-16 sm:py-12"
        >
          {step.kind === "question" ? (
            <>
              <QuestionStep
                question={step.question}
                value={answers[step.question.id]}
                onChange={(v) => change(step.question.id, v)}
                error={error?.id === step.question.id ? error.message : null}
                headingRef={headingRef}
              />
              <StepNav onBack={back} onNext={next} nextLabel={ui.stepper.next} />
            </>
          ) : step.kind === "section" ? (
            <>
              <SectionCard section={step.section} count={step.count} headingRef={headingRef} />
              <StepNav onBack={back} onNext={next} nextLabel={ui.stepper.continue} />
            </>
          ) : (
            <SendStep
              answers={answers}
              headingRef={headingRef}
              submit={submit}
              honeypot={honeypot}
              onHoneypot={setHoneypot}
              onJump={(id) => jumpTo(id)}
              onBack={back}
              onSend={send}
            />
          )}
        </div>
      </main>
    </div>
  );
}
