import { describe, it, expect } from "vitest";
import { buildRevisionCards, nextReviewAfter, type RevisionProgress } from "./queue";
import { getStrategy, DEFAULT_STRATEGY_ID } from "./strategies";
import { rate } from "./scheduler";
import type { Question } from "@/types/question";

const q = (id: number): Question => ({
  id,
  title: `Question ${id}`,
  slug: `question-${id}`,
  pattern: ["Array"],
  difficulty: "Easy",
  premium: false,
  companies: [],
});

const QUESTIONS = [q(0), q(1), q(2), q(3), q(4), q(5)];
const TODAY = "2026-03-10";

function progress(overrides: Partial<RevisionProgress>): RevisionProgress {
  return { completed: new Set(), reminders: {}, solvedDates: {}, ...overrides };
}

describe("buildRevisionCards", () => {
  it("includes solved questions whose review date has arrived, and nothing else", () => {
    const cards = buildRevisionCards(QUESTIONS, progress({
      completed: new Set([0, 1]),
      reminders: {
        0: { nextReview: "2026-03-10", interval: 3 }, // due today
        1: { nextReview: "2026-03-11", interval: 3 }, // tomorrow
        2: { nextReview: "2026-03-01", interval: 3 }, // due, but not solved
      },
    }), TODAY);
    expect(cards.map((c) => c.question.id)).toEqual([0]);
  });

  it("includes solved questions without a review date, a day after solving", () => {
    const cards = buildRevisionCards(QUESTIONS, progress({
      completed: new Set([3, 4, 5]),
      solvedDates: {
        3: "2026-03-05T09:00:00Z", // due Mar 6
        4: "2026-03-10T09:00:00Z", // solved today: due tomorrow
      },
      // 5: solved, but no date at all (e.g. imported): due today
    }), TODAY);
    expect(cards.map((c) => [c.question.id, c.dueDate])).toEqual([[3, "2026-03-06"], [5, TODAY]]);
  });
});

describe("most overdue first strategy", () => {
  it("orders by due date, then by how well the question is known, then by id", () => {
    const shaky = rate(undefined, "hard", new Date("2026-03-01T12:00:00Z"));
    const solid = rate(undefined, "easy", new Date("2026-03-01T12:00:00Z"));
    const cards = buildRevisionCards(QUESTIONS, progress({
      completed: new Set([0, 1, 2, 3]),
      reminders: {
        0: { ...solid, nextReview: "2026-03-08" },
        1: { ...shaky, nextReview: "2026-03-08" },
        2: { nextReview: "2026-03-02", interval: 1 },
        3: { nextReview: "2026-03-08", interval: 1 }, // never rated: stability 0
      },
    }), TODAY);
    const order = getStrategy().order(cards).map((c) => c.question.id);
    expect(order).toEqual([2, 3, 1, 0]);
  });

  it("is the default and the fallback for an unknown id", () => {
    expect(getStrategy().id).toBe(DEFAULT_STRATEGY_ID);
    expect(getStrategy("no-such-strategy").id).toBe(DEFAULT_STRATEGY_ID);
  });
});

describe("nextReviewAfter", () => {
  it("finds the earliest review after today", () => {
    expect(nextReviewAfter({
      0: { nextReview: "2026-03-09", interval: 1 },
      1: { nextReview: "2026-03-14", interval: 4 },
      2: { nextReview: "2026-03-12", interval: 2 },
    }, TODAY)).toBe("2026-03-12");
    expect(nextReviewAfter({}, TODAY)).toBeNull();
  });
});
