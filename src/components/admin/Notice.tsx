import type { ReactNode } from "react";

/** A calm full-width message: empty state, configuration problem, or load failure. */
export function Notice({
  title,
  tone = "neutral",
  children,
}: {
  title: string;
  tone?: "neutral" | "problem";
  children: ReactNode;
}) {
  return (
    <section
      role={tone === "problem" ? "alert" : undefined}
      className={`admin-card mt-10 px-5 py-10 sm:px-10 sm:py-12 ${tone === "problem" ? "border-terracotta/70" : ""}`}
    >
      <h2 className="font-serif text-[1.75rem] leading-tight font-medium text-sand">{title}</h2>
      <div className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted">{children}</div>
    </section>
  );
}
