/**
 * Single source of truth for every word of the survey.
 * Components and the /api/submit route read from here; never hard-code
 * question or option text anywhere else.
 */

export type SectionId = "A" | "B" | "C" | "D";
export type QuestionKind = "single" | "multi" | "text";

export interface OptionImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Card spans the full row (question 6, last option). */
  wide?: boolean;
}

export interface Option {
  id: string;
  label: string;
  image?: OptionImage;
  /** Selecting this clears every other option, and vice versa (question 14). */
  exclusive?: boolean;
}

export interface Question {
  id: string;
  number: number;
  section: SectionId;
  kind: QuestionKind;
  prompt: string;
  /** Answer-type label shown in the pill under the prompt. */
  hint: string;
  required: boolean;
  options: Option[];
  /** Free-text questions only. */
  maxLength?: number;
}

export interface Section {
  id: SectionId;
  title: string;
}

export const site = {
  arabicName: "هُدْهُد سَبَأ",
  name: "HUDHUD SABA",
  tagline: "Yemeni Heritage & Cultural Experience Center",
  kicker: "Thesis Research Questionnaire",
  journey: { fromLabel: "From", from: "Yemen", toLabel: "To", to: "Pakistan" },
} as const;

/** Numbered pins on the hero illustration. x / y are % of the image. */
export const heroPins = [
  { number: 1, label: "Sana'a", x: 90.4, y: 43.0, labelSide: "left" },
  { number: 2, label: "Shibam", x: 44.0, y: 58.4, labelSide: "right" },
  { number: 3, label: "Marib", x: 36.6, y: 38.9, labelSide: "left" },
  { number: 4, label: "Socotra", x: 14.0, y: 57.4, labelSide: "right" },
] as const;

export const qamariya = {
  arabic: "القمرية",
  kicker: "The Qamariya",
  title: "Where daylight becomes colour",
  body: "The half-moon window above the doors and windows of Yemeni homes, its coloured glass set in hand-carved gypsum.",
} as const;

export const intro = {
  title: "A Message from Yemen",
  lead: "I am a Yemeni interior design student, and through this project, I aim to carry a message from my homeland, Yemen, to the people of Pakistan.",
  paragraphs: [
    "Inspired by the Hoopoe (Hudhud), the messenger who carried the story of the Kingdom of Saba to distant lands, Hudhud Saba is my vision of sharing Yemen’s rich heritage, architecture, traditions, craftsmanship, and hospitality.",
    "Through this immersive cultural centre, I hope to build a meaningful cultural connection between Yemen and Pakistan.",
    "As part of my BS Interior Design thesis research, I would appreciate your opinions and preferences to help shape this experience.",
    "Your participation is voluntary, and your responses will remain confidential and be used for academic purposes only. No name is required.",
  ],
  quote: "“Every response helps carry this message further.”",
  thanks: "Thank you for being part of this journey.",
  howToAnswerLabel: "How to answer",
  howToAnswer:
    "Please select the answer(s) that best reflect your views. Questions marked “Select all that apply” allow more than one answer.",
} as const;

export const sections: Section[] = [
  { id: "A", title: "General Information" },
  { id: "B", title: "Cultural Interests & Visitor Experience" },
  { id: "C", title: "Interior & Spatial Preferences" },
  { id: "D", title: "Feedback & Suggestions" },
];

const SINGLE = "Single choice";
const MULTI = "Select all that apply";
const OPEN = "Open-ended response";

/** Builds options with stable ids ("q1-1", "q1-2", …) from labels. */
function opts(questionId: string, labels: string[]): Option[] {
  return labels.map((label, i) => ({ id: `${questionId}-${i + 1}`, label }));
}

const importance = [
  "Very important",
  "Important",
  "Neutral",
  "Not very important",
  "Not important",
];

const q6Image = (file: string, alt: string, wide = false): OptionImage => ({
  src: `/survey/${file}.jpg`,
  alt,
  width: wide ? 720 : 224,
  height: wide ? 146 : 139,
  ...(wide ? { wide: true } : {}),
});

const q13Image = (file: string, alt: string): OptionImage => ({
  src: `/survey/${file}.jpg`,
  alt,
  width: 346,
  height: 215,
});

export const questions: Question[] = [
  // Section A — General Information
  {
    id: "q1",
    number: 1,
    section: "A",
    kind: "single",
    prompt: "What is your age group?",
    hint: SINGLE,
    required: true,
    options: opts("q1", ["18–25", "26–35", "36–45", "46–55", "Above 55"]),
  },
  {
    id: "q2",
    number: 2,
    section: "A",
    kind: "single",
    prompt: "What is your occupation?",
    hint: SINGLE,
    required: true,
    options: opts("q2", [
      "Student",
      "Working professional",
      "Business owner",
      "Homemaker",
      "Other",
    ]),
  },
  {
    id: "q3",
    number: 3,
    section: "A",
    kind: "single",
    prompt:
      "How often do you visit museums, heritage sites, cultural centres, or exhibitions?",
    hint: SINGLE,
    required: true,
    options: opts("q3", [
      "Weekly",
      "Monthly",
      "A few times a year",
      "Rarely",
      "Never",
    ]),
  },
  {
    id: "q4",
    number: 4,
    section: "A",
    kind: "single",
    prompt: "How familiar are you with Yemeni culture and heritage?",
    hint: SINGLE,
    required: true,
    options: opts("q4", [
      "Very familiar",
      "Somewhat familiar",
      "Heard a little about it",
      "Not familiar",
    ]),
  },

  // Section B — Cultural Interests & Visitor Experience
  {
    id: "q5",
    number: 5,
    section: "B",
    kind: "single",
    prompt:
      "Would you be interested in visiting an interactive centre that introduces Yemeni heritage?",
    hint: SINGLE,
    required: true,
    options: opts("q5", ["Yes", "Maybe", "No"]),
  },
  {
    id: "q6",
    number: 6,
    section: "B",
    kind: "multi",
    prompt: "Which aspects of Yemeni heritage would you most like to explore?",
    hint: MULTI,
    required: true,
    options: [
      {
        id: "q6-1",
        label: "Traditional architecture and historic cities",
        image: q6Image(
          "q6-architecture",
          "Tall decorated tower houses of an old Yemeni city seen from a lane with bougainvillea",
        ),
      },
      {
        id: "q6-2",
        label: "Traditional clothing and jewellery",
        image: q6Image(
          "q6-clothing",
          "Embroidered red and black Yemeni dresses worn with layered silver jewellery",
        ),
      },
      {
        id: "q6-3",
        label: "Yemeni food and coffee culture",
        image: q6Image(
          "q6-food",
          "A spread of Yemeni dishes with a brass coffee pot and small cups",
        ),
      },
      {
        id: "q6-4",
        label: "Traditional crafts and handmade products",
        image: q6Image(
          "q6-crafts",
          "Woven baskets, a silver jambiya dagger, metalwork and a carved wooden box",
        ),
      },
      {
        id: "q6-5",
        label: "History and ancient Sabaean civilisation",
        image: q6Image(
          "q6-history",
          "Stone pillars of an ancient Sabaean temple beside a carved inscription",
        ),
      },
      {
        id: "q6-6",
        label: "Socotra’s natural heritage and landscapes",
        image: q6Image(
          "q6-socotra",
          "Dragon blood trees above a turquoise bay on Socotra",
        ),
      },
      {
        id: "q6-7",
        label: "Traditional arts, music, and stories",
        image: q6Image(
          "q6-arts",
          "Men performing a traditional Yemeni dance while musicians play oud and drum",
          true,
        ),
      },
    ],
  },
  {
    id: "q7",
    number: 7,
    section: "B",
    kind: "multi",
    prompt: "Which activities would make your visit more interesting?",
    hint: MULTI,
    required: true,
    options: opts("q7", [
      "Interactive digital displays",
      "Hands-on craft workshops",
      "Traditional objects and artefact displays",
      "Audio-visual storytelling",
      "Cultural demonstrations and live activities",
      "Educational activities for children and families",
    ]),
  },
  {
    id: "q8",
    number: 8,
    section: "B",
    kind: "single",
    prompt: "What type of visitor experience would you prefer?",
    hint: SINGLE,
    required: true,
    options: opts("q8", [
      "A guided cultural journey",
      "Self-guided exploration",
      "A combination of both",
      "Short visits to selected exhibits",
    ]),
  },
  {
    id: "q9",
    number: 9,
    section: "B",
    kind: "multi",
    prompt: "Which spaces would you like the centre to include?",
    hint: MULTI,
    required: true,
    options: opts("q9", [
      "Welcome and introduction area",
      "Yemeni heritage exhibition galleries",
      "Interactive learning area",
      "Traditional craft workshop",
      "Yemeni hospitality and coffee area",
      "Children and family activity area",
      "Resting and seating area",
    ]),
  },

  // Section C — Interior & Spatial Preferences
  {
    id: "q10",
    number: 10,
    section: "C",
    kind: "single",
    prompt:
      "Which type of spatial arrangement would you prefer in the exhibition areas?",
    hint: SINGLE,
    required: true,
    options: opts("q10", [
      "Open and spacious layout",
      "Separate themed rooms or zones",
      "A combination of both",
    ]),
  },
  {
    id: "q11",
    number: 11,
    section: "C",
    kind: "single",
    prompt:
      "How important is comfortable seating and resting space during your visit?",
    hint: SINGLE,
    required: true,
    options: opts("q11", importance),
  },
  {
    id: "q12",
    number: 12,
    section: "C",
    kind: "single",
    prompt:
      "How important is good lighting in exhibition and interactive areas?",
    hint: SINGLE,
    required: true,
    options: opts("q12", importance),
  },
  {
    id: "q13",
    number: 13,
    section: "C",
    kind: "single",
    prompt: "Which interior colour atmosphere would you prefer?",
    hint: SINGLE,
    required: true,
    options: [
      {
        id: "q13-1",
        label: "Warm and earthy — sand, terracotta, and brown",
        image: q13Image(
          "q13-warm",
          "A Yemeni majlis furnished in sand, terracotta and brown tones",
        ),
      },
      {
        id: "q13-2",
        label: "Natural and traditional — wood, beige, and olive",
        image: q13Image(
          "q13-natural",
          "A Yemeni majlis furnished in wood, beige and olive tones",
        ),
      },
      {
        id: "q13-3",
        label: "Neutral and minimal — white, grey, and soft beige",
        image: q13Image(
          "q13-neutral",
          "A Yemeni majlis furnished in white, grey and soft beige tones",
        ),
      },
      {
        id: "q13-4",
        label: "Rich and vibrant — deep red, blue, green, and gold",
        image: q13Image(
          "q13-rich",
          "A Yemeni majlis furnished in deep red, blue, green and gold tones",
        ),
      },
      { id: "q13-5", label: "No preference" },
    ],
  },

  // Section D — Feedback & Suggestions
  {
    id: "q14",
    number: 14,
    section: "D",
    kind: "multi",
    prompt: "What might prevent you from visiting a cultural centre?",
    hint: MULTI,
    required: true,
    options: [
      ...opts("q14", [
        "Lack of information or awareness",
        "Distance or transportation",
        "Entrance fee",
        "Lack of time",
        "Activities may not interest me",
        "Accessibility or mobility difficulties",
      ]),
      { id: "q14-7", label: "Nothing would prevent me", exclusive: true },
    ],
  },
  {
    id: "q15",
    number: 15,
    section: "D",
    kind: "text",
    prompt:
      "What would you suggest to make Hudhud Saba more interesting, welcoming, and comfortable for visitors?",
    hint: OPEN,
    required: false,
    options: [],
    maxLength: 2000,
  },
];

export const totalQuestions = questions.length;

export function questionsInSection(id: SectionId): Question[] {
  return questions.filter((q) => q.section === id);
}

/**
 * Interface microcopy (buttons, hints, errors, thank-you). Survey wording
 * lives above; these are the words around it.
 */
export const ui = {
  skipLink: "Skip to the questionnaire",
  heroAlt:
    "Illustration at sunset: a hoopoe perched before a carved Sana'a tower house, with the ruins of Marib, the mud-brick towers of Shibam and Socotra's dragon blood trees beyond",
  pinsLabel: "Places in the illustration",
  journeyLabel: "A journey",
  questionnaire: {
    kicker: "The Questionnaire",
    title: (count: number) => `${count} questions, one at a time`,
    sectionsLabel: "Sections",
    questionCount: (count: number) => `${count} ${count === 1 ? "question" : "questions"}`,
    begin: "Begin",
    resume: "Continue",
    note: "No name required · about five minutes",
    keyboard: {
      use: "Use",
      up: "Up arrow",
      down: "Down arrow",
      move: "to move between answers,",
      space: "Space",
      choose: "to choose and",
      enter: "Enter",
      advance: "to continue.",
    },
  },
  stepper: {
    progressLabel: "Questions answered",
    answered: "answered",
    question: "Question",
    of: "of",
    section: "Section",
    back: "Back",
    next: "Next",
    continue: "Continue",
    orPress: "or press",
    enter: "Enter",
    optional: "Optional",
    textPlaceholder: "Write your suggestions here…",
    characters: (count: number, max: number) => `${count} / ${max} characters`,
    required: {
      single: "Please choose an answer to continue.",
      multi: "Please choose at least one answer to continue.",
    },
    checkAnswer: "Please check this answer, then continue to send again.",
  },
  send: {
    crumb: "Review & send",
    kicker: "Almost there",
    title: "Ready to send your answers?",
    summary: (answered: number, total: number) => `${answered} of ${total} answered`,
    allRequired: "Every required question has an answer.",
    optionalSkipped: (number: number) =>
      `Question ${number} is optional — you can send without it, or go back to add it.`,
    missing: "These questions still need an answer before you can send:",
    goTo: (number: number) => `Go to question ${number}`,
    privacy: "No name is attached to your answers.",
    submit: "Send my answers",
    sending: "Sending…",
    tryAgain: "Try again",
    loading: "Opening the questionnaire…",
    loadFailed:
      "The questionnaire could not be opened. Please check your connection and try again — your answers are saved.",
    reload: "Try again",
    errors: {
      rate_limited:
        "Several responses have just been sent from this connection. Please wait a few minutes and try again — your answers are saved.",
      validation:
        "Some answers could not be accepted. Please check them and send again — nothing has been lost.",
      server:
        "The survey cannot accept responses at the moment. Please try again a little later — your answers are saved.",
      generic:
        "Your answers could not be sent just now. Please check your connection and try again — nothing has been lost.",
    },
  },
  thankYou: {
    kicker: "Received",
    title: "Shukran — thank you",
  },
} as const;
