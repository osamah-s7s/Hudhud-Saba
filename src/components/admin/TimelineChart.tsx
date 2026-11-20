import { formatDayKey, type Timeline } from "@/lib/admin-stats";
import { Chevron } from "./Chevron";

const plural = (n: number) => `${n.toLocaleString("en-GB")} ${n === 1 ? "response" : "responses"}`;

/**
 * Responses per day as plain CSS columns (no chart library).
 * The plot itself is one image for assistive tech, with the whole story in its
 * label; the exact figures are in the table underneath.
 */
export function TimelineChart({ timeline }: { timeline: Timeline }) {
  const { days, max, total, peak } = timeline;
  if (days.length === 0) return null;

  const first = days[0];
  const last = days[days.length - 1];
  const middle = days[Math.floor((days.length - 1) / 2)];
  const top = Math.max(max, 1);
  const range = `${formatDayKey(first.day)} to ${formatDayKey(last.day, true)}`;
  const summary = peak
    ? `${plural(total)} in total. Busiest day: ${formatDayKey(peak.day)} with ${plural(peak.count)}.`
    : "No responses in this period.";

  return (
    <figure className="admin-card px-4 py-5 sm:px-6 sm:py-6">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <span className="text-[0.9375rem] font-medium text-sand">Responses per day, last {days.length} days</span>
        <span className="text-[0.8125rem] text-muted">{summary}</span>
      </figcaption>

      <div
        role="img"
        aria-label={`Column chart of responses per day, ${range}. ${summary}`}
        className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3"
      >
        {/* y axis: maximum and zero */}
        <div className="flex h-40 flex-col justify-between text-right text-xs leading-none text-muted tabular-nums sm:h-48">
          <span className="-translate-y-1/2">{top}</span>
          <span className="translate-y-1/2">0</span>
        </div>

        {/* plot */}
        <div className="relative h-40 border-b border-edge sm:h-48">
          <div className="absolute inset-x-0 top-0 border-t border-dashed border-line" />
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-line/60" />
          <div className="absolute inset-0 flex items-end gap-px sm:gap-[3px]">
            {days.map((d, i) => {
              // Keep the hover label inside the plot at both ends.
              const align =
                i < 3 ? "left-0" : i > days.length - 4 ? "right-0" : "left-1/2 -translate-x-1/2";
              return (
                <div key={d.day} className="group relative flex h-full min-w-0 flex-1 items-end">
                  <div
                    className="admin-column w-full"
                    style={{ height: d.count > 0 ? `max(3px, ${(d.count / top) * 100}%)` : 0 }}
                  />
                  <span
                    className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-[3px] border border-gold/40 bg-night-deep px-2 py-1 text-xs whitespace-nowrap text-sand tabular-nums group-hover:block ${align}`}
                  >
                    {formatDayKey(d.day)} · {d.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* x axis: first, middle and last day */}
        <div />
        <div className="mt-2 flex justify-between text-xs text-muted tabular-nums">
          <span>{formatDayKey(first.day)}</span>
          <span className="hidden sm:inline">{formatDayKey(middle.day)}</span>
          <span>{formatDayKey(last.day)}</span>
        </div>
      </div>

      <details className="admin-disclosure mt-5 border-t border-line pt-4">
        <summary className="admin-summary text-[0.875rem] font-medium text-gold-pale">
          <Chevron />
          Daily counts as a table
        </summary>
        <div className="mt-3 max-h-72 overflow-y-auto">
          <table className="w-full max-w-sm text-left text-[0.875rem] tabular-nums">
            <caption className="sr-only">Responses per day, {range}</caption>
            <thead>
              <tr className="text-muted">
                <th scope="col" className="border-b border-line py-2 pr-4 font-medium">
                  Date
                </th>
                <th scope="col" className="border-b border-line py-2 text-right font-medium">
                  Responses
                </th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d.day}>
                  <th scope="row" className="border-b border-line/60 py-1.5 pr-4 font-normal text-sand">
                    {formatDayKey(d.day, true)}
                  </th>
                  <td className={`border-b border-line/60 py-1.5 text-right ${d.count > 0 ? "text-sand" : "text-muted"}`}>
                    {d.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
