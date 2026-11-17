"use client";

import { useState, useMemo, useCallback, useEffect, Fragment } from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  NotebookPen,
  Check,
  Star,
  Lock,
  Lightbulb,
} from "lucide-react";
import { Question } from "@/types/question";
import { Roadmap } from "@/data/roadmaps";
import { trackEvent } from "@/lib/analytics";
import FormattedNote from "@/components/questions/FormattedNote";
import NoteEditor, { type EditingNote } from "@/components/questions/NoteEditor";
import { doneRowTintStatic } from "@/components/questions/difficultyStyles";
import { loadCompleted, saveCompleted, loadStarred, saveStarred, loadNotes, saveNotes, loadSolvedDates, saveSolvedDates, loadReminders, saveReminders } from "@/lib/storage";
import { useAuth } from "@/components/layout/AuthContext";
import { type Reminder, initReminder } from "@/lib/reminders";

function InlineMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {line.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g).map((part, pi) => {
            if (/^\*\*\*(.+)\*\*\*$/.test(part))
              return <strong key={pi}><em>{part.slice(3, -3)}</em></strong>;
            if (/^\*\*(.+)\*\*$/.test(part))
              return <strong key={pi}>{part.slice(2, -2)}</strong>;
            if (/^\*(.+)\*$/.test(part))
              return <em key={pi}>{part.slice(1, -1)}</em>;
            if (/^`(.+)`$/.test(part))
              return <code key={pi} className="rounded-pill bg-sheet-2 px-1 py-0.5 font-outlier text-xs">{part.slice(1, -1)}</code>;
            const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
              const isExternal = /^https?:\/\//.test(linkMatch[2]);
              return <a key={pi} href={linkMatch[2]} {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="link">{linkMatch[1]}</a>;
            }
            return part;
          })}
        </Fragment>
      ))}
    </>
  );
}

const difficultyColor: Record<string, string> = {
  Easy: "text-easy",
  Medium: "text-medium",
  Hard: "text-hard",
};

interface Props {
  roadmap: Roadmap;
  questions: Question[];
}

export default function RoadmapView({ roadmap, questions }: Props) {
  const { syncNow, syncVersion } = useAuth();
  const slugToQuestion = useMemo(() => {
    const map = new Map<string, Question>();
    questions.forEach((q) => map.set(q.slug, q));
    return map;
  }, [questions]);

  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [starred, setStarred] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [, setSolvedDates] = useState<Record<number, string>>({});
  const [, setReminders] = useState<Record<number, Reminder>>({});
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string | number>>(
    new Set()
  );
  const [expandedHints, setExpandedHints] = useState<Set<string>>(new Set());
  // Open inline note editors, keyed by question id.
  const [editingNotes, setEditingNotes] = useState<Record<number, EditingNote>>({});

  useEffect(() => {
    setCompleted(loadCompleted());
    setStarred(loadStarred());
    setNotes(loadNotes());
    setSolvedDates(loadSolvedDates());
    setReminders(loadReminders());
  }, []);

  // Reload from localStorage when remote sync arrives
  useEffect(() => {
    if (syncVersion === 0) return;
    setCompleted(loadCompleted());
    setStarred(loadStarred());
    setNotes(loadNotes());
    setSolvedDates(loadSolvedDates());
    setReminders(loadReminders());
  }, [syncVersion]);

  const toggleCompleted = useCallback((id: number) => {
    let completing = false;
    setCompleted((prev) => {
      const next = new Set(prev);
      completing = !next.has(id);
      if (completing) next.add(id);
      else next.delete(id);
      saveCompleted(next);
      trackEvent("question_toggle", {
        question_id: id,
        completed: completing,
      });
      return next;
    });
    setSolvedDates((prev) => {
      const next = { ...prev };
      next[id] = new Date().toISOString();
      saveSolvedDates(next);
      return next;
    });
    setReminders((prev) => {
      const next = { ...prev };
      if (completing) {
        next[id] = initReminder(new Date().toISOString());
      } else {
        delete next[id];
      }
      saveReminders(next);
      return next;
    });
    syncNow();
  }, [syncNow]);

  const toggleStarred = useCallback((id: number) => {
    setStarred((prev) => {
      const next = new Set(prev);
      const starring = !next.has(id);
      if (starring) next.add(id);
      else next.delete(id);
      saveStarred(next);
      trackEvent("star_toggle", { question_id: id, starred: starring });
      return next;
    });
    syncNow();
  }, [syncNow]);

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

  const toggleNoteEditor = useCallback(
    (id: number, title: string) => {
      setEditingNotes((prev) => {
        const current = prev[id];
        if (!current) {
          return { ...prev, [id]: { id, title, draft: notes[id] ?? "", confirmDiscard: false } };
        }
        // Closing from the toggle follows the same unsaved-changes guard as Cancel.
        if (current.draft !== (notes[id] ?? "")) {
          return { ...prev, [id]: { ...current, confirmDiscard: true } };
        }
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [notes]
  );

  const setEditingNoteFor = useCallback((id: number, note: EditingNote | null) => {
    setEditingNotes((prev) => {
      if (note) return { ...prev, [id]: note };
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const togglePhase = useCallback((index: string | number) => {
    setCollapsedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    let total = 0;
    let done = 0;
    const doneByDiff = { Easy: 0, Medium: 0, Hard: 0 };
    const totalByDiff = { Easy: 0, Medium: 0, Hard: 0 };
    roadmap.phases.forEach((phase) => {
      phase.questions.forEach((rq) => {
        const q = slugToQuestion.get(rq.slug);
        if (q) {
          total++;
          if (q.difficulty in totalByDiff) totalByDiff[q.difficulty as keyof typeof totalByDiff]++;
          if (completed.has(q.id)) {
            done++;
            if (q.difficulty in doneByDiff) doneByDiff[q.difficulty as keyof typeof doneByDiff]++;
          }
        }
      });
    });
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0, doneByDiff, totalByDiff };
  }, [roadmap, slugToQuestion, completed]);

  const phaseStats = useMemo(() => {
    return roadmap.phases.map((phase) => {
      let total = 0;
      let done = 0;
      phase.questions.forEach((rq) => {
        const q = slugToQuestion.get(rq.slug);
        if (q) {
          total++;
          if (completed.has(q.id)) done++;
        }
      });
      return { total, done };
    });
  }, [roadmap, slugToQuestion, completed]);

  // For beginner roadmap: group by difficulty, then phases within each
  const difficultyGroups = useMemo(() => {
    if (!["beginner", "experienced"].includes(roadmap.id)) return null;
    const difficulties = ["Easy", "Medium", "Hard"] as const;
    const groups = difficulties
      .map((diff) => {
        const phases = roadmap.phases
          .map((phase, phaseIndex) => {
            const qs = phase.questions.filter((rq) => {
              const q = slugToQuestion.get(rq.slug);
              return q?.difficulty === diff;
            });
            if (qs.length === 0) return null;
            return { phase, phaseIndex, questions: qs };
          })
          .filter(Boolean) as {
          phase: (typeof roadmap.phases)[number];
          phaseIndex: number;
          questions: (typeof roadmap.phases)[number]["questions"];
        }[];
        if (phases.length === 0) return null;
        const total = phases.reduce((sum, p) => sum + p.questions.length, 0);
        const done = phases.reduce(
          (sum, p) =>
            sum +
            p.questions.filter((rq) => {
              const q = slugToQuestion.get(rq.slug);
              return q && completed.has(q.id);
            }).length,
          0
        );
        return { difficulty: diff, phases, total, done, phaseOffset: 0 };
      })
      .filter(Boolean) as {
      difficulty: string;
      phases: {
        phase: (typeof roadmap.phases)[number];
        phaseIndex: number;
        questions: (typeof roadmap.phases)[number]["questions"];
      }[];
      total: number;
      done: number;
      phaseOffset: number;
    }[];

    let offset = 0;
    for (const group of groups) {
      group.phaseOffset = offset;
      offset += group.phases.length;
    }
    return groups;
  }, [roadmap, slugToQuestion, completed]);

  const renderQuestionRow = (q: Question, rq: { slug: string; note: string }, { showDifficulty = true } = {}) => {
    const isDone = completed.has(q.id);
    const isStarred = starred.has(q.id);
    const userNote = notes[q.id];
    const editing = editingNotes[q.id];

    return (
      <div
        key={rq.slug}
        className={`flex items-start gap-3 border-t border-rule px-2 py-3 first:border-t-0 ${
          isDone ? doneRowTintStatic[q.difficulty] ?? "" : ""
        }`}
      >
        <input
          type="checkbox"
          checked={isDone}
          onChange={() => toggleCompleted(q.id)}
          aria-label={`Mark ${q.title} as ${isDone ? "incomplete" : "complete"}`}
          className="check mt-1"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <a
              href={`https://leetcode.com/problems/${q.slug}/`}
              target="_blank"
              rel="noopener noreferrer"
              className={`link-row text-md font-medium ${
                isDone ? "text-muted line-through" : ""
              }`}
            >
              {q.title}
              {q.premium && (
                <Lock className="ml-1 inline h-3 w-3 align-baseline text-muted" role="img" aria-label="Premium" />
              )}
            </a>
            {showDifficulty && (
              <span
                className={`text-sm font-medium ${difficultyColor[q.difficulty]}`}
              >
                {q.difficulty}
              </span>
            )}
            <div className="flex flex-wrap gap-1">
              {q.pattern.map((p) => (
                <span
                  key={p}
                  className="tag"
                >
                  {p}
                </span>
              ))}
            </div>
            {q.companies.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {q.companies.map((c) => (
                  <span key={c.slug} className="group/icon relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icons/${c.slug}.png`}
                      alt={c.name}
                      width={16}
                      height={16}
                      className="h-4 w-4 object-contain p-px dark:bg-ink"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        const fallback = `https://www.google.com/s2/favicons?sz=64&domain_url=https://${c.slug}.com`;
                        if (!img.dataset.triedFallback) {
                          img.dataset.triedFallback = "1";
                          img.src = fallback;
                        } else {
                          img.style.display = "none";
                          img.nextElementSibling?.classList.remove("hidden");
                        }
                      }}
                    />
                    <span className="hidden tag text-xs">
                      {c.name}
                    </span>
                    <span className="tip bottom-full left-1/2 mb-2 -translate-x-1/2 group-hover/icon:block group-hover/icon:delay-800">
                      {c.name} - asked {c.frequency} {c.frequency === 1 ? "time" : "times"} in the last 6 months
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              setExpandedHints((prev) => {
                const next = new Set(prev);
                if (next.has(rq.slug)) next.delete(rq.slug);
                else next.add(rq.slug);
                return next;
              })
            }
            aria-expanded={expandedHints.has(rq.slug)}
            className={`mt-2 inline-flex items-start gap-2 bg-sheet-2 px-2 py-1 text-left text-sm transition-colors duration-(--dur-micro) hover:bg-sheet-3 ${
              expandedHints.has(rq.slug) ? "text-ink-2" : "font-display font-medium text-ink"
            }`}
          >
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
            {expandedHints.has(rq.slug) ? (
              <span className="break-words text-left">{rq.note}</span>
            ) : (
              <span>Show hint</span>
            )}
          </button>
          {editing ? (
            <div className="mt-3">
              <NoteEditor
                editingNote={editing}
                setEditingNote={(note) => setEditingNoteFor(q.id, note)}
                updateNote={updateNote}
                notes={notes}
              />
            </div>
          ) : userNote && (
            <p className="mt-2 break-words text-sm text-ink-2">
              <NotebookPen className="inline h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />{" "}
              <FormattedNote text={userNote} />
            </p>
          )}
        </div>
        <div className="-my-1 flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => toggleStarred(q.id)}
            className="btn btn-quiet btn-icon"
            title={isStarred ? "Unstar" : "Star"}
          >
            <Star
              aria-hidden="true"
              className={`h-4 w-4 ${
                isStarred
                  ? "fill-ink text-ink"
                  : "text-muted"
              }`}
            />
          </button>
          <button
            type="button"
            onClick={() => toggleNoteEditor(q.id, q.title)}
            data-note-toggle
            aria-expanded={!!editing}
            className={`btn btn-quiet btn-icon ${editing ? "bg-wash" : ""}`}
            title="Add note"
          >
            <NotebookPen
              aria-hidden="true"
              className={`h-4 w-4 ${
                userNote || editing
                  ? "text-ink"
                  : "text-muted"
              }`}
            />
          </button>
          <a
            href={`https://leetcode.com/problems/${q.slug}/solutions/`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-quiet btn-icon text-muted hover:text-ink"
            title="View solutions"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    );
  };

  const phaseMarker = (complete: boolean, started: boolean, n: number) => (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center font-outlier text-sm font-medium tabular-nums ${
        complete
          ? "bg-ink text-sheet"
          : started
            ? "border border-ink text-ink"
            : "border border-rule text-muted"
      }`}
    >
      {complete ? <Check className="h-4 w-4" aria-hidden="true" /> : n}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="pt-6">
        <h2 className="text-2xl">{roadmap.name}</h2>
        <p className="mt-2 max-w-[70ch] text-md text-ink-2"><InlineMarkdown text={roadmap.description} /></p>
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="font-outlier text-lg font-medium text-ink tabular-nums">{stats.done}/{stats.total} completed ({stats.pct}%)</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium tabular-nums">
              {stats.totalByDiff.Easy > 0 && (
                <span className="text-easy">
                  Easy: {stats.doneByDiff.Easy}/{stats.totalByDiff.Easy}
                </span>
              )}
              {stats.totalByDiff.Medium > 0 && (
                <span className="text-medium">
                  Medium: {stats.doneByDiff.Medium}/{stats.totalByDiff.Medium}
                </span>
              )}
              {stats.totalByDiff.Hard > 0 && (
                <span className="text-hard">
                  Hard: {stats.doneByDiff.Hard}/{stats.totalByDiff.Hard}
                </span>
              )}
            </div>
          </div>
          <div className="relative h-1 overflow-hidden bg-sheet-3" role="progressbar" aria-valuenow={stats.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Roadmap progress">
            <div
              className="absolute inset-0 origin-left bg-accent transition-transform duration-(--dur-long) ease-out"
              style={{ transform: `scaleX(${stats.pct / 100})` }}
            />
          </div>
        </div>
      </div>

      {/* Beginner: group by difficulty → phases */}
      {difficultyGroups ? (
        <div className="mt-10 space-y-16">
          {difficultyGroups.map((group) => {
            const diffSubtitle: Record<string, string> = {
              Easy: "Build your foundation with these introductory problems",
              Medium: "Medium difficulty problems begin introducing new techniques and algorithms - most of the time you will need to study the optimal solution",
              Hard: "Avoid these unless you have a lot of time - 99.9999% of the time you will have to study the optimal solution",
            };
            const groupPct = group.total > 0 ? Math.round((group.done / group.total) * 100) : 0;

            return (
              <section key={group.difficulty} className="border-t-2 border-rule-2 pt-4">
                {/* Difficulty header */}
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h3 className={`text-xl ${difficultyColor[group.difficulty]}`}>
                    {group.difficulty}
                  </h3>
                  <span className="font-outlier text-sm text-muted tabular-nums">
                    {group.done}/{group.total} completed ({groupPct}%)
                  </span>
                </div>
                {roadmap.id === "beginner" && (
                  <p className="mt-2 max-w-[70ch] text-md text-ink-2">
                    {diffSubtitle[group.difficulty]}
                  </p>
                )}

                {/* Phases within this difficulty */}
                <ol className="mt-4">
                  {group.phases.map((entry) => {
                    const collapseKey = `${group.difficulty}-${entry.phaseIndex}`;
                    const isCollapsed = collapsedPhases.has(collapseKey);
                    const phaseDone = entry.questions.filter((rq) => {
                      const q = slugToQuestion.get(rq.slug);
                      return q && completed.has(q.id);
                    }).length;
                    const phaseComplete = phaseDone === entry.questions.length;

                    return (
                      <li key={collapseKey} className="border-t border-rule first:border-t-0">
                        <button
                          type="button"
                          onClick={() => togglePhase(collapseKey)}
                          aria-expanded={!isCollapsed}
                          className="flex w-full items-center gap-2 py-3 text-left transition-colors duration-(--dur-micro) hover:bg-wash"
                        >
                          {phaseMarker(phaseComplete, phaseDone > 0, entry.phaseIndex + 1)}
                          <div className="min-w-0 flex-1 pl-2">
                            <div className="flex items-baseline gap-2">
                              <span className="font-display font-semibold text-ink">{entry.phase.title}</span>
                              <span className="font-outlier text-sm text-muted tabular-nums">
                                {phaseDone}/{entry.questions.length}
                              </span>
                            </div>
                            {roadmap.id === "beginner" && (
                              <p className="mt-1 text-sm text-ink-2">
                                <InlineMarkdown text={
                                  group.difficulty !== "Easy" && entry.phase.mediumDescription
                                    ? entry.phase.mediumDescription
                                    : entry.phase.description
                                } />
                              </p>
                            )}
                          </div>
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                          )}
                        </button>

                        {!isCollapsed && (
                          <div className="border-t border-rule sm:pl-12">
                            {entry.questions.map((rq) => {
                              const q = slugToQuestion.get(rq.slug);
                              if (!q) return null;
                              return renderQuestionRow(q, rq, { showDifficulty: false });
                            })}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
      ) : (
        /* Experienced / default: flat phases */
        <ol className="mt-10 border-t-2 border-rule-2">
          {roadmap.phases.map((phase, phaseIndex) => {
            const isCollapsed = collapsedPhases.has(phaseIndex);
            const ps = phaseStats[phaseIndex];
            const phaseComplete = ps.done === ps.total && ps.total > 0;

            return (
              <li key={phaseIndex} className="border-t border-rule first:border-t-0">
                <button
                  type="button"
                  onClick={() => togglePhase(phaseIndex)}
                  aria-expanded={!isCollapsed}
                  className="flex w-full items-center gap-2 py-3 text-left transition-colors duration-(--dur-micro) hover:bg-wash"
                >
                  {phaseMarker(phaseComplete, ps.done > 0, phaseIndex + 1)}
                  <div className="min-w-0 flex-1 pl-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display font-semibold text-ink">{phase.title}</span>
                      <span className="font-outlier text-sm text-muted tabular-nums">
                        {ps.done}/{ps.total}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-2">
                      <InlineMarkdown text={phase.description} />
                    </p>
                  </div>
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                  )}
                </button>

                {!isCollapsed && (
                  <div className="border-t border-rule sm:pl-12">
                    {phase.questions.map((rq) => {
                      const q = slugToQuestion.get(rq.slug);
                      if (!q) return null;
                      return renderQuestionRow(q, rq);
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {/* Next Steps. border-blue-300 and bg-blue-100 are test hooks only: globals.css keeps them from generating CSS. */}
      {roadmap.nextSteps && roadmap.nextSteps.length > 0 && (
        <section className="border-blue-300 mt-16 border-t-2 border-ink pt-4">
          <h3 className="bg-blue-100 text-xl">
            Next Steps
          </h3>
          <p className="mt-2 text-md text-ink-2">
            What to do after completing this roadmap
          </p>
          <ol className="mt-4">
            {roadmap.nextSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 border-t border-rule py-3 text-md text-ink-2 first:border-t-0">
                <span className="bg-blue-100 flex h-6 w-6 shrink-0 items-center justify-center border border-rule-2 font-outlier text-sm font-medium text-ink tabular-nums">
                  {i + 1}
                </span>
                <span><InlineMarkdown text={step} /></span>
              </li>
            ))}
          </ol>
        </section>
      )}

    </div>
  );
}
