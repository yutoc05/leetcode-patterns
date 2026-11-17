"use client";

import { useState, useMemo, useCallback, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { Question } from "@/types/question";
import { ExternalLink, Star, Check, Lock, ArrowUp, ArrowDown } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import FormattedNote from "@/components/questions/FormattedNote";
import { loadCompleted, saveCompleted, loadStarred, saveStarred, loadNotes, saveNotes, loadSolvedDates, saveSolvedDates, loadShuffleOrder, saveShuffleOrder, migrateLegacyProgress, loadReminders, saveReminders } from "@/lib/storage";
import { useAuth } from "@/components/layout/AuthContext";
import { type Reminder, isDue, setCustomDate as setCustomReviewDate } from "@/lib/reminders";
import ProgressBar, { type ProgressStats } from "./ProgressBar";
import FilterToolbar from "./FilterToolbar";
import NoteModal, { type EditingNote } from "./NoteModal";
import ConfirmModal from "./ConfirmModal";
import GroupHeaderRow from "./GroupHeaderRow";
import QuestionRow from "./QuestionRow";
import ReviewDateModal, { type ReviewDateTarget } from "./ReviewDateModal";

const columnHelper = createColumnHelper<Question>();

const difficultyColor: Record<string, string> = {
  Easy: "text-easy",
  Medium: "text-medium",
  Hard: "text-hard",
};

const makeColumns = (
  completed: Set<number>,
  toggleCompleted: (id: number) => void,
  starred: Set<number>,
  toggleStarred: (id: number) => void,
  notes: Record<number, string>,
  openNoteModal: (id: number, title: string) => void,
  hidePatterns: boolean,
  companyFilter: string[],
  updatedDate: string,
  solvedDates: Record<number, string>,
  reminders: Record<number, Reminder>,
  openReviewModal: (id: number, title: string) => void,
  completeReminder: (id: number) => void
) => [
  columnHelper.display({
    id: "completed",
    header: () => <Check className="h-4 w-4" role="img" aria-label="Completed" />,
    size: 40,
    cell: (info) => (
      <input
        type="checkbox"
        checked={completed.has(info.row.original.id)}
        onChange={() => toggleCompleted(info.row.original.id)}
        className="check pointer-events-none"
        aria-label={`Mark ${info.row.original.title} as ${completed.has(info.row.original.id) ? "incomplete" : "complete"}`}
      />
    ),
    meta: { clickable: true },
  }),
  columnHelper.display({
    id: "starred",
    header: () => <Star className="h-4 w-4" role="img" aria-label="Starred" />,
    size: 40,
    cell: (info) => (
      <span
        role="checkbox"
        aria-checked={starred.has(info.row.original.id)}
        aria-label={`Star ${info.row.original.title}`}
      >
        <Star
          aria-hidden="true"
          className={`h-4 w-4 pointer-events-none ${
            starred.has(info.row.original.id)
              ? "fill-ink text-ink"
              : "text-muted"
          }`}
        />
      </span>
    ),
    meta: { clickable: true, toggleFn: "starred" },
    enableSorting: false,
  }),
  columnHelper.accessor("title", {
    header: "Title",
    cell: (info) => (
      <a
        href={`https://leetcode.com/problems/${info.row.original.slug}/`}
        target="_blank"
        rel="noopener noreferrer"
        className={`link-row inline-block min-w-40 text-md min-[1400px]:min-w-56 ${completed.has(info.row.original.id) ? "text-muted line-through" : ""}`}
      >
        {info.getValue()}
        {info.row.original.premium && (
          <Lock className="ml-1 inline h-3 w-3 align-baseline text-muted" role="img" aria-label="Premium" />
        )}
      </a>
    ),
  }),
  columnHelper.display({
    id: "solutions",
    header: "Solutions",
    size: 75,
    cell: (info) => (
      <a
        href={`https://leetcode.com/problems/${info.row.original.slug}/solutions/`}
        target="_blank"
        rel="noopener noreferrer"
        title="View solutions"
        aria-label={`View solutions for ${info.row.original.title}`}
        className="relative inline-flex items-center text-muted transition-colors duration-(--dur-micro) after:absolute after:-inset-2 hover:text-ink"
      >
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>
    ),
    enableSorting: false,
    meta: { hideOnMobile: true },
  }),
  columnHelper.accessor("difficulty", {
    header: "Difficulty",
    cell: (info) => (
      <span className={`text-sm font-medium ${completed.has(info.row.original.id) ? "text-muted line-through" : difficultyColor[info.getValue()]}`}>
        {info.getValue()}
      </span>
    ),
    filterFn: (row, _columnId, filterValue: string[]) => {
      if (!filterValue || filterValue.length === 0) return true;
      return filterValue.includes(row.original.difficulty);
    },
    meta: { hideOnMobile: true },
  }),
  columnHelper.accessor("pattern", {
    header: "Pattern(s)",
    cell: (info) => (
      <div className="flex flex-wrap gap-1">
        {info.getValue().map((p) => (
          <span
            key={p}
            className="tag whitespace-normal"
          >
            {hidePatterns ? "•".repeat(p.length) : p}
          </span>
        ))}
      </div>
    ),
    filterFn: (row, _columnId, filterValue: string[]) => {
      if (!filterValue || filterValue.length === 0) return true;
      return row.original.pattern.some((p) =>
        filterValue.some((f) => p.toLowerCase() === f.toLowerCase())
      );
    },
  }),
  columnHelper.accessor("companies", {
    header: () => (
      <div>
        <span>Companies</span>
        <div className="text-xs font-normal text-muted">
          0 to 6 months, via{" "}
          <a href="https://leetcode.com/subscribe/" target="_blank" rel="noopener noreferrer" className="link text-muted">
            LC Premium
          </a>
          {", "}
          {new Date(updatedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      </div>
    ),
    meta: { hideOnMobile: true },
    cell: (info) => (
      <div className="flex w-[156px] flex-wrap gap-1">
        {info.getValue().map((c) => (
          <span key={c.slug} className="group/icon relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icons/${c.slug}.png`}
              alt={c.name}
              width={20}
              height={20}
              className="h-5 w-5 object-contain p-px dark:bg-ink"
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
            <span className="hidden tag">
              {c.name}
            </span>
            <span className="tip bottom-full left-1/2 mb-2 -translate-x-1/2 group-hover/icon:block group-hover/icon:delay-800">
              {c.name} - asked {c.frequency} {c.frequency === 1 ? "time" : "times"} in the last 6 months
            </span>
          </span>
        ))}
      </div>
    ),
    enableSorting: companyFilter.length === 1,
    sortingFn: (rowA, rowB) => {
      const slug = companyFilter[0];
      const freqA = rowA.original.companies.find((c) => c.slug === slug)?.frequency ?? 0;
      const freqB = rowB.original.companies.find((c) => c.slug === slug)?.frequency ?? 0;
      return freqA - freqB;
    },
    filterFn: (row, _columnId, filterValue: string[]) => {
      if (!filterValue || filterValue.length === 0) return true;
      return row.original.companies.some(
        (c) => filterValue.includes(c.slug)
      );
    },
  }),
  columnHelper.display({
    id: "notes",
    header: "Notes",
    size: 100,
    meta: { hideOnMobile: true, noStrikethrough: true },
    cell: (info) => {
      const note = notes[info.row.original.id];
      return (
        <NoteCell note={note}>
          <button
            onClick={() =>
              openNoteModal(info.row.original.id, info.row.original.title)
            }

            aria-label={`${note ? "Edit" : "Add"} note for ${info.row.original.title}`}
            className="block max-w-[100px] cursor-pointer truncate text-left text-sm text-muted transition-colors duration-(--dur-micro) hover:text-ink"
          >
            {note || <svg className="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>}
          </button>
        </NoteCell>
      );
    },
    enableSorting: false,
  }),
  columnHelper.display({
    id: "review",
    header: "Review",
    size: 160,
    meta: { hideOnMobile: true, noStrikethrough: true },
    cell: (info) => {
      const solvedDate = solvedDates[info.row.original.id];
      const reminder = reminders[info.row.original.id];
      if (!solvedDate && !reminder) return <span className="block h-px w-4 bg-rule-2/40" aria-hidden="true" />;
      const dateFmt = { month: "short" as const, day: "numeric" as const, year: "numeric" as const };
      return (
        <div className="flex flex-col items-start gap-0.5">
          {solvedDate && (
            <span
              className="tag text-muted"
              title={new Date(solvedDate).toLocaleDateString("en-US", dateFmt)}
            >
              Solved {relativeDate(solvedDate, "past")}
            </span>
          )}
          {reminder ? (
            <span className={`inline-flex items-center whitespace-nowrap rounded-pill border text-sm font-medium ${reviewPillStyle(reminder.nextReview)}`}>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1 py-0.5 pl-2 pr-2 transition-colors duration-(--dur-micro) hover:bg-wash"
                title={`${new Date(reminder.nextReview + "T00:00:00").toLocaleDateString("en-US", dateFmt)}. Click to change`}
                onClick={(e) => { e.stopPropagation(); openReviewModal(info.row.original.id, info.row.original.title); }}
              >
                {relativeDate(reminder.nextReview, "future")}
              </button>
              <span className="w-px self-stretch bg-current opacity-20" />
              <button
                type="button"
                className="inline-flex cursor-pointer items-center justify-center self-stretch px-2 transition-colors duration-(--dur-micro) hover:bg-wash"
                title="Mark review as completed"
                aria-label="Mark review as completed"
                onClick={(e) => { e.stopPropagation(); completeReminder(info.row.original.id); }}
              >
                <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
              </button>
            </span>
          ) : solvedDate && (
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-pill border border-dashed border-muted px-2 py-0.5 text-sm text-muted transition-colors duration-(--dur-micro) hover:border-ink hover:text-ink"
              title="Set a review date"
              onClick={(e) => { e.stopPropagation(); openReviewModal(info.row.original.id, info.row.original.title); }}
            >
              + Set review
            </button>
          )}
        </div>
      );
    },
    enableSorting: false,
  }),
];

function daysDiff(isoDate: string): number {
  const todayStr = new Date().toISOString().slice(0, 10);
  const target = isoDate.slice(0, 10);
  const todayMs = new Date(todayStr + "T00:00:00Z").getTime();
  const targetMs = new Date(target + "T00:00:00Z").getTime();
  return Math.round((targetMs - todayMs) / 86_400_000);
}

function reviewPillStyle(isoDate: string): string {
  const diff = daysDiff(isoDate);
  // Due or overdue: the one row the page points at, printed in magenta.
  if (diff <= 0) return "border-accent text-accent";
  if (diff <= 3) return "border-rule-2 text-ink";
  return "border-rule text-muted";
}

function relativeDate(isoDate: string, mode: "past" | "future"): string {
  const diffDays = daysDiff(isoDate);
  if (mode === "past") {
    const ago = -diffDays;
    if (ago <= 0) return "today";
    if (ago === 1) return "yesterday";
    return `${ago}d ago`;
  }
  if (diffDays < 0) return `Overdue ${-diffDays}d`;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Review tomorrow";
  return `Review in ${diffDays}d`;
}

const mobileQuery = "(max-width: 639px)";

function NoteCell({ note, children }: { note: string | undefined; children: ReactNode }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(() => {
    clearTimeout(hideTimeout.current);
    if (!note || !ref.current) return;
    setRect(ref.current.getBoundingClientRect());
  }, [note]);

  const hide = useCallback(() => {
    hideTimeout.current = setTimeout(() => setRect(null), 100);
  }, []);

  useEffect(() => () => clearTimeout(hideTimeout.current), []);

  const style = useMemo(() => {
    if (!rect) return undefined;
    const gap = 8;
    const spaceAbove = rect.top - gap;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const above = spaceAbove >= Math.min(200, spaceBelow);
    const maxH = Math.min(300, above ? spaceAbove : spaceBelow);
    return {
      left: rect.left,
      maxHeight: maxH,
      ...(above
        ? { bottom: window.innerHeight - rect.top + gap }
        : { top: rect.bottom + gap }),
    };
  }, [rect]);

  return (
    <div
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {note && style && (
        <div
          className="popover fixed z-(--z-tooltip) max-w-xs overflow-y-auto p-3 text-sm"
          style={style}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <FormattedNote text={note} className="whitespace-pre-wrap break-words text-ink-2" />
        </div>
      )}
    </div>
  );
}

function subscribeMobile(callback: () => void) {
  const mq = window.matchMedia(mobileQuery);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getMobileSnapshot() {
  return window.matchMedia(mobileQuery).matches;
}

function getMobileServerSnapshot() {
  return false;
}

function useIsMobile() {
  return useSyncExternalStore(subscribeMobile, getMobileSnapshot, getMobileServerSnapshot);
}

function parseInitialFilters(searchParams: URLSearchParams) {
  const filters: ColumnFiltersState = [];
  const difficulty = searchParams.get("difficulty");
  if (difficulty) filters.push({ id: "difficulty", value: difficulty.split(",") });
  const pattern = searchParams.get("pattern");
  if (pattern) filters.push({ id: "pattern", value: pattern.split(",") });
  const companies = searchParams.get("companies");
  if (companies) filters.push({ id: "companies", value: companies.split(",") });
  return filters;
}

export default function QuestionsTable({ data, updatedDate }: { data: Question[]; updatedDate: string }) {
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const { syncNow, syncVersion } = useAuth();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() =>
    parseInitialFilters(searchParams)
  );
  const [globalFilter, setGlobalFilter] = useState(
    () => searchParams.get("q") ?? ""
  );
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [starred, setStarred] = useState<Set<number>>(new Set());
  const [shuffleOrder, setShuffleOrder] = useState<number[] | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [solvedDates, setSolvedDates] = useState<Record<number, string>>({});
  const [reminders, setReminders] = useState<Record<number, Reminder>>({});
  const [migrationToast, setMigrationToast] = useState<string | null>(null);
  const [toastFading, setToastFading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const migrated = migrateLegacyProgress(data);
    setCompleted(migrated ?? loadCompleted());
    if (migrated) {
      setMigrationToast(`Migrated ${migrated.size} completed question${migrated.size === 1 ? "" : "s"} from V1`);
    }
    setStarred(loadStarred());
    setShuffleOrder(loadShuffleOrder());
    setNotes(loadNotes());
    setSolvedDates(loadSolvedDates());
    setReminders(loadReminders());
    setHydrated(true);
  }, [data]);

  // Reload from localStorage when remote sync arrives
  useEffect(() => {
    if (!hydrated || syncVersion === 0) return;
    setCompleted(loadCompleted());
    setStarred(loadStarred());
    setNotes(loadNotes());
    setSolvedDates(loadSolvedDates());
    setReminders(loadReminders());
  }, [syncVersion, hydrated]);

  useEffect(() => {
    if (!migrationToast) return;
    const fadeTimer = setTimeout(() => setToastFading(true), 2500);
    const removeTimer = setTimeout(() => { setMigrationToast(null); setToastFading(false); }, 3200);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, [migrationToast]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (globalFilter) params.set("q", globalFilter);
    const difficulty = columnFilters.find((f) => f.id === "difficulty")?.value as string[] | undefined;
    if (difficulty?.length) params.set("difficulty", difficulty.join(","));
    const pattern = columnFilters.find((f) => f.id === "pattern")?.value as string[] | undefined;
    if (pattern?.length) params.set("pattern", pattern.join(","));
    const companies = columnFilters.find((f) => f.id === "companies")?.value as string[] | undefined;
    if (companies?.length) params.set("companies", companies.join(","));
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [globalFilter, columnFilters]);

  const toggleCompleted = useCallback((id: number) => {
    let completing = false;
    setCompleted((prev) => {
      const next = new Set(prev);
      completing = !next.has(id);
      if (completing) next.add(id);
      else next.delete(id);
      saveCompleted(next);
      trackEvent("question_toggle", { question_id: id, completed: completing });
      return next;
    });
    setSolvedDates((prev) => {
      const next = { ...prev };
      next[id] = new Date().toISOString();
      saveSolvedDates(next);
      return next;
    });
    if (!completing) {
      setReminders((prev) => {
        const next = { ...prev };
        delete next[id];
        saveReminders(next);
        return next;
      });
    }
    syncNow();
  }, [syncNow]);

  const [reviewTarget, setReviewTarget] = useState<ReviewDateTarget | null>(null);

  const openReviewModal = useCallback((id: number, title: string) => {
    setReviewTarget({ id, title });
  }, []);

  const onReviewDateChange = useCallback((id: number, date: string) => {
    setReminders((prev) => {
      const existing = prev[id];
      const updated = existing
        ? setCustomReviewDate(existing, date)
        : { nextReview: date.slice(0, 10), interval: 1 };
      const next = { ...prev, [id]: updated };
      saveReminders(next);
      trackEvent("custom_review_date", { question_id: id });
      return next;
    });
    setReviewTarget(null);
    syncNow();
  }, [syncNow]);

  const onReviewDateClear = useCallback((id: number) => {
    setReminders((prev) => {
      const next = { ...prev };
      delete next[id];
      saveReminders(next);
      trackEvent("clear_review_date", { question_id: id });
      return next;
    });
    setReviewTarget(null);
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

  const patterns = useMemo(() => {
    const set = new Set<string>();
    data.forEach((q) => q.pattern.forEach((p) => set.add(p)));
    return Array.from(set).sort();
  }, [data]);

  const companies = useMemo(() => {
    const map = new Map<string, string>();
    data.forEach((q) =>
      q.companies.forEach((c) => {
        if (!map.has(c.slug)) map.set(c.slug, c.name);
      })
    );
    return Array.from(map.entries())
      .sort(([, a], [, b]) => a.localeCompare(b));
  }, [data]);

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

  const [editingNote, setEditingNote] = useState<EditingNote | null>(null);

  const openNoteModal = useCallback((id: number, title: string) => {
    setEditingNote({ id, title, draft: notes[id] ?? "", confirmDiscard: false });
  }, [notes]);

  const [hideCompleted, setHideCompleted] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [hidePatterns, setHidePatterns] = useState(false);
  const [showDueOnly, setShowDueOnly] = useState(false);

  useEffect(() => {
    setHideCompleted(localStorage.getItem("leetcode-patterns-hide-completed") === "true");
    setShowStarredOnly(localStorage.getItem("leetcode-patterns-starred-only") === "true");
    setHidePatterns(localStorage.getItem("leetcode-patterns-hide-patterns") === "true");
    setShowDueOnly(localStorage.getItem("leetcode-patterns-due-only") === "true");
  }, []);

  useEffect(() => { if (hydrated) localStorage.setItem("leetcode-patterns-hide-completed", String(hideCompleted)); }, [hideCompleted, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("leetcode-patterns-starred-only", String(showStarredOnly)); }, [showStarredOnly, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("leetcode-patterns-hide-patterns", String(hidePatterns)); }, [hidePatterns, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("leetcode-patterns-due-only", String(showDueOnly)); }, [showDueOnly, hydrated]);

  const activeCompanyFilter = useMemo(
    () => (columnFilters.find((f) => f.id === "companies")?.value as string[]) ?? [],
    [columnFilters]
  );

  const columns = useMemo(
    () => makeColumns(completed, toggleCompleted, starred, toggleStarred, notes, openNoteModal, hidePatterns, activeCompanyFilter, updatedDate, solvedDates, reminders, openReviewModal, onReviewDateClear),
    [completed, toggleCompleted, starred, toggleStarred, notes, openNoteModal, hidePatterns, activeCompanyFilter, updatedDate, solvedDates, reminders, openReviewModal, onReviewDateClear]
  );

  useEffect(() => {
    if (activeCompanyFilter.length === 1) {
      setSorting([{ id: "companies", desc: true }]);
    } else {
      setSorting((prev) =>
        prev.some((s) => s.id === "companies")
          ? prev.filter((s) => s.id !== "companies")
          : prev
      );
    }
  }, [activeCompanyFilter]);

  const filteredData = useMemo(() => {
    let result = data;
    if (hideCompleted) result = result.filter((q) => !completed.has(q.id));
    if (showStarredOnly) result = result.filter((q) => starred.has(q.id));
    if (showDueOnly) result = result.filter((q) => reminders[q.id] && isDue(reminders[q.id]));
    return result;
  }, [data, completed, starred, hideCompleted, showStarredOnly, showDueOnly, reminders]);

  const columnVisibility = useMemo(() => {
    if (!isMobile) return {};
    const vis: Record<string, boolean> = {};
    columns.forEach((col) => {
      const id = "accessorKey" in col ? (col.accessorKey as string) : (col as { id?: string }).id;
      if (id && (col.meta as { hideOnMobile?: boolean })?.hideOnMobile) {
        vis[id] = false;
      }
    });
    return vis;
  }, [isMobile, columns]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnFilters, globalFilter, columnVisibility },
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const q = row.original;
      const search = filterValue.toLowerCase();
      return (
        q.title.toLowerCase().includes(search) ||
        q.difficulty.toLowerCase().includes(search) ||
        q.pattern.some((p) => p.toLowerCase().includes(search)) ||
        q.companies.some((c) => c.name.toLowerCase().includes(search))
      );
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const tableRows = table.getRowModel().rows;

  const stats = useMemo<ProgressStats>(() => {
    const totals = { Easy: 0, Medium: 0, Hard: 0 };
    const done = { Easy: 0, Medium: 0, Hard: 0 };
    for (const row of tableRows) {
      const q = row.original;
      totals[q.difficulty]++;
      if (completed.has(q.id)) done[q.difficulty]++;
    }
    const total = tableRows.length;
    const totalDone = done.Easy + done.Medium + done.Hard;
    return { totals, done, total, totalDone };
  }, [tableRows, completed]);

  const pickRandom = useCallback(() => {
    const unsolved = table
      .getFilteredRowModel()
      .rows.filter((r) => !completed.has(r.original.id));
    if (unsolved.length === 0) return;
    const pick = unsolved[Math.floor(Math.random() * unsolved.length)];
    trackEvent("random_question", { question_id: pick.original.id, slug: pick.original.slug });
    window.open(
      `https://leetcode.com/problems/${pick.original.slug}/description/`,
      "_blank"
    );
  }, [table, completed]);

  const toggleShuffle = useCallback(() => {
    if (shuffleOrder) {
      setShuffleOrder(null);
      saveShuffleOrder(null);
      trackEvent("restore_order");
    } else {
      const rows = table.getFilteredRowModel().rows;
      const ids = rows.map((r) => r.original.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      setShuffleOrder(ids);
      saveShuffleOrder(ids);
      trackEvent("shuffle_questions");
    }
  }, [table, shuffleOrder]);

  const [resetConfirmGroup, setResetConfirmGroup] = useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = useState<"notes" | "questions" | "starred" | "reminders" | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = useCallback((group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);

  const resetGroupProgress = useCallback((difficulty: string) => {
    const ids = data.filter((q) => q.difficulty === difficulty).map((q) => q.id);
    setCompleted((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      saveCompleted(next);
      return next;
    });
    setNotes((prev) => {
      const next = { ...prev };
      ids.forEach((id) => delete next[id]);
      saveNotes(next);
      return next;
    });
    setSolvedDates((prev) => {
      const next = { ...prev };
      ids.forEach((id) => delete next[id]);
      saveSolvedDates(next);
      return next;
    });
    setReminders((prev) => {
      const next = { ...prev };
      ids.forEach((id) => delete next[id]);
      saveReminders(next);
      return next;
    });
    trackEvent("reset_group", { difficulty });
    setResetConfirmGroup(null);
    syncNow();
  }, [data, syncNow]);

  const clearAllNotes = useCallback(() => {
    setNotes({});
    saveNotes({});
    trackEvent("clear_all_notes");
    setClearConfirm(null);
    syncNow();
  }, [syncNow]);

  const clearAllQuestions = useCallback(() => {
    setCompleted(new Set());
    saveCompleted(new Set());
    setSolvedDates({});
    saveSolvedDates({});
    setReminders({});
    saveReminders({});
    trackEvent("clear_all_progress");
    setClearConfirm(null);
    syncNow();
  }, [syncNow]);

  const clearAllStarred = useCallback(() => {
    setStarred(new Set());
    saveStarred(new Set());
    trackEvent("clear_all_starred");
    setClearConfirm(null);
    syncNow();
  }, [syncNow]);

  const clearAllReminders = useCallback(() => {
    setReminders({});
    saveReminders({});
    trackEvent("clear_all_reminders");
    setClearConfirm(null);
    syncNow();
  }, [syncNow]);

  const exportProgress = useCallback(() => {
    const payload = { completed: [...completed], starred: [...starred], notes, solvedDates, reminders };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leetcode-patterns-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent("export_progress", { completed_count: completed.size, notes_count: Object.keys(notes).length });
  }, [completed, starred, notes, solvedDates, reminders]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const importProgress = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (Array.isArray(parsed.completed)) {
          const imported = new Set<number>(parsed.completed);
          setCompleted(imported);
          saveCompleted(imported);
        }
        if (Array.isArray(parsed.starred)) {
          const imported = new Set<number>(parsed.starred);
          setStarred(imported);
          saveStarred(imported);
        }
        if (parsed.notes && typeof parsed.notes === "object") {
          setNotes(parsed.notes);
          saveNotes(parsed.notes);
        }
        if (parsed.solvedDates && typeof parsed.solvedDates === "object") {
          setSolvedDates(parsed.solvedDates);
          saveSolvedDates(parsed.solvedDates);
        }
        if (parsed.reminders && typeof parsed.reminders === "object") {
          setReminders(parsed.reminders);
          saveReminders(parsed.reminders);
        }
        trackEvent("import_progress", { completed_count: parsed.completed?.length ?? 0, notes_count: parsed.notes ? Object.keys(parsed.notes).length : 0 });
        syncNow();
      } catch {}
    };
    reader.readAsText(file);
  }, [syncNow]);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (reviewTarget) { setReviewTarget(null); return; }
        if (clearConfirm) { setClearConfirm(null); return; }
        if (resetConfirmGroup) { setResetConfirmGroup(null); return; }
        if (editingNote) {
          const saved = notes[editingNote.id] ?? "";
          if (editingNote.draft !== saved) {
            setEditingNote({ ...editingNote, confirmDiscard: true });
          } else {
            setEditingNote(null);
          }
          return;
        }
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/" ) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "r") {
        pickRandom();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pickRandom, editingNote, notes, clearConfirm, resetConfirmGroup, reviewTarget]);

  // Track filter changes
  const activeDifficultyFilter = useMemo(
    () => (columnFilters.find((f) => f.id === "difficulty")?.value as string[])?.join(",") ?? "",
    [columnFilters]
  );
  const activePatternFilter = useMemo(
    () => (columnFilters.find((f) => f.id === "pattern")?.value as string[])?.join(",") ?? "",
    [columnFilters]
  );
  const activeCompanyFilterStr = useMemo(
    () => activeCompanyFilter.join(","),
    [activeCompanyFilter]
  );

  useEffect(() => {
    if (activeDifficultyFilter) trackEvent("filter_difficulty", { values: activeDifficultyFilter });
  }, [activeDifficultyFilter]);

  useEffect(() => {
    if (activePatternFilter) trackEvent("filter_pattern", { values: activePatternFilter });
  }, [activePatternFilter]);

  useEffect(() => {
    if (activeCompanyFilterStr) trackEvent("filter_company", { values: activeCompanyFilterStr });
  }, [activeCompanyFilterStr]);

  // Track search with debounce
  useEffect(() => {
    if (!globalFilter) return;
    const timer = setTimeout(() => {
      trackEvent("search", { query: globalFilter });
    }, 500);
    return () => clearTimeout(timer);
  }, [globalFilter]);

  // Track sorting
  useEffect(() => {
    if (sorting.length > 0) {
      trackEvent("sort_column", { column: sorting[0].id, direction: sorting[0].desc ? "desc" : "asc" });
    }
  }, [sorting]);

  const pct = stats.total > 0 ? Math.round((stats.totalDone / stats.total) * 100) : 0;

  const companySortActive = sorting.some((s) => s.id === "companies");
  const companySortDesc = sorting.find((s) => s.id === "companies")?.desc ?? true;

  const groupedRows = useMemo(() => {
    if (shuffleOrder) {
      const orderMap = new Map(shuffleOrder.map((id, i) => [id, i]));
      const sorted = [...tableRows].sort((a, b) => {
        const ai = orderMap.get(a.original.id) ?? Infinity;
        const bi = orderMap.get(b.original.id) ?? Infinity;
        return ai - bi;
      });
      return [{ key: null as string | null, rows: sorted }];
    }

    if (companySortActive && activeCompanyFilter.length === 1) {
      const slug = activeCompanyFilter[0];
      const sorted = [...tableRows].sort((a, b) => {
        const freqA = a.original.companies.find((c) => c.slug === slug)?.frequency ?? 0;
        const freqB = b.original.companies.find((c) => c.slug === slug)?.frequency ?? 0;
        return companySortDesc ? freqB - freqA : freqA - freqB;
      });
      return [{ key: null as string | null, rows: sorted }];
    }

    const groupMap = new Map<string, typeof tableRows>();
    for (const row of tableRows) {
      const key = row.original.difficulty;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(row);
    }

    return ["Easy", "Medium", "Hard"]
      .filter((k) => groupMap.has(k))
      .map((key) => ({ key: key as string | null, rows: groupMap.get(key)! }));
  }, [tableRows, shuffleOrder, companySortActive, companySortDesc, activeCompanyFilter]);

  type FlatItem =
    | { type: "header"; key: string; groupDone: number; total: number }
    | { type: "row"; row: (typeof tableRows)[number] };

  const flatItems = useMemo<FlatItem[]>(() => {
    const items: FlatItem[] = [];
    for (const group of groupedRows) {
      const isCollapsed = group.key !== null && collapsedGroups.has(group.key);
      const groupDone = group.rows.filter((r) => completed.has(r.original.id)).length;
      if (group.key !== null) {
        items.push({ type: "header", key: group.key, groupDone, total: group.rows.length });
      }
      if (!isCollapsed) {
        for (const row of group.rows) {
          items.push({ type: "row", row });
        }
      }
    }
    return items;
  }, [groupedRows, collapsedGroups, completed]);

  return (
    <div className="space-y-4">
      {/* Sticky: Progress + Filters */}
      <div className="z-(--z-sticky) -mx-3 space-y-4 sm:sticky sm:top-0 border-b border-rule bg-sheet px-3 pb-4 sm:-mx-6 sm:px-6">
      {/* Progress */}
      <ProgressBar stats={stats} pct={pct} />

      {/* Filters */}
      <FilterToolbar
        table={table}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        patterns={patterns}
        companies={companies}
        showStarredOnly={showStarredOnly}
        setShowStarredOnly={setShowStarredOnly}
        hideCompleted={hideCompleted}
        setHideCompleted={setHideCompleted}
        hidePatterns={hidePatterns}
        setHidePatterns={setHidePatterns}
        pickRandom={pickRandom}
        shuffleOrder={shuffleOrder}
        toggleShuffle={toggleShuffle}
        exportProgress={exportProgress}
        fileInputRef={fileInputRef}
        importProgress={importProgress}
        starred={starred}
        notes={notes}
        completed={completed}
        reminders={reminders}
        setClearConfirm={setClearConfirm}
        searchRef={searchRef}
        columnFilters={columnFilters}
        showDueOnly={showDueOnly}
        setShowDueOnly={setShowDueOnly}
      />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b-2 border-rule-2">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`whitespace-nowrap px-2 py-2 align-bottom font-medium text-muted select-none ${header.column.getCanSort() ? "cursor-pointer transition-colors duration-(--dur-micro) hover:text-ink focus-visible:-outline-offset-2" : ""}`}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    onClick={header.column.getToggleSortingHandler()}
                    onKeyDown={header.column.getCanSort() ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); header.column.getToggleSortingHandler()?.(e); } } : undefined}
                    tabIndex={header.column.getCanSort() ? 0 : undefined}
                    role={header.column.getCanSort() ? "button" : undefined}
                    aria-sort={header.column.getIsSorted() === "asc" ? "ascending" : header.column.getIsSorted() === "desc" ? "descending" : undefined}
                  >
                    <span className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() === "asc" && <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                      {header.column.getIsSorted() === "desc" && <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="[&>tr:first-child]:border-t-0">
            {flatItems.map((item, idx) => {
              if (item.type === "header") {
                const isCollapsed = collapsedGroups.has(item.key);
                return (
                  <GroupHeaderRow
                    key={`header-${item.key}`}
                    groupKey={item.key}
                    groupDone={item.groupDone}
                    total={item.total}
                    isCollapsed={isCollapsed}
                    toggleGroup={toggleGroup}
                    setResetConfirmGroup={setResetConfirmGroup}
                    colSpan={columns.length}
                    dataIndex={idx}
                  />
                );
              }
              const row = item.row;
              return (
                <QuestionRow
                  key={row.id}
                  row={row}
                  completed={completed}
                  toggleCompleted={toggleCompleted}
                  toggleStarred={toggleStarred}
                  dataIndex={idx}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Note Modal */}
      {editingNote && (
        <NoteModal
          editingNote={editingNote}
          setEditingNote={setEditingNote}
          updateNote={updateNote}
          notes={notes}
        />
      )}

      {/* Review Date Modal */}
      {reviewTarget && (
        <ReviewDateModal
          target={reviewTarget}
          onSelect={onReviewDateChange}
          onClear={reminders[reviewTarget.id] ? onReviewDateClear : undefined}
          onCancel={() => setReviewTarget(null)}
        />
      )}

      {/* Reset Confirmation Modal */}
      {resetConfirmGroup && (() => {
        const groupIds = data.filter((q) => q.difficulty === resetConfirmGroup).map((q) => q.id);
        const doneCount = groupIds.filter((id) => completed.has(id)).length;
        const noteCount = groupIds.filter((id) => notes[id]).length;
        return (
          <ConfirmModal
            title={`Reset ${resetConfirmGroup} progress`}
            message={
              <>
                This will clear {doneCount} completed question(s)
                {noteCount > 0 && ` and ${noteCount} note(s)`} in the{" "}
                <span className={`font-medium ${difficultyColor[resetConfirmGroup] ?? ""}`}>
                  {resetConfirmGroup}
                </span>{" "}
                group. This action cannot be undone.
              </>
            }
            confirmLabel="Reset"
            onConfirm={() => resetGroupProgress(resetConfirmGroup)}
            onCancel={() => setResetConfirmGroup(null)}
          />
        );
      })()}

      {/* Clear All Confirmation Modal */}
      {clearConfirm && (
        <ConfirmModal
          title={clearConfirm === "notes" ? "Clear all notes" : clearConfirm === "starred" ? "Clear all stars" : clearConfirm === "reminders" ? "Clear all reminders" : "Clear all progress"}
          message={
            clearConfirm === "notes"
              ? `This will delete ${Object.keys(notes).length} note(s). This action cannot be undone.`
              : clearConfirm === "starred"
                ? `This will unstar ${starred.size} question(s). This action cannot be undone.`
                : clearConfirm === "reminders"
                  ? `This will remove ${Object.keys(reminders).length} review reminder(s). This action cannot be undone.`
                  : `This will clear ${completed.size} completed question(s). This action cannot be undone.`
          }
          confirmLabel="Clear"
          onConfirm={clearConfirm === "notes" ? clearAllNotes : clearConfirm === "starred" ? clearAllStarred : clearConfirm === "reminders" ? clearAllReminders : clearAllQuestions}
          onCancel={() => setClearConfirm(null)}
        />
      )}

      {/* Migration Toast */}
      {migrationToast && (
        <div
          role="status"
          className={`toast ${toastFading ? "opacity-0" : "opacity-100"}`}
        >
          <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" /> {migrationToast}
        </div>
      )}
    </div>
  );
}
