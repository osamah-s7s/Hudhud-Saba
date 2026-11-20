import { questions, sections, type Question, type Section } from "@/data/survey";

export type Step =
  | { kind: "section"; id: string; section: Section; count: number }
  | { kind: "question"; id: string; question: Question; section: Section }
  | { kind: "send"; id: "send" };

/** Section A card, Q1–4, Section B card, Q5–9, …, then the Send step. Derived from data. */
export const steps: Step[] = [
  ...sections.flatMap((section): Step[] => {
    const qs = questions.filter((q) => q.section === section.id);
    if (qs.length === 0) return [];
    return [
      { kind: "section", id: `section-${section.id}`, section, count: qs.length },
      ...qs.map((question): Step => ({ kind: "question", id: question.id, question, section })),
    ];
  }),
  { kind: "send", id: "send" },
];

export const firstStepId = steps[0].id;

export function stepIndex(id: string): number {
  const i = steps.findIndex((s) => s.id === id);
  return i < 0 ? 0 : i;
}

export function isStepId(id: unknown): id is string {
  return typeof id === "string" && steps.some((s) => s.id === id);
}
