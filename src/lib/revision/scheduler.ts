// FSRS scheduling for the Revision tab. This is the only module that imports
// ts-fsrs; everything else works with Reminder (src/lib/reminders.ts).
import { fsrs, createEmptyCard, Rating, type Card, type Grade } from "ts-fsrs";
import type { FsrsCardData, Reminder } from "@/lib/reminders";

export type RevisionRating = "hard" | "good" | "easy";

export const RATINGS: { id: RevisionRating; label: string; key: string }[] = [
  { id: "hard", label: "Hard", key: "1" },
  { id: "good", label: "Good", key: "2" },
  { id: "easy", label: "Easy", key: "3" },
];

// Every rating counts as recalled: a LeetCode attempt is too long to repeat in
// one sitting, so FSRS's "Again" is never sent.
const GRADES: Record<RevisionRating, Grade> = {
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const scheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 365,
  enable_fuzz: false, // predictable dates
  enable_short_term: false, // whole days, no minute-long learning steps
});

function toCard(reminder: Reminder | undefined, now: Date): Card {
  const data = reminder?.fsrs;
  // Reminders made before FSRS (roadmap or manual dates) start as new cards.
  if (!data) return createEmptyCard(now);
  return {
    ...data,
    due: new Date(data.due),
    last_review: data.last_review ? new Date(data.last_review) : undefined,
  };
}

function toData(card: Card): FsrsCardData {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.toISOString() : undefined,
  };
}

/** The reminder that results from rating a question now. */
export function rate(reminder: Reminder | undefined, rating: RevisionRating, now: Date = new Date()): Reminder {
  const { card } = scheduler.next(toCard(reminder, now), now, GRADES[rating]);
  return {
    nextReview: card.due.toISOString().slice(0, 10),
    interval: card.scheduled_days,
    fsrs: toData(card),
  };
}

/** Days until the next review for each rating, for the buttons' labels. */
export function previewIntervals(reminder: Reminder | undefined, now: Date = new Date()): Record<RevisionRating, number> {
  const outcomes = scheduler.repeat(toCard(reminder, now), now);
  return {
    hard: outcomes[Rating.Hard].card.scheduled_days,
    good: outcomes[Rating.Good].card.scheduled_days,
    easy: outcomes[Rating.Easy].card.scheduled_days,
  };
}

/** FSRS stability in days, or 0 for a question never rated in Revision. */
export function stabilityOf(reminder: Reminder | undefined): number {
  return reminder?.fsrs?.stability ?? 0;
}
