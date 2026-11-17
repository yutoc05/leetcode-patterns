import { useState, useMemo, useEffect, useRef } from "react";
import { type Table } from "@tanstack/react-table";
import { Question } from "@/types/question";
import { RotateCcw, Shuffle, Download, Upload, Trash2, StarOff, Dices, ListOrdered, CalendarOff } from "lucide-react";
import type { Reminder } from "@/lib/reminders";
import { trackEvent } from "@/lib/analytics";

const difficultyColor: Record<string, string> = {
  Easy: "text-easy",
  Medium: "text-medium",
  Hard: "text-hard",
};

interface FilterToolbarProps {
  table: Table<Question>;
  globalFilter: string;
  setGlobalFilter: (value: string) => void;
  patterns: string[];
  companies: [string, string][];
  showStarredOnly: boolean;
  setShowStarredOnly: (value: boolean) => void;
  hideCompleted: boolean;
  setHideCompleted: (value: boolean) => void;
  hidePatterns: boolean;
  setHidePatterns: (value: boolean) => void;
  showDueOnly: boolean;
  setShowDueOnly: (value: boolean) => void;
  pickRandom: () => void;
  shuffleOrder: number[] | null;
  toggleShuffle: () => void;
  exportProgress: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  importProgress: (file: File) => void;
  starred: Set<number>;
  notes: Record<number, string>;
  completed: Set<number>;
  reminders: Record<number, Reminder>;
  setClearConfirm: (value: "notes" | "questions" | "starred" | "reminders" | null) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  columnFilters: { id: string; value: unknown }[];
}

export default function FilterToolbar({
  table,
  globalFilter,
  setGlobalFilter,
  patterns,
  companies,
  showStarredOnly,
  setShowStarredOnly,
  hideCompleted,
  setHideCompleted,
  hidePatterns,
  setHidePatterns,
  showDueOnly,
  setShowDueOnly,
  pickRandom,
  shuffleOrder,
  toggleShuffle,
  exportProgress,
  fileInputRef,
  importProgress,
  starred,
  notes,
  completed,
  reminders,
  setClearConfirm,
  searchRef,
  columnFilters,
}: FilterToolbarProps) {
  const difficultyFilter = useMemo(
    () => (table.getColumn("difficulty")?.getFilterValue() as string[]) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, columnFilters]
  );
  const [difficultyDropdownOpen, setDifficultyDropdownOpen] = useState(false);
  const difficultyDropdownRef = useRef<HTMLDivElement>(null);

  const patternFilter = useMemo(
    () => (table.getColumn("pattern")?.getFilterValue() as string[]) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, columnFilters]
  );
  const [patternDropdownOpen, setPatternDropdownOpen] = useState(false);
  const [patternSearch, setPatternSearch] = useState("");
  const patternDropdownRef = useRef<HTMLDivElement>(null);

  const filteredPatterns = useMemo(() => {
    const list = patternSearch
      ? patterns.filter((p) =>
          p.toLowerCase().includes(patternSearch.toLowerCase())
        )
      : patterns;
    return [...list].sort((a, b) => {
      const aChecked = patternFilter.includes(a);
      const bChecked = patternFilter.includes(b);
      if (aChecked !== bChecked) return aChecked ? -1 : 1;
      return 0;
    });
  }, [patterns, patternSearch, patternFilter]);

  const companyFilter = useMemo(
    () => (table.getColumn("companies")?.getFilterValue() as string[]) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, columnFilters]
  );
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const companyDropdownRef = useRef<HTMLDivElement>(null);

  const filteredCompanies = useMemo(() => {
    const list = companySearch
      ? companies.filter(([, name]) =>
          name.toLowerCase().includes(companySearch.toLowerCase())
        )
      : companies;
    return [...list].sort((a, b) => {
      const aChecked = companyFilter.includes(a[0]);
      const bChecked = companyFilter.includes(b[0]);
      if (aChecked !== bChecked) return aChecked ? -1 : 1;
      return 0;
    });
  }, [companies, companySearch, companyFilter]);

  useEffect(() => {
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (difficultyDropdownRef.current && !difficultyDropdownRef.current.contains(e.target as Node)) {
        setDifficultyDropdownOpen(false);
      }
      if (patternDropdownRef.current && !patternDropdownRef.current.contains(e.target as Node)) {
        setPatternDropdownOpen(false);
        setPatternSearch("");
      }
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(e.target as Node)) {
        setCompanyDropdownOpen(false);
        setCompanySearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-3 font-display text-sm">
      <div className="relative">
        <input
          ref={searchRef}
          type="text"
          placeholder="Search"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          aria-label="Search questions"
          className="field w-44 pr-8"
        />
        <kbd className="kbd pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">/</kbd>
      </div>
      <div ref={difficultyDropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setDifficultyDropdownOpen((o) => !o)}
          aria-expanded={difficultyDropdownOpen}
          aria-haspopup="listbox"
          className="btn"
        >
          <span>
            {difficultyFilter.length === 0
              ? "All Difficulties"
              : `Difficulty (${difficultyFilter.length})`}
          </span>
          <svg className="h-3 w-3 shrink-0 text-muted" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 5l3 3 3-3" />
          </svg>
        </button>
        {difficultyDropdownOpen && (
          <div className="popover absolute left-0 top-full z-(--z-dropdown) mt-2 w-48">
            {difficultyFilter.length > 0 && (
              <button
                onClick={() => {
                  table.getColumn("difficulty")?.setFilterValue(undefined);
                }}
                className="option w-full border-b border-rule text-left text-sm font-medium text-accent"
              >
                Clear all ({difficultyFilter.length})
              </button>
            )}
            <div className="py-1">
              {(["Easy", "Medium", "Hard"] as const).map((d) => (
                <label
                  key={d}
                  className="option"
                >
                  <input
                    type="checkbox"
                    checked={difficultyFilter.includes(d)}
                    onChange={() => {
                      const next = difficultyFilter.includes(d)
                        ? difficultyFilter.filter((x) => x !== d)
                        : [...difficultyFilter, d];
                      table
                        .getColumn("difficulty")
                        ?.setFilterValue(next.length ? next : undefined);
                    }}
                    className="check"
                  />
                  <span className={`font-medium ${difficultyColor[d]}`}>{d}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
      <div ref={patternDropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setPatternDropdownOpen((o) => !o)}
          aria-expanded={patternDropdownOpen}
          aria-haspopup="listbox"
          className="btn"
        >
          <span>
            {patternFilter.length === 0
              ? "All Patterns"
              : `Patterns (${patternFilter.length})`}
          </span>
          <svg className="h-3 w-3 shrink-0 text-muted" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 5l3 3 3-3" />
          </svg>
        </button>
        {patternDropdownOpen && (
          <div className="popover absolute left-0 top-full z-(--z-dropdown) mt-2 w-64">
            <div className="border-b border-rule p-2">
              <input
                type="text"
                placeholder="Search patterns..."
                value={patternSearch}
                onChange={(e) => setPatternSearch(e.target.value)}
                className="field w-full"
                autoFocus
              />
            </div>
            {patternFilter.length > 0 && (
              <button
                onClick={() => {
                  table.getColumn("pattern")?.setFilterValue(undefined);
                  setPatternSearch("");
                }}
                className="option w-full border-b border-rule text-left text-sm font-medium text-accent"
              >
                Clear all ({patternFilter.length})
              </button>
            )}
            <div className="max-h-52 overflow-y-auto py-1">
              {filteredPatterns.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted">No patterns found</p>
              ) : (
                filteredPatterns.map((p) => (
                  <label
                    key={p}
                    className="option"
                  >
                    <input
                      type="checkbox"
                      checked={patternFilter.includes(p)}
                      onChange={() => {
                        const next = patternFilter.includes(p)
                          ? patternFilter.filter((x) => x !== p)
                          : [...patternFilter, p];
                        table
                          .getColumn("pattern")
                          ?.setFilterValue(next.length ? next : undefined);
                      }}
                      className="check"
                    />
                    {p}
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      <div ref={companyDropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setCompanyDropdownOpen((o) => !o)}
          aria-expanded={companyDropdownOpen}
          aria-haspopup="listbox"
          className="btn"
        >
          <span>
            {companyFilter.length === 0
              ? "All Companies"
              : `Companies (${companyFilter.length})`}
          </span>
          <svg className="h-3 w-3 shrink-0 text-muted" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 5l3 3 3-3" />
          </svg>
        </button>
        {companyDropdownOpen && (
          <div className="popover absolute left-0 top-full z-(--z-dropdown) mt-2 w-64">
            <div className="border-b border-rule p-2">
              <input
                type="text"
                placeholder="Search companies..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="field w-full"
                autoFocus
              />
            </div>
            {companyFilter.length > 0 && (
              <button
                onClick={() => {
                  table.getColumn("companies")?.setFilterValue(undefined);
                  setCompanySearch("");
                }}
                className="option w-full border-b border-rule text-left text-sm font-medium text-accent"
              >
                Clear all ({companyFilter.length})
              </button>
            )}
            <div className="max-h-52 overflow-y-auto py-1">
              {filteredCompanies.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted">No companies found</p>
              ) : (
                filteredCompanies.map(([slug, name]) => (
                  <label
                    key={slug}
                    className="option"
                  >
                    <input
                      type="checkbox"
                      checked={companyFilter.includes(slug)}
                      onChange={() => {
                        const next = companyFilter.includes(slug)
                          ? companyFilter.filter((s) => s !== slug)
                          : [...companyFilter, slug];
                        table
                          .getColumn("companies")
                          ?.setFilterValue(next.length ? next : undefined);
                      }}
                      className="check"
                    />
                    {name}
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2">
        {([
          { label: "Starred only", checked: showStarredOnly, onChange: (v: boolean) => { setShowStarredOnly(v); trackEvent("show_starred_only", { enabled: v }); } },
          { label: "Due for review", checked: showDueOnly, onChange: (v: boolean) => { setShowDueOnly(v); trackEvent("show_due_only", { enabled: v }); } },
          { label: "Hide completed", checked: hideCompleted, onChange: (v: boolean) => { setHideCompleted(v); trackEvent("hide_completed", { enabled: v }); } },
          { label: "Hide patterns", checked: hidePatterns, onChange: (v: boolean) => { setHidePatterns(v); trackEvent("hide_patterns", { enabled: v }); } },
        ] as const).map((opt) => (
          <label key={opt.label} className={`flex min-h-9 cursor-pointer items-center gap-2 whitespace-nowrap font-medium transition-colors duration-(--dur-micro) select-none hover:text-ink ${opt.checked ? "text-ink" : "text-ink-2"}`}>
            <input
              type="checkbox"
              checked={opt.checked}
              onChange={(e) => opt.onChange(e.target.checked)}
              className="check"
            />
            {opt.label}
          </label>
        ))}
      </div>
      {/* Actions: their own row under the filters */}
      <div className="-ml-3 flex basis-full flex-wrap items-center gap-x-2 gap-y-1">
      {/* Random & Shuffle */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={pickRandom}
          className="btn btn-quiet"
        >
          <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
          Random
          <kbd className="kbd">r</kbd>
        </button>
        <button
          type="button"
          onClick={toggleShuffle}
          aria-pressed={!!shuffleOrder}
          className="btn btn-quiet"
        >
          {shuffleOrder ? <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" /> : <Dices className="h-3.5 w-3.5" aria-hidden="true" />}
          {shuffleOrder ? "Unshuffle" : "Shuffle"}
        </button>
      </div>
      {/* Import & Export */}
      <div className="flex items-center gap-1 border-l border-rule pl-2">
        <button
          type="button"
          onClick={exportProgress}
          className="btn btn-quiet"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Export
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-quiet"
        >
          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importProgress(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* Clear */}
      {(starred.size > 0 || Object.keys(notes).length > 0 || completed.size > 0 || Object.keys(reminders).length > 0) && (
        <div className="flex items-center gap-1 border-l border-rule pl-2">
          {starred.size > 0 && (
            <button
              onClick={() => setClearConfirm("starred")}
              type="button"
              className="btn btn-quiet text-muted hover:text-error"
            >
              <StarOff className="h-3.5 w-3.5" aria-hidden="true" />
              Stars
            </button>
          )}
          {Object.keys(notes).length > 0 && (
            <button
              onClick={() => setClearConfirm("notes")}
              type="button"
              className="btn btn-quiet text-muted hover:text-error"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Notes
            </button>
          )}
          {Object.keys(reminders).length > 0 && (
            <button
              onClick={() => setClearConfirm("reminders")}
              type="button"
              className="btn btn-quiet text-muted hover:text-error"
            >
              <CalendarOff className="h-3.5 w-3.5" aria-hidden="true" />
              Reminders
            </button>
          )}
          {completed.size > 0 && (
            <button
              onClick={() => setClearConfirm("questions")}
              type="button"
              className="btn btn-quiet text-muted hover:text-error"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Progress
            </button>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
