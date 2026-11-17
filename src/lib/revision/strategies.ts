// Queue strategies decide the order cards are shown in. Adding one (say, warm
// up with easies before harder questions) means adding an entry here; a
// settings control only has to pass a different id to getStrategy.
import { stabilityOf } from "./scheduler";
import type { RevisionCard } from "./queue";

export interface QueueStrategy {
  id: string;
  label: string;
  description: string;
  order: (cards: RevisionCard[]) => RevisionCard[];
}

const mostOverdueFirst: QueueStrategy = {
  id: "most-overdue",
  label: "Most overdue first",
  description: "The longest-waiting reviews first; among equals, the ones you know least well.",
  order: (cards) =>
    [...cards].sort(
      (a, b) =>
        a.dueDate.localeCompare(b.dueDate) ||
        stabilityOf(a.reminder) - stabilityOf(b.reminder) ||
        a.question.id - b.question.id
    ),
};

export const STRATEGIES: QueueStrategy[] = [mostOverdueFirst];

export const DEFAULT_STRATEGY_ID = mostOverdueFirst.id;

export function getStrategy(id: string = DEFAULT_STRATEGY_ID): QueueStrategy {
  return STRATEGIES.find((s) => s.id === id) ?? mostOverdueFirst;
}
