"use client";

import { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from "react";
import { ExternalLink, Eye, Lightbulb, Lock, NotebookPen } from "lucide-react";
import type { Question } from "@/types/question";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/components/layout/AuthContext";
import {
  loadCompleted, saveCompleted,
  loadNotes, saveNotes,
  loadSolvedDates, saveSolvedDates,
  loadReminders, saveReminders,
} from "@/lib/storage";
import { today } from "@/lib/reminders";
import { buildRevisionCards, nextReviewAfter, type RevisionCard } from "@/lib/revision/queue";
import { getStrategy, type QueueStrategy } from "@/lib/revision/strategies";
import { RATINGS, rate, previewIntervals, type RevisionRating } from "@/lib/revision/scheduler";
import NoteEditor, { type EditingNote } from "@/components/questions/NoteEditor";
import FormattedNote from "@/components/questions/FormattedNote";
import { difficultyText } from "@/components/questions/difficultyStyles";
import { beginnerRoadmap, experiencedRoadmap } from "@/data/roadmaps";
import neetcode from "@/data/neetcode.json";
import AsciiDog from "./AsciiDog";

const NEETCODE_SLUGS = new Set<string>(neetcode.slugs);

// Roadmap hints by slug, revealed together with the pattern.
const HINTS = new Map<string, string>();
for (const roadmap of [beginnerRoadmap, experiencedRoadmap]) {
  for (const phase of roadmap.phases) {
    for (const q of phase.questions) if (!HINTS.has(q.slug)) HINTS.set(q.slug, q.note);
  }
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86_400_000);
}

function daysAgo(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// The session's queue: what is due right now, in the strategy's order.
function loadQueue(questions: Question[], strategy: QueueStrategy): RevisionCard[] {
  const progress = { completed: loadCompleted(), reminders: loadReminders(), solvedDates: loadSolvedDates() };
  return strategy.order(buildRevisionCards(questions, progress, today()));
}

function shortDate(isoDate: string): string {
  return new Date(isoDate + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// Progress lives in localStorage, so the session renders on the client only.
const noopSubscribe = () => () => {};

export default function RevisionView(props: { questions: Question[]; strategyId?: string }) {
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return isClient ? <RevisionSession {...props} /> : null;
}

function RevisionSession({ questions, strategyId }: { questions: Question[]; strategyId?: string }) {
  const { syncNow, syncVersion } = useAuth();
  const strategy = getStrategy(strategyId);

  const [completed, setCompleted] = useState(loadCompleted);
  const [notes, setNotes] = useState(loadNotes);
  const [solvedDates, setSolvedDates] = useState(loadSolvedDates);
  const [reminders, setReminders] = useState(loadReminders);

  // The session: a snapshot of what was due when the tab opened.
  const [queue, setQueue] = useState(() => loadQueue(questions, strategy));
  const [reviewed, setReviewed] = useState(0);
  const [touched, setTouched] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [editingNotes, setEditingNotes] = useState<Record<number, EditingNote>>({});

  // Remote progress arrived (e.g. just after sign-in): refresh, and rebuild the
  // queue unless the user has already started working through it.
  const [seenSyncVersion, setSeenSyncVersion] = useState(syncVersion);
  if (syncVersion !== seenSyncVersion) {
    setSeenSyncVersion(syncVersion);
    setCompleted(loadCompleted());
    setNotes(loadNotes());
    setSolvedDates(loadSolvedDates());
    setReminders(loadReminders());
    if (!touched) setQueue(loadQueue(questions, strategy));
  }

  const card = queue[0];
  const currentId = card?.question.id;

  const intervals = useMemo(
    () => (currentId === undefined ? null : previewIntervals(reminders[currentId])),
    [currentId, reminders]
  );

  const updateNote = useCallback((id: number, value: string) => {
    setNotes((prev) => {
      const next = { ...prev };
      if (value) next[id] = value;
      else delete next[id];
      saveNotes(next);
      trackEvent("note_save", { question_id: id, has_content: !!value });
      return next;
    });
    syncNow();
  }, [syncNow]);

  const setEditingNoteFor = useCallback((id: number, note: EditingNote | null) => {
    setEditingNotes((prev) => {
      if (note) return { ...prev, [id]: note };
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const toggleNotes = useCallback(() => {
    if (!card) return;
    const { id, title } = card.question;
    setEditingNotes((prev) => {
      const current = prev[id];
      if (!current) return { ...prev, [id]: { id, title, draft: notes[id] ?? "", confirmDiscard: false } };
      if (current.draft !== (notes[id] ?? "")) return { ...prev, [id]: { ...current, confirmDiscard: true } };
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [card, notes]);

  const rateCurrent = useCallback((rating: RevisionRating) => {
    if (!card) return;
    const id = card.question.id;
    const now = new Date();

    // Moving on keeps an unsaved note rather than dropping it with the card.
    const draft = editingNotes[id];
    if (draft && draft.draft !== (notes[id] ?? "")) updateNote(id, draft.draft);
    setEditingNoteFor(id, null);

    setReminders((prev) => {
      const next = { ...prev, [id]: rate(prev[id], rating, now) };
      saveReminders(next);
      return next;
    });
    setSolvedDates((prev) => {
      const next = { ...prev, [id]: now.toISOString() };
      saveSolvedDates(next);
      return next;
    });
    setCompleted((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveCompleted(next);
      return next;
    });
    trackEvent("revision_rate", { question_id: id, rating });
    syncNow();

    setTouched(true);
    setReviewed((n) => n + 1);
    setRevealed(false);
    setQueue((q) => q.slice(1));
  }, [card, editingNotes, notes, updateNote, setEditingNoteFor, syncNow]);

  const skip = useCallback(() => {
    if (queue.length < 2) return;
    setTouched(true);
    setRevealed(false);
    trackEvent("revision_skip", { question_id: queue[0].question.id });
    setQueue((q) => [...q.slice(1), q[0]]);
  }, [queue]);

  // Keyboard: 1/2/3 rate, S skip, Space shows the pattern, N opens notes.
  useEffect(() => {
    if (!card) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const rating = RATINGS.find((r) => r.key === e.key);
      if (rating) {
        e.preventDefault();
        rateCurrent(rating.id);
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        skip();
      } else if (e.key === " ") {
        // Space on a focused control should press it, not reveal.
        if (target?.closest("button, a")) return;
        e.preventDefault();
        setRevealed(true);
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        toggleNotes();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [card, rateCurrent, skip, toggleNotes]);

  const todayIso = today();
  const total = queue.length + reviewed;
  const done = reviewed;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      <div className="pt-6">
        <h2 className="text-2xl">Revision</h2>
        <p className="mt-2 max-w-[70ch] text-md text-ink-2">
          Questions you&apos;ve solved come back here when they&apos;re due. Solve it again, rate how it went, and the next review date is set for you.
        </p>
        {total > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <span className="font-outlier text-lg font-medium text-ink tabular-nums">{done} of {total} reviewed</span>
              <span className="text-sm text-muted">Order: {strategy.label}</span>
            </div>
            <div className="relative h-1 overflow-hidden bg-sheet-3" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Revision progress">
              <div
                className="absolute inset-0 origin-left bg-accent transition-transform duration-(--dur-long) ease-out"
                style={{ transform: `scaleX(${pct / 100})` }}
              />
            </div>
          </div>
        )}
      </div>

      {completed.size === 0 && total === 0 ? (
        <div className="max-w-xl py-16">
          <h3 className="text-xl">Nothing to revise yet</h3>
          <p className="mt-2 text-md text-ink-2">
            Tick off questions in All Questions or the roadmaps as you solve them. Each one comes back here when it&apos;s due for review.
          </p>
        </div>
      ) : !card ? (
        <DoneState reviewed={reviewed} nextReview={nextReviewAfter(reminders, todayIso)} todayIso={todayIso} />
      ) : (
        <RevisionCardView
          card={card}
          solvedDate={solvedDates[card.question.id]}
          todayIso={todayIso}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
          note={notes[card.question.id]}
          editing={editingNotes[card.question.id]}
          onToggleNotes={toggleNotes}
          setEditingNote={(note) => setEditingNoteFor(card.question.id, note)}
          updateNote={updateNote}
          notes={notes}
          intervals={intervals}
          onRate={rateCurrent}
          onSkip={skip}
          canSkip={queue.length > 1}
        />
      )}
    </div>
  );
}

function RevisionCardView({
  card, solvedDate, todayIso, revealed, onReveal, note, editing, onToggleNotes,
  setEditingNote, updateNote, notes, intervals, onRate, onSkip, canSkip,
}: {
  card: RevisionCard;
  solvedDate: string | undefined;
  todayIso: string;
  revealed: boolean;
  onReveal: () => void;
  note: string | undefined;
  editing: EditingNote | undefined;
  onToggleNotes: () => void;
  setEditingNote: (note: EditingNote | null) => void;
  updateNote: (id: number, value: string) => void;
  notes: Record<number, string>;
  intervals: Record<RevisionRating, number> | null;
  onRate: (rating: RevisionRating) => void;
  onSkip: () => void;
  canSkip: boolean;
}) {
  const q = card.question;
  const hint = HINTS.get(q.slug);
  const overdue = daysBetween(card.dueDate, todayIso);
  const solvedLine = solvedDate ? `Solved ${daysAgo(daysBetween(solvedDate.slice(0, 10), todayIso))}.` : "";
  const dueLine = overdue <= 0 ? "Due today." : `Due ${daysAgo(overdue)}.`;

  return (
    <article aria-label={`Revision card: ${q.title}`} className="mt-8 max-w-3xl border-t-2 border-ink pt-6">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h3 className="text-3xl">{q.title}</h3>
        <span className={`text-sm font-medium ${difficultyText[q.difficulty] ?? ""}`}>{q.difficulty}</span>
        {q.premium && <Lock className="h-3.5 w-3.5 text-muted" role="img" aria-label="Premium" />}
      </div>
      <p className="mt-2 text-md text-ink-2">{solvedLine} {dueLine}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <a
          href={`https://leetcode.com/problems/${q.slug}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          Open on LeetCode
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
        {NEETCODE_SLUGS.has(q.slug) && (
          <a
            href={`https://neetcode.io/solutions/${q.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
          >
            NeetCode solution
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </div>

      <section aria-label="Pattern" className="mt-8">
        {revealed ? (
          <div>
            <p className="text-sm text-muted">Pattern</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {q.pattern.map((p) => (
                <span key={p} className="tag">{p}</span>
              ))}
            </div>
            {hint && (
              <p className="mt-3 flex max-w-[65ch] items-start gap-2 text-md text-ink-2">
                <Lightbulb className="mt-1 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <span>{hint}</span>
              </p>
            )}
          </div>
        ) : (
          <button type="button" className="btn" onClick={onReveal} aria-keyshortcuts="Space">
            <Eye className="h-4 w-4" aria-hidden="true" />
            Show pattern
            <kbd className="kbd hidden sm:inline">Space</kbd>
          </button>
        )}
      </section>

      <section aria-label="Notes" className="mt-8">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted">Notes</p>
          <button
            type="button"
            data-note-toggle
            onClick={onToggleNotes}
            aria-expanded={!!editing}
            aria-keyshortcuts="N"
            className="btn btn-quiet -ml-2"
          >
            <NotebookPen className="h-4 w-4" aria-hidden="true" />
            {note ? "Edit notes" : "Add notes"}
            <kbd className="kbd hidden sm:inline">N</kbd>
          </button>
        </div>
        {editing ? (
          <div className="mt-2">
            <NoteEditor editingNote={editing} setEditingNote={setEditingNote} updateNote={updateNote} notes={notes} />
          </div>
        ) : note ? (
          <div className="mt-2 max-w-[70ch] border-t border-rule pt-3 text-md text-ink-2">
            <FormattedNote text={note} className="whitespace-pre-wrap break-words" />
          </div>
        ) : null}
      </section>

      <div className="mt-10 border-t border-rule pt-6">
        <p className="text-md text-ink">How did it go?</p>
        <div className="mt-3 grid max-w-xl grid-cols-3 gap-2">
          {RATINGS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onRate(r.id)}
              aria-keyshortcuts={r.key}
              className="btn h-auto flex-col items-stretch gap-2 py-3 text-left"
            >
              <span className="flex items-center justify-between text-md">
                {r.label}
                <kbd className="kbd hidden sm:inline">{r.key}</kbd>
              </span>
              {intervals && (
                <span className="font-outlier text-xs font-normal text-muted tabular-nums">
                  <span className="hidden sm:inline">next in </span>{plural(intervals[r.id], "day")}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onSkip}
          disabled={!canSkip}
          aria-keyshortcuts="S"
          title={canSkip ? "Move this question to the back of the queue" : "This is the last question in the queue"}
          className="btn btn-quiet -ml-3 mt-3"
        >
          Skip for now
          <kbd className="kbd hidden sm:inline">S</kbd>
        </button>
      </div>
    </article>
  );
}

function DoneState({ reviewed, nextReview, todayIso }: { reviewed: number; nextReview: string | null; todayIso: string }) {
  const days = nextReview ? daysBetween(todayIso, nextReview) : null;
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center py-16 text-center">
      <AsciiDog />
      <h3 className="mt-10 text-3xl">All caught up!</h3>
      <p className="mt-3 max-w-[50ch] text-md text-ink-2">
        {reviewed > 0 ? `You reviewed ${plural(reviewed, "question")}. ` : "Nothing is due today. "}
        {nextReview && days !== null
          ? `Next review ${days === 1 ? "tomorrow" : `in ${days} days`}, on ${shortDate(nextReview)}.`
          : ""}
      </p>
    </div>
  );
}
