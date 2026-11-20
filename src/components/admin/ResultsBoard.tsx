import { buildBoardSvg } from "@/lib/admin-charts";
import { site } from "@/data/survey";
import { formatDayKey, type SectionStats } from "@/lib/admin-stats";
import { DownloadPngButton } from "./DownloadPngButton";
import { QuestionChart } from "./QuestionChart";

const BOARD_TITLE = "Survey Results";

/** The "survey results board": a title band, then a grid of chart cards per section. */
export function ResultsBoard({
  sections,
  total,
  today,
}: {
  sections: SectionStats[];
  total: number;
  /** "YYYY-MM-DD" in the admin time zone; printed on the exported board and used in its file name. */
  today: string;
}) {
  const count = `${total.toLocaleString("en-GB")} ${total === 1 ? "response" : "responses"}`;
  const board = buildBoardSvg(sections, {
    arabicName: site.arabicName,
    name: site.name,
    title: BOARD_TITLE,
    subtitle: `${count}  ·  ${formatDayKey(today, true)}`,
  });

  return (
    <section aria-labelledby="results-title" id="results" className="scroll-mt-6">
      <div className="admin-band flex flex-wrap items-end justify-between gap-x-8 gap-y-5 px-4 py-6 sm:px-8 sm:py-8">
        <div className="min-w-0">
          <p lang="ar" dir="rtl" className="w-fit font-arabic text-[1.375rem] leading-none text-gold-light">
            {site.arabicName}
          </p>
          <p className="kicker mt-3">{site.name}</p>
          <h2
            id="results-title"
            className="mt-3 font-serif text-[clamp(1.75rem,1.4rem+1.6vw,2.5rem)] leading-[1.15] font-medium text-sand"
          >
            {BOARD_TITLE}
          </h2>
          <p className="mt-2 text-[0.9375rem] text-muted tabular-nums">
            {count} · one chart per choice question
          </p>
        </div>
        <DownloadPngButton
          svg={board.svg}
          width={board.width}
          height={board.height}
          fileName={`hudhud-saba-survey-results-${today}.png`}
          label="Download all charts"
          accessibleLabel="Download all charts as one PNG"
          className="admin-btn"
        />
      </div>

      {sections.map((section) => (
        <section key={section.id} aria-labelledby={`results-${section.id}`} className="mt-10">
          <h3 id={`results-${section.id}`} className="flex items-baseline gap-4">
            <span aria-hidden="true" className="font-serif text-[2rem] leading-none text-gold-light">
              {section.id}
            </span>
            <span className="sr-only">Section {section.id}: </span>
            <span className="font-serif text-[1.5rem] leading-tight font-medium text-sand">{section.title}</span>
          </h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {section.questions.map((stat) => (
              <QuestionChart key={stat.id} stat={stat} />
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
