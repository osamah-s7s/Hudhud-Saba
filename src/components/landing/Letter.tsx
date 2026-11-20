import { intro } from "@/data/survey";
import { Ornament } from "@/components/icons";

export function Letter() {
  return (
    <section aria-labelledby="letter-title" className="px-5 pt-[clamp(6rem,11vw,8rem)]">
      <Ornament />
      <div className="mx-auto max-w-[38rem] text-center">
        <h2
          id="letter-title"
          className="mt-10 font-serif text-[clamp(2.25rem,1.7rem+2vw,3rem)] leading-tight font-medium text-sand"
        >
          {intro.title}
        </h2>
        <p className="mt-8 font-serif text-[clamp(1.45rem,1.2rem+0.8vw,1.75rem)] leading-[1.45] text-sand/90 italic">
          {intro.lead}
        </p>
        <div className="mt-10 space-y-6 text-[1.0625rem] leading-[1.9] text-muted">
          {intro.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <div className="mt-14">
          <Ornament lines={false} size={22} />
        </div>
        <blockquote className="mx-auto mt-8 max-w-[22rem] font-serif text-[clamp(2rem,1.5rem+1.6vw,2.5rem)] leading-[1.2] text-gold-light italic sm:max-w-[27rem]">
          <p>{intro.quote}</p>
        </blockquote>
        <p className="mt-9 text-[1.0625rem] text-sand">{intro.thanks}</p>

        <aside
          aria-labelledby="how-to-answer"
          className="mx-auto mt-12 max-w-[30rem] rounded-[5px] border border-gold/40 px-6 py-6 sm:px-8"
        >
          <h3 id="how-to-answer" className="kicker text-[0.6875rem]">
            {intro.howToAnswerLabel}
          </h3>
          <p className="mt-3 text-[0.9375rem] leading-[1.75] text-muted">{intro.howToAnswer}</p>
        </aside>
      </div>
    </section>
  );
}
