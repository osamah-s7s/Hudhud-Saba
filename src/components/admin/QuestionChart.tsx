import { buildCardSvg, buildPie, chartFileName, describeChart, INK } from "@/lib/admin-charts";
import { formatPercent, type QuestionStat } from "@/lib/admin-stats";
import { DownloadPngButton } from "./DownloadPngButton";

const RADIUS = 100;
const BOX = RADIUS * 2 + 4;

/**
 * One choice question: a pie (single choice) or donut ("select all that
 * apply") with a legend table beside it. The drawing is a single image for
 * assistive tech; the legend is a real table carrying every figure, so nothing
 * depends on colour.
 */
export function QuestionChart({ stat }: { stat: QuestionStat }) {
  const titleId = `chart-${stat.id}`;
  const multi = stat.kind === "multi";
  const pie = buildPie(stat, RADIUS);
  const exported = buildCardSvg(stat);

  return (
    <article aria-labelledby={titleId} className="admin-card flex min-w-0 flex-col px-4 py-5 sm:px-6 sm:py-6">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-muted">
        <span className="font-semibold tracking-[0.14em] text-gold-light uppercase">Question {stat.number}</span>
        <span aria-hidden="true">·</span>
        <span>{multi ? "Select all that apply" : "Single choice"}</span>
      </p>
      <h4 id={titleId} className="mt-2 font-serif text-[1.375rem] leading-tight font-medium text-sand">
        {stat.prompt}
      </h4>
      <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted tabular-nums">
        {stat.answered.toLocaleString("en-GB")} {stat.answered === 1 ? "respondent" : "respondents"} answered
        {multi ? ` · ${stat.selections.toLocaleString("en-GB")} selections` : ""}
      </p>

      <div className="mt-5 flex flex-wrap items-start gap-x-7 gap-y-6 border-t border-gold/25 pt-6">
        <svg
          role="img"
          aria-label={describeChart(stat)}
          viewBox={`${-BOX / 2} ${-BOX / 2} ${BOX} ${BOX}`}
          className="mx-auto h-auto w-[10.5rem] flex-none sm:w-[11.5rem]"
        >
          {pie.empty ? (
            <>
              <circle
                r={pie.form === "donut" ? (RADIUS + pie.innerRadius) / 2 : RADIUS - 1}
                fill="none"
                stroke={INK.line}
                strokeWidth={pie.form === "donut" ? RADIUS - pie.innerRadius : 2}
                strokeDasharray={pie.form === "pie" ? "6 6" : undefined}
              />
              <text y="5" textAnchor="middle" fontSize="15" fill={INK.muted}>
                No answers yet
              </text>
            </>
          ) : (
            <>
              {pie.slices.map((s) =>
                s.path ? (
                  <path
                    key={s.id}
                    d={s.path}
                    fill={s.color}
                    fillRule="evenodd"
                    stroke="var(--color-panel)"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />
                ) : null,
              )}
              {pie.slices.map((s) =>
                s.path && s.showLabel ? (
                  <text
                    key={s.id}
                    x={s.labelX}
                    y={s.labelY + 5}
                    textAnchor="middle"
                    fontSize="14.5"
                    fontWeight="700"
                    fill={s.textColor}
                  >
                    {formatPercent(s.share)}
                  </text>
                ) : null,
              )}
              {pie.form === "donut" ? (
                <>
                  <text y="4" textAnchor="middle" fontSize="32" fill={INK.sand} className="font-serif">
                    {stat.answered}
                  </text>
                  <text y="22" textAnchor="middle" fontSize="10.5" fontWeight="700" letterSpacing="1.4" fill={INK.muted}>
                    ANSWERED
                  </text>
                </>
              ) : null}
            </>
          )}
        </svg>

        <table className="min-w-[13.5rem] flex-1 border-collapse text-left text-[0.875rem] leading-snug tabular-nums">
          <caption className="sr-only">
            Question {stat.number}: {stat.prompt}
          </caption>
          <thead>
            <tr className="text-[0.6875rem] tracking-[0.1em] text-muted uppercase">
              <th scope="col" className="border-b border-line pb-2 pr-2 font-semibold">
                Option
              </th>
              <th scope="col" className="border-b border-line pb-2 pl-2 text-right font-semibold">
                Count
              </th>
              <th scope="col" className="border-b border-line pb-2 pl-3 text-right font-semibold">
                {multi ? "Share" : "%"}
              </th>
              {multi ? (
                <th scope="col" className="border-b border-line pb-2 pl-3 text-right font-semibold">
                  <span aria-hidden="true">Of resp.</span>
                  <span className="sr-only">Of respondents</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {pie.slices.map((s) => (
              <tr key={s.id} className="align-top">
                <th scope="row" className="border-b border-line/60 py-2 pr-2 font-normal text-sand">
                  <span className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-[0.2rem] size-3 flex-none rounded-[2px] ring-1 ring-night"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="min-w-0 wrap-break-word">{s.label}</span>
                  </span>
                </th>
                <td className="border-b border-line/60 py-2 pl-2 text-right text-muted">
                  {s.count.toLocaleString("en-GB")}
                </td>
                <td
                  className={`border-b border-line/60 py-2 pl-3 text-right ${multi ? "text-muted" : "font-semibold text-sand"}`}
                >
                  {formatPercent(s.share)}
                </td>
                {multi ? (
                  <td className="border-b border-line/60 py-2 pl-3 text-right font-semibold text-sand">
                    {formatPercent(s.percent)}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {multi ? (
        <p className="mt-4 text-[0.8125rem] leading-relaxed text-muted">
          Slices show each option’s share of all selections. “Of resp.” is the share of respondents who chose the
          option, so that column can add up to more than 100%.
        </p>
      ) : null}

      <div className="mt-auto pt-5">
        <DownloadPngButton
          svg={exported.svg}
          width={exported.width}
          height={exported.height}
          fileName={chartFileName(stat)}
          label="Download PNG"
          accessibleLabel={`Download PNG of question ${stat.number}`}
        />
      </div>
    </article>
  );
}
