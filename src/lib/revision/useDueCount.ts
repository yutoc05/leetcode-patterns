"use client";

import { useEffect, useState } from "react";
import type { Question } from "@/types/question";
import { loadCompleted, loadReminders, loadSolvedDates, PROGRESS_CHANGE_EVENT } from "@/lib/storage";
import { today } from "@/lib/reminders";
import { buildRevisionCards } from "./queue";

/** How many solved questions are due for revision, kept current as progress changes. */
export function useDueCount(questions: Question[]): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const recount = () => {
      const progress = { completed: loadCompleted(), reminders: loadReminders(), solvedDates: loadSolvedDates() };
      setCount(buildRevisionCards(questions, progress, today()).length);
    };
    recount();
    window.addEventListener(PROGRESS_CHANGE_EVENT, recount);
    return () => window.removeEventListener(PROGRESS_CHANGE_EVENT, recount);
  }, [questions]);

  return count;
}
