import { useSyncExternalStore } from "react";
import { sanitizeAnswers, type Answers, type AnswerValue } from "@/lib/answers";
import { firstStepId, isStepId } from "./steps";

/**
 * Tiny external store for the survey. It lives outside React so the
 * server-rendered Begin button and the lazily loaded stepper share it,
 * and so state can be restored from localStorage after mount without
 * hydration mismatches (useSyncExternalStore uses the server snapshot
 * while hydrating, then switches to the restored one).
 */

export const STORAGE_KEY = "hudhud-saba:survey:v1";

export type Phase = "landing" | "survey" | "done";

export interface SurveyState {
  phase: Phase;
  stepId: string;
  answers: Answers;
  startedAt: number | null;
}

interface Persisted {
  v: 1;
  /** Was the stepper open (true) or had the visitor gone back to the intro? */
  active: boolean;
  stepId: string;
  answers: Answers;
  startedAt: number | null;
}

const initialState: SurveyState = {
  phase: "landing",
  stepId: firstStepId,
  answers: {},
  startedAt: null,
};

let state: SurveyState = initialState;
let restored = false;
const listeners = new Set<() => void>();

function readStorage(): SurveyState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Persisted> | null;
    if (!data || data.v !== 1) return null;
    return {
      phase: data.active === false ? "landing" : "survey",
      stepId: isStepId(data.stepId) ? data.stepId : firstStepId,
      answers: sanitizeAnswers(data.answers),
      startedAt:
        typeof data.startedAt === "number" && Number.isFinite(data.startedAt)
          ? data.startedAt
          : Date.now(),
    };
  } catch {
    return null;
  }
}

function writeStorage(s: SurveyState) {
  try {
    // Keep progress while the survey is open, or after stepping back to the intro.
    if (s.phase !== "done" && s.startedAt !== null) {
      const data: Persisted = {
        v: 1,
        active: s.phase === "survey",
        stepId: s.stepId,
        answers: s.answers,
        startedAt: s.startedAt,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage full, blocked or unavailable: the survey still works in memory.
  }
}

function ensureRestored() {
  if (restored || typeof window === "undefined") return;
  restored = true;
  state = readStorage() ?? initialState;
}

function setState(next: SurveyState) {
  state = next;
  writeStorage(state);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SurveyState {
  ensureRestored();
  return state;
}

function getServerSnapshot(): SurveyState {
  return initialState;
}

export function useSurvey(): SurveyState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const survey = {
  get: getSnapshot,
  /** Begin (or resume, if answers are still saved). */
  start() {
    ensureRestored();
    setState({
      ...state,
      phase: "survey",
      startedAt: state.startedAt ?? Date.now(),
    });
  },
  /** Leave the stepper for the intro; answers stay saved. */
  exit() {
    ensureRestored();
    setState({ ...state, phase: "landing" });
  },
  goTo(stepId: string) {
    setState({ ...state, stepId: isStepId(stepId) ? stepId : firstStepId });
  },
  answer(questionId: string, value: AnswerValue | undefined) {
    const answers = { ...state.answers };
    if (value === undefined || (Array.isArray(value) && value.length === 0)) {
      delete answers[questionId];
    } else {
      answers[questionId] = value;
    }
    setState({ ...state, answers });
  },
  /** After a successful send: show thanks and forget everything saved. */
  finish() {
    setState({ phase: "done", stepId: firstStepId, answers: {}, startedAt: null });
  },
};
