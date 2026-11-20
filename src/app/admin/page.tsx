import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { questions } from "@/data/survey";
import { formatAnswer, isAnswered } from "@/lib/answers";
import { requireAdmin } from "@/lib/admin-auth";
import {
  ADMIN_TIME_ZONE_LABEL,
  computeSummary,
  dayKey,
  distributionsBySection,
  formatDateTime,
  formatDuration,
  responsesPerDay,
  textAnswers,
} from "@/lib/admin-stats";
import { isSupabaseConfigured, listResponses, type StoredResponse } from "@/lib/responses";
import { AdminHeader, AdminTitle } from "@/components/admin/AdminHeader";
import { KpiRow } from "@/components/admin/KpiRow";
import { Notice } from "@/components/admin/Notice";
import { ResponseList, type ResponseRow } from "@/components/admin/ResponseList";
import { ResultsBoard } from "@/components/admin/ResultsBoard";
import { Suggestions } from "@/components/admin/Suggestions";
import { TimelineChart } from "@/components/admin/TimelineChart";

/*
 * Cache Components: the session cookie and the database are request-time
 * data, so everything that depends on them lives in <Dashboard />, behind the
 * <Suspense> boundary below. The static shell is only the loading state — it
 * holds no data and no admin controls.
 */
export default function AdminPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <Dashboard />
    </Suspense>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[88rem] px-4 pt-10 pb-24 sm:px-8 sm:pt-14">{children}</main>
  );
}

function DashboardLoading() {
  return (
    <Shell>
      <header className="border-b border-gold/30 pb-7">
        <AdminTitle />
      </header>
      <p role="status" className="mt-10 text-base text-muted">
        Loading responses…
      </p>
    </Shell>
  );
}

function SectionHeading({ id, kicker, title, note }: { id: string; kicker: string; title: string; note?: string }) {
  return (
    <div className="mb-6 border-t border-gold/30 pt-9">
      <p className="kicker">{kicker}</p>
      <h2 id={id} className="mt-3 font-serif text-[clamp(1.75rem,1.5rem+1vw,2.25rem)] leading-tight font-medium text-sand">
        {title}
      </h2>
      {note ? <p className="mt-2 max-w-[70ch] text-[0.9375rem] leading-relaxed text-muted">{note}</p> : null}
    </div>
  );
}

async function Dashboard() {
  // Nothing below runs for a visitor who is not signed in: this redirects to the login page.
  await requireAdmin();
  // "Today" depends on the moment of the request, never on build time.
  await connection();

  if (!isSupabaseConfigured()) {
    return (
      <Shell>
        <AdminHeader canExport={false} />
        <Notice title="The response database is not connected" tone="problem">
          <p>
            Responses cannot be shown because the Supabase connection settings are missing on the server. Add them to
            the site’s environment variables, redeploy, and reload this page.
          </p>
        </Notice>
      </Shell>
    );
  }

  let responses: StoredResponse[] | null = null;
  try {
    responses = await listResponses();
  } catch (error) {
    // Message only, for the server log; nothing about the failure is sent to the browser.
    console.error("[admin] could not load responses:", error instanceof Error ? error.message : "unknown error");
  }

  if (responses === null) {
    return (
      <Shell>
        <AdminHeader canExport={false} />
        <Notice title="The responses could not be loaded" tone="problem">
          <p>
            The database did not answer as expected. Nothing has been lost. Reload the page in a moment; if this keeps
            happening, check the Supabase project’s status and the server log.
          </p>
        </Notice>
      </Shell>
    );
  }

  if (responses.length === 0) {
    return (
      <Shell>
        <AdminHeader canExport={false} />
        <Notice title="No responses yet">
          <p>
            When someone completes the questionnaire, their answers will appear here with charts for every question.
          </p>
        </Notice>
      </Shell>
    );
  }

  const now = new Date();
  const today = dayKey(now) ?? "";
  const summary = computeSummary(responses, now);
  const timeline = responsesPerDay(responses, now, 30);
  const sectionStats = distributionsBySection(responses);
  const textQuestions = questions.filter((q) => q.kind === "text");
  const suggestions = textQuestions.flatMap((q) => textAnswers(responses, q.id));

  const total = responses.length;
  const rows: ResponseRow[] = responses.map((r, index) => ({
    id: r.id,
    number: total - index,
    createdAt: r.createdAt,
    submitted: formatDateTime(r.createdAt),
    duration: formatDuration(r.durationSeconds),
    answers: questions.map((q) => {
      const value = r.answers?.[q.id];
      return isAnswered(q, value) ? formatAnswer(q, value) : null;
    }),
  }));

  return (
    <Shell>
      <AdminHeader canExport />
      <p className="mt-4 text-[0.8125rem] text-muted">All dates and times are in {ADMIN_TIME_ZONE_LABEL}.</p>

      <section aria-label="Key figures" className="mt-8">
        <KpiRow summary={summary} />
      </section>

      <div className="mt-12">
        <ResultsBoard sections={sectionStats} total={total} today={today} />
      </div>

      <section aria-labelledby="over-time-title" className="mt-16">
        <SectionHeading id="over-time-title" kicker="Activity" title="Responses over time" />
        <TimelineChart timeline={timeline} />
      </section>

      <section aria-labelledby="suggestions-title" className="mt-16">
        <SectionHeading
          id="suggestions-title"
          kicker={`Question ${textQuestions[0]?.number ?? ""}`.trim()}
          title="Suggestions"
          note={textQuestions[0]?.prompt}
        />
        <Suggestions answers={suggestions} />
      </section>

      <section aria-labelledby="all-responses-title" className="mt-16">
        <SectionHeading
          id="all-responses-title"
          kicker="Records"
          title="All responses"
          note="Open a row to read the full set of answers. Deleting a response removes it from every figure on this page."
        />
        <ResponseList
          questions={questions.map((q) => ({ number: q.number, prompt: q.prompt }))}
          rows={rows}
        />
      </section>
    </Shell>
  );
}
