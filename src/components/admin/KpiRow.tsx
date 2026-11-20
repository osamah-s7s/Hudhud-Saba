import { formatDayKey, formatDuration, type Summary } from "@/lib/admin-stats";

interface Kpi {
  label: string;
  value: string;
  note: string;
}

export function KpiRow({ summary }: { summary: Summary }) {
  const kpis: Kpi[] = [
    {
      label: "Total responses",
      value: summary.total.toLocaleString("en-GB"),
      note: summary.firstDay ? `Since ${formatDayKey(summary.firstDay, true)}` : "None yet",
    },
    {
      label: "Last 7 days",
      value: summary.last7Days.toLocaleString("en-GB"),
      note: "Today included",
    },
    {
      label: "Today",
      value: summary.today.toLocaleString("en-GB"),
      note: "Since midnight",
    },
    {
      label: "Median completion time",
      value: formatDuration(summary.medianDurationSeconds),
      note:
        summary.timedCount > 0
          ? `From ${summary.timedCount.toLocaleString("en-GB")} timed ${summary.timedCount === 1 ? "response" : "responses"}`
          : "No timings recorded",
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="admin-card flex min-w-0 flex-col px-4 py-5 sm:px-6 sm:py-6">
          <dt className="text-[0.8125rem] leading-snug font-medium text-muted">{kpi.label}</dt>
          <dd className="mt-3 font-serif text-[clamp(2rem,1.6rem+1.4vw,2.75rem)] leading-none font-medium text-sand lining-nums tabular-nums">
            {kpi.value}
          </dd>
          <dd className="mt-3 text-[0.8125rem] leading-snug text-muted">{kpi.note}</dd>
        </div>
      ))}
    </dl>
  );
}
