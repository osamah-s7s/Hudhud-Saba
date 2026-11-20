import { formatDateTime, type TextAnswer } from "@/lib/admin-stats";
import { Chevron } from "./Chevron";

const FIRST = 10;

function Item({ answer }: { answer: TextAnswer }) {
  return (
    <li className="border-l-2 border-gold/50 py-1 pl-4 sm:pl-5">
      {/* Plain text: React escapes it. Line breaks the visitor typed are kept. */}
      <p className="max-w-[70ch] text-base leading-relaxed wrap-break-word whitespace-pre-wrap text-sand">
        {answer.text}
      </p>
      <p className="mt-2 text-[0.8125rem] text-muted tabular-nums">
        <time dateTime={answer.createdAt}>{formatDateTime(answer.createdAt)}</time>
      </p>
    </li>
  );
}

/** Free-text answers, newest first; anything past the first ten sits behind a disclosure. */
export function Suggestions({ answers }: { answers: TextAnswer[] }) {
  if (answers.length === 0) {
    return <p className="text-[0.9375rem] text-muted">No one has left a suggestion yet. This question is optional.</p>;
  }
  const head = answers.slice(0, FIRST);
  const rest = answers.slice(FIRST);
  return (
    <>
      <ul className="flex flex-col gap-7">
        {head.map((a) => (
          <Item key={a.responseId} answer={a} />
        ))}
      </ul>
      {rest.length > 0 ? (
        <details className="admin-disclosure mt-8">
          <summary className="admin-summary admin-btn w-fit">
            <Chevron />
            Show {rest.length.toLocaleString("en-GB")} earlier {rest.length === 1 ? "suggestion" : "suggestions"}
          </summary>
          <ul className="mt-8 flex flex-col gap-7">
            {rest.map((a) => (
              <Item key={a.responseId} answer={a} />
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}
