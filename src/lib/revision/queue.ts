import type { Question } from "@/types/question";
import type { Reminder } from "@/lib/reminders";

export interface RevisionProgress {
  completed: Set<number>;
  reminders: Record<number, Reminder>;
  solvedDates: Record<number, string>;
}

export interface RevisionCard {
  question: Question;
  /** Date-only (YYYY-MM-DD) the question became due. */
  dueDate: string;
  reminder?: Reminder;
  solvedDate?: string;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Every solved question that is due on or before `today`: those whose review
 * date has arrived, plus solved questions that never got a review date (due a
 * day after they were solved, like a first reminder).
 */
export function buildRevisionCards(
  questions: Question[],
  { completed, reminders, solvedDates }: RevisionProgress,
  today: string
): RevisionCard[] {
  const cards: RevisionCard[] = [];
  for (const question of questions) {
    if (!completed.has(question.id)) continue;
    const reminder = reminders[question.id];
    const solvedDate = solvedDates[question.id];
    const dueDate = reminder
      ? reminder.nextReview
      : solvedDate
        ? addDays(solvedDate.slice(0, 10), 1)
        : today;
    if (dueDate <= today) cards.push({ question, dueDate, reminder, solvedDate });
  }
  return cards;
}

/** The earliest review date after today, or null if nothing is scheduled. */
export function nextReviewAfter(reminders: Record<number, Reminder>, today: string): string | null {
  let next: string | null = null;
  for (const reminder of Object.values(reminders)) {
    if (reminder.nextReview > today && (next === null || reminder.nextReview < next)) {
      next = reminder.nextReview;
    }
  }
  return next;
}
