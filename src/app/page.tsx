import { ui } from "@/data/survey";
import { Hero } from "@/components/landing/Hero";
import { Letter } from "@/components/landing/Letter";
import { Qamariya } from "@/components/landing/Qamariya";
import { Questionnaire } from "@/components/landing/Questionnaire";
import { SurveyRoot } from "@/components/survey/SurveyRoot";

export default function Home() {
  return (
    <SurveyRoot
      landing={
        <>
          <a
            href="#questionnaire"
            className="sr-only z-50 rounded-full bg-sand px-5 py-3 font-semibold text-night focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          >
            {ui.skipLink}
          </a>
          <Hero />
          <main id="main">
            <Qamariya />
            <Letter />
            <Questionnaire />
          </main>
        </>
      }
    />
  );
}
