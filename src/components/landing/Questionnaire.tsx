import { sections, totalQuestions, questionsInSection, ui } from "@/data/survey";
import { BeginButton } from "./BeginButton";

export function Questionnaire() {
  const q = ui.questionnaire;
  const k = q.keyboard;
  return (
    <section
      id="questionnaire"
      aria-labelledby="questionnaire-title"
      tabIndex={-1}
      className="px-5 pt-[clamp(5rem,9vw,6.5rem)] pb-28"
    >
      <div
        aria-hidden="true"
        className="mx-auto h-px max-w-[27rem] bg-[linear-gradient(90deg,transparent,var(--color-gold),transparent)] opacity-70"
      />
      <div className="mx-auto max-w-[42rem] text-center">
        <p className="kicker mt-14">{q.kicker}</p>
        <h2
          id="questionnaire-title"
          className="mx-auto mt-5 max-w-[11ch] font-serif text-[clamp(2.25rem,1.7rem+2vw,3rem)] leading-[1.2] font-medium text-sand sm:max-w-none"
        >
          {q.title(totalQuestions)}
        </h2>

        <ul
          aria-label={q.sectionsLabel}
          className="mt-11 grid grid-cols-1 overflow-hidden rounded-[6px] border border-gold/45 text-left sm:grid-cols-2"
        >
          {sections.map((s, i) => (
            <li
              key={s.id}
              className={`flex items-center gap-5 px-5 py-5 sm:min-h-[6.3rem] sm:px-5 ${
                i > 0 ? "border-t border-gold/25" : ""
              } ${i === 1 ? "sm:border-t-0" : ""} ${i % 2 === 1 ? "sm:border-l sm:border-l-gold/25" : ""}`}
            >
              <span
                aria-hidden="true"
                className="w-7 flex-none font-serif text-[2.4rem] leading-none text-gold-light"
              >
                {s.id}
              </span>
              <span className="min-w-0 wrap-break-word">
                <span className="sr-only">
                  {ui.stepper.section} {s.id}:{" "}
                </span>
                <span className="block text-base leading-snug font-medium text-sand">{s.title}</span>
                <span className="mt-1 block text-[0.8125rem] text-muted">
                  {q.questionCount(questionsInSection(s.id).length)}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-12">
          <BeginButton />
        </div>
        <p className="mt-6 text-sm text-muted">{q.note}</p>
        <p className="kbd-hint mt-4 text-sm text-muted">
          {k.use}{" "}
          <kbd className="kbd-chip">
            <span aria-hidden="true">↑</span>
            <span className="sr-only">{k.up}</span>
          </kbd>
          <kbd className="kbd-chip">
            <span aria-hidden="true">↓</span>
            <span className="sr-only">{k.down}</span>
          </kbd>{" "}
          {k.move}{" "}
          <kbd className="kbd-chip">{k.space}</kbd> {k.choose} <kbd className="kbd-chip">{k.enter}</kbd>{" "}
          {k.advance}
        </p>
      </div>
    </section>
  );
}
