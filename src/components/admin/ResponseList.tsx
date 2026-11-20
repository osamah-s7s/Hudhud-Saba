"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { deleteResponseAction } from "@/app/admin/dashboard-actions";
import { Chevron } from "./Chevron";

export interface ResponseQuestion {
  number: number;
  prompt: string;
}

export interface ResponseRow {
  id: string;
  /** 1 = the first response ever received. */
  number: number;
  createdAt: string;
  submitted: string;
  duration: string;
  /** Readable answers in question order; null where the question was left blank. */
  answers: (string | null)[];
}

const PAGE_SIZE = 25;

function DeleteControl({ row, onDeleted }: { row: ResponseRow; onDeleted: (n: number) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  // Focus follows the swap between the "Delete" button and the confirmation.
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (restoreFocus.current) {
      restoreFocus.current = false;
      openRef.current?.focus();
    }
  }, [confirming]);

  function cancel() {
    restoreFocus.current = true;
    setConfirming(false);
  }

  function confirm() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteResponseAction(row.id);
        if (result.ok) onDeleted(row.number);
        else setError(result.error);
      } catch {
        setError("The response could not be deleted. Please check your connection and try again.");
      }
    });
  }

  if (!confirming) {
    return (
      <button
        ref={openRef}
        type="button"
        className="admin-btn admin-btn-danger"
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
      >
        Delete response
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label={`Confirm deleting response ${row.number}`}
      className="rounded-[4px] border border-terracotta/70 bg-burgundy/20 px-4 py-4"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !pending) {
          event.stopPropagation();
          cancel();
        }
      }}
    >
      <p className="text-[0.9375rem] leading-relaxed text-sand">
        Delete response #{row.number} permanently? This cannot be undone.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button ref={cancelRef} type="button" className="admin-btn" onClick={cancel} disabled={pending}>
          Cancel
        </button>
        <button type="button" className="admin-btn admin-btn-danger" onClick={confirm} aria-disabled={pending}>
          {pending ? "Deleting…" : "Yes, delete it"}
        </button>
      </div>
      <p role="alert" className="mt-3 text-[0.875rem] leading-relaxed text-sand empty:hidden">
        {error}
      </p>
    </div>
  );
}

/** Every response, newest first, 25 to a page; each row opens to its full answers. */
export function ResponseList({ questions, rows }: { questions: ResponseQuestion[]; rows: ResponseRow[] }) {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const topRef = useRef<HTMLDivElement>(null);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  // Deleting the last row of the last page must not leave an empty page behind.
  const current = Math.min(page, pageCount - 1);
  const start = current * PAGE_SIZE;
  const visible = rows.slice(start, start + PAGE_SIZE);

  function goTo(next: number) {
    setPage(next);
    setStatus("");
    topRef.current?.focus();
    topRef.current?.scrollIntoView({ block: "start" });
  }

  function handleDeleted(number: number) {
    setStatus(`Response #${number} was deleted.`);
    topRef.current?.focus();
  }

  return (
    <div>
      <div
        ref={topRef}
        tabIndex={-1}
        className="flex scroll-mt-6 flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-[0.875rem] text-muted tabular-nums"
      >
        <p>
          Showing {(start + 1).toLocaleString("en-GB")}–{(start + visible.length).toLocaleString("en-GB")} of{" "}
          {rows.length.toLocaleString("en-GB")}, newest first
        </p>
        <p role="status" className="text-sand">
          {status}
        </p>
      </div>

      <ul className="mt-4 border-t border-line">
        {visible.map((row) => (
          <li key={row.id} className="border-b border-line">
            <details className="admin-disclosure">
              <summary className="admin-summary admin-row-summary">
                <Chevron />
                <span className="w-[3.25rem] flex-none font-semibold text-gold-light tabular-nums">
                  <span className="sr-only">Response </span>#{row.number}
                </span>
                <time dateTime={row.createdAt} className="min-w-0 flex-1 text-sand tabular-nums">
                  {row.submitted}
                </time>
                <span className="flex-none text-muted tabular-nums">
                  <span className="sr-only">Completed in </span>
                  {row.duration}
                </span>
              </summary>

              <div className="pt-1 pb-7 sm:pl-[1.875rem]">
                <dl className="grid gap-x-8 gap-y-5 md:grid-cols-2">
                  {questions.map((q, i) => {
                    const answer = row.answers[i] ?? null;
                    return (
                      <div key={q.number} className="min-w-0">
                        <dt className="text-[0.8125rem] leading-snug text-muted">
                          <span className="font-semibold text-gold-light">Q{q.number}</span> {q.prompt}
                        </dt>
                        <dd
                          className={`mt-1 text-[0.9375rem] leading-relaxed wrap-break-word whitespace-pre-wrap ${
                            answer === null ? "text-muted italic" : "text-sand"
                          }`}
                        >
                          {answer ?? "No answer"}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
                <div className="mt-7">
                  <DeleteControl row={row} onDeleted={handleDeleted} />
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>

      {pageCount > 1 ? (
        <nav aria-label="Pages of responses" className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <button type="button" className="admin-btn" onClick={() => goTo(current - 1)} disabled={current === 0}>
            Newer
          </button>
          <p className="text-[0.875rem] text-muted tabular-nums">
            Page {current + 1} of {pageCount}
          </p>
          <button
            type="button"
            className="admin-btn"
            onClick={() => goTo(current + 1)}
            disabled={current >= pageCount - 1}
          >
            Older
          </button>
        </nav>
      ) : null}
    </div>
  );
}
