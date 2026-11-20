"use client";

import type { Ref } from "react";
import { intro, questions, totalQuestions, ui, type Question, type Section } from "@/data/survey";
import { isAnswered, type AnswerValue, type Answers } from "@/lib/answers";
import { ArrowLeft, ArrowRight, Ornament } from "@/components/icons";
import { Options } from "./Options";

const pad = (n: number) => String(n).padStart(2, "0");

const headingFocus = "scroll-mt-24 outline-none";

/* ---------------------------------------------------------------- nav */

export function StepNav({
  onBack,
  onNext,
  nextLabel,
  showEnterHint = true,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  showEnterHint?: boolean;
}) {
  const s = ui.stepper;
  return (
    <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
      <button type="button" className="btn-ghost" onClick={onBack}>
        <ArrowLeft />
        {s.back}
      </button>
      <div className="ml-auto flex items-center gap-4">
        {showEnterHint ? (
          <span aria-hidden="true" className="kbd-hint text-sm text-muted">
            {s.orPress} <kbd className="kbd-chip">{s.enter}</kbd>
          </span>
        ) : null}
        <button type="button" className="btn-gold" onClick={onNext}>
          {nextLabel}
          <ArrowRight />
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- question */

export function QuestionStep({
  question,
  value,
  onChange,
  error,
  headingRef,
}: {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue | undefined) => void;
  error: string | null;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const s = ui.stepper;
  const promptId = `${question.id}-prompt`;
  const hintId = `${question.id}-hint`;
  const errorId = `${question.id}-error`;
  const countId = `${question.id}-count`;
  const describedBy = [hintId, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <>
      <div className="relative">
        <span
          aria-hidden="true"
          className="outline-numeral pointer-events-none absolute right-[calc(100%+2.25rem)] -bottom-[3.9rem] hidden font-serif text-[10.5rem] leading-none select-none min-[1100px]:block"
        >
          {pad(question.number)}
        </span>
        <h2 ref={headingRef} tabIndex={-1} className={headingFocus}>
          <span className="kicker flex items-center gap-4 text-[0.6875rem] tracking-[0.3em] sm:text-xs">
            <span>
              {s.question} {pad(question.number)}
            </span>
            <span aria-hidden="true" className="h-px w-8 bg-gold/60" />
            <span className="text-muted">
              {s.of} {totalQuestions}
            </span>
          </span>
          <span
            id={promptId}
            className="mt-5 block max-w-[43rem] font-serif text-[clamp(1.7rem,1.1rem+2.5vw,3.25rem)] leading-[1.16] font-medium text-sand"
          >
            {question.prompt}
          </span>
        </h2>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span id={hintId} className="hint-pill">
            {question.hint}
            {!question.required ? <span className="sr-only">, {s.optional}</span> : null}
          </span>
          {!question.required ? (
            <span aria-hidden="true" className="hint-pill border-edge text-muted">
              {s.optional}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-8">
        {question.kind === "text" ? (
          <TextAnswer
            question={question}
            value={typeof value === "string" ? value : ""}
            onChange={onChange}
            labelledBy={promptId}
            describedBy={`${hintId} ${countId}`}
            countId={countId}
          />
        ) : (
          <Options
            question={question}
            value={value}
            onChange={onChange}
            labelledBy={promptId}
            describedBy={describedBy}
            invalid={Boolean(error)}
          />
        )}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="field-error mt-5">
          <span aria-hidden="true" className="mt-[0.2rem] text-gold-light">
            ◆
          </span>
          {error}
        </p>
      ) : null}
    </>
  );
}

function TextAnswer({
  question,
  value,
  onChange,
  labelledBy,
  describedBy,
  countId,
}: {
  question: Question;
  value: string;
  onChange: (value: AnswerValue | undefined) => void;
  labelledBy: string;
  describedBy: string;
  countId: string;
}) {
  const max = question.maxLength ?? 2000;
  return (
    <div>
      <textarea
        id={`${question.id}-input`}
        name={question.id}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        maxLength={max}
        rows={6}
        autoComplete="off"
        autoCapitalize="sentences"
        spellCheck
        enterKeyHint="enter"
        value={value}
        placeholder={ui.stepper.textPlaceholder}
        onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
        className="text-answer"
      />
      <p id={countId} className="mt-2 text-right text-sm text-muted tabular-nums">
        {ui.stepper.characters(value.length, max)}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- section card */

export function SectionCard({
  section,
  count,
  headingRef,
}: {
  section: Section;
  count: number;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  return (
    <div className="text-center">
      <Ornament />
      <h2 ref={headingRef} tabIndex={-1} className={`mt-8 ${headingFocus}`}>
        <span className="kicker block">
          {ui.stepper.section} {section.id}
        </span>
        <span
          aria-hidden="true"
          className="mt-4 block font-serif text-[clamp(6rem,4rem+8vw,9rem)] leading-[0.9] text-gold-light"
        >
          {section.id}
        </span>
        <span className="mt-5 block font-serif text-[clamp(1.9rem,1.4rem+2vw,2.75rem)] leading-tight font-medium text-sand">
          {section.title}
        </span>
      </h2>
      <p className="mt-4 text-muted">{ui.questionnaire.questionCount(count)}</p>
    </div>
  );
}

/* ---------------------------------------------------------------- send */

export type SubmitState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "error"; kind: "rate_limited" | "validation" | "generic" };

export function SendStep({
  answers,
  headingRef,
  submit,
  honeypot,
  onHoneypot,
  onJump,
  onBack,
  onSend,
}: {
  answers: Answers;
  headingRef: Ref<HTMLHeadingElement>;
  submit: SubmitState;
  honeypot: string;
  onHoneypot: (v: string) => void;
  onJump: (questionId: string) => void;
  onBack: () => void;
  onSend: () => void;
}) {
  const t = ui.send;
  const answered = questions.filter((q) => isAnswered(q, answers[q.id])).length;
  const missing = questions.filter((q) => q.required && !isAnswered(q, answers[q.id]));
  const skippedOptional = questions.filter((q) => !q.required && !isAnswered(q, answers[q.id]));
  const sending = submit.status === "sending";

  return (
    <div className="text-center">
      <Ornament />
      <h2 ref={headingRef} tabIndex={-1} className={`mt-8 ${headingFocus}`}>
        <span className="kicker block">{t.kicker}</span>
        <span className="mt-5 block font-serif text-[clamp(1.9rem,1.4rem+2vw,3rem)] leading-tight font-medium text-sand">
          {t.title}
        </span>
      </h2>
      <p className="mt-6 font-serif text-2xl text-gold-light italic">
        {t.summary(answered, totalQuestions)}
      </p>

      {missing.length > 0 ? (
        <div className="mx-auto mt-8 max-w-[34rem] rounded-[5px] border border-terracotta/70 p-5 text-left sm:p-6">
          <p className="text-sand">{t.missing}</p>
          <ul className="mt-4 space-y-2">
            {missing.map((q) => (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => onJump(q.id)}
                  className="flex min-h-11 w-full touch-manipulation items-center gap-3 rounded-[4px] border border-line px-4 py-2 text-left text-[0.9375rem] text-sand transition-colors hover:border-gold"
                >
                  <span className="flex-none font-semibold text-gold-light">{t.goTo(q.number)}</span>
                  <span className="min-w-0 truncate text-muted">{q.prompt}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mx-auto mt-6 max-w-[30rem] space-y-2 text-muted">
          <p>{t.allRequired}</p>
          {skippedOptional.map((q) => (
            <p key={q.id}>{t.optionalSkipped(q.number)}</p>
          ))}
        </div>
      )}
      <p className="mx-auto mt-4 max-w-[30rem] text-sm text-muted">{t.privacy}</p>

      {/* Honeypot: off-screen (not display:none) so naive bots fill it; people never see it. */}
      <div className="honeypot" aria-hidden="true">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => onHoneypot(e.target.value)}
          />
        </label>
      </div>

      {/* Persistent live regions: the status is spoken while sending, the alert when it fails. */}
      <p role="status" className="sr-only">
        {sending ? t.sending : ""}
      </p>
      <div role="alert">
        {submit.status === "error" ? (
          <div className="field-error mx-auto mt-8 max-w-[34rem] text-left">
            <span aria-hidden="true" className="mt-[0.2rem] text-gold-light">
              ◆
            </span>
            <span>{t.errors[submit.kind]}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-10 flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
        <button type="button" className="btn-ghost" onClick={onBack} disabled={sending}>
          <ArrowLeft />
          {ui.stepper.back}
        </button>
        {/* aria-disabled (not disabled) while sending keeps keyboard focus on the button,
            so Enter can retry after an error; onSend ignores presses while a send is in flight. */}
        <button
          type="button"
          className="btn-gold min-w-[min(15rem,100%)]"
          onClick={onSend}
          disabled={missing.length > 0}
          aria-disabled={sending || undefined}
          aria-busy={sending || undefined}
        >
          {sending ? t.sending : submit.status === "error" ? t.tryAgain : t.submit}
          {sending ? null : <ArrowRight />}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- thank you */

export function ThankYou({ headingRef }: { headingRef: Ref<HTMLHeadingElement> }) {
  return (
    <div className="text-center">
      <Ornament />
      <h2 ref={headingRef} tabIndex={-1} className={`mt-10 ${headingFocus}`}>
        <span className="kicker block">{ui.thankYou.kicker}</span>
        <span className="mt-5 block font-serif text-[clamp(2.4rem,1.8rem+2.4vw,3.5rem)] leading-tight font-medium text-sand">
          {ui.thankYou.title}
        </span>
      </h2>
      <p className="mt-6 text-[1.0625rem] text-sand">{intro.thanks}</p>
      <div className="mt-10">
        <Ornament lines={false} size={22} />
      </div>
      <blockquote className="mx-auto mt-6 max-w-[24rem] font-serif text-[clamp(1.9rem,1.5rem+1.4vw,2.5rem)] leading-[1.2] text-gold-light italic">
        <p>{intro.quote}</p>
      </blockquote>
    </div>
  );
}
