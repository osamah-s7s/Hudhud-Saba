"use client";

import Image from "next/image";
import type { Option, Question } from "@/data/survey";
import { toggleMulti, type AnswerValue } from "@/lib/answers";
import { CheckMarker, DiamondMarker } from "@/components/icons";

interface OptionsProps {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue | undefined) => void;
  labelledBy: string;
  describedBy: string;
  invalid: boolean;
}

/**
 * Native radios / checkboxes, visually hidden inside label rows or picture
 * cards, so arrow keys, Space and screen readers work as they always do.
 * Layout comes from the data: options with an image become cards (a `wide`
 * image spans the row), options without one become plain rows beneath.
 */
export function Options({ question, value, onChange, labelledBy, describedBy, invalid }: OptionsProps) {
  const single = question.kind === "single";
  const selectedIds = single ? (typeof value === "string" ? [value] : []) : Array.isArray(value) ? value : [];

  const pick = (optionId: string) => {
    if (single) onChange(optionId);
    else onChange(toggleMulti(question, selectedIds, optionId));
  };

  const pictureOptions = question.options.filter((o) => o.image);
  const rowOptions = question.options.filter((o) => !o.image);
  // Three across when the regular cards fill rows of three, otherwise two.
  const regularCards = pictureOptions.filter((o) => !o.image?.wide).length;
  const threeUp = regularCards > 0 && regularCards % 3 === 0;

  const input = (o: Option, labelId?: string) => (
    <input
      aria-labelledby={labelId}
      type={single ? "radio" : "checkbox"}
      name={question.id}
      value={o.id}
      checked={selectedIds.includes(o.id)}
      onChange={() => pick(o.id)}
      className="sr-only"
    />
  );
  const marker = (selected: boolean) =>
    single ? <DiamondMarker selected={selected} /> : <CheckMarker selected={selected} />;

  return (
    <fieldset
      role={single ? "radiogroup" : undefined}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-required={single && question.required ? true : undefined}
      aria-invalid={invalid || undefined}
      className="m-0 min-w-0 border-0 p-0"
    >
      {pictureOptions.length > 0 ? (
        <div
          className={`grid grid-cols-2 gap-3 sm:gap-4 ${threeUp ? "md:grid-cols-3" : ""}`}
        >
          {pictureOptions.map((o) => {
            const selected = selectedIds.includes(o.id);
            const img = o.image!;
            const sizes = img.wide
              ? "(min-width: 768px) 728px, 100vw"
              : threeUp
                ? "(min-width: 768px) 232px, 50vw"
                : "(min-width: 768px) 356px, 50vw";
            return (
              <label
                key={o.id}
                className={`opt-card ${img.wide ? "col-span-full" : ""}`}
                data-selected={selected}
                data-kind={question.kind}
              >
                {input(o, `${o.id}-label`)}
                <span className="relative block overflow-hidden" style={{ aspectRatio: `${img.width} / ${img.height}` }}>
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    sizes={sizes}
                    loading="lazy"
                    className="object-cover"
                  />
                </span>
                <span className="opt-card-label">
                  {marker(selected)}
                  <span id={`${o.id}-label`}>{o.label}</span>
                </span>
              </label>
            );
          })}
        </div>
      ) : null}

      {rowOptions.length > 0 ? (
        <div className={`flex flex-col gap-[0.8125rem] ${pictureOptions.length > 0 ? "mt-4" : ""}`}>
          {rowOptions.map((o) => {
            const selected = selectedIds.includes(o.id);
            return (
              <label key={o.id} className="opt-row" data-selected={selected}>
                {input(o)}
                {marker(selected)}
                <span>{o.label}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </fieldset>
  );
}
