import { useState } from "react";
import { today } from "@/lib/reminders";

const PRESETS = [
  { label: "Tomorrow", days: 1 },
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface ReviewDateTarget {
  id: number;
  title: string;
}

export default function ReviewDateModal({
  target,
  onSelect,
  onClear,
  onCancel,
}: {
  target: ReviewDateTarget;
  onSelect: (id: number, date: string) => void;
  onClear?: (id: number) => void;
  onCancel: () => void;
}) {
  const todayStr = today();
  const [customDate, setCustomDate] = useState("");

  return (
    <div
      className="fixed inset-0 z-(--z-modal) flex items-center justify-center bg-scrim"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={`Set review date for ${target.title}`}
    >
      <div
        className="dialog mx-4 w-full max-w-64 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-md">Review Date</h2>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-quiet btn-icon -mr-2 text-muted hover:text-ink"
            aria-label="Close"
          >
            <svg className="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="-mx-4 mb-3 flex flex-col">
          {PRESETS.map((p) => {
            const date = addDays(todayStr, p.days);
            return (
              <button
                type="button"
                key={p.days}
                onClick={() => onSelect(target.id, date)}
                className="option justify-between px-4 font-display text-sm font-medium text-ink"
              >
                <span>{p.label}</span>
                <span className="text-xs font-normal text-muted tabular-nums">
                  {new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </button>
            );
          })}
        </div>

        <div className="border-t border-rule pt-3">
          <div className="flex gap-2">
            <input
              type="date"
              min={todayStr}
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              aria-label="Custom review date"
              className="field min-w-0 flex-1 px-2"
            />
            <button
              onClick={() => { if (customDate) onSelect(target.id, customDate); }}
              type="button"
              disabled={!customDate}
              className="btn btn-primary"
            >
              Set
            </button>
          </div>
        </div>

        {onClear && (
          <div className="-mx-4 mt-3 -mb-4 border-t border-rule">
            <button
              type="button"
              onClick={() => onClear(target.id)}
              className="option w-full justify-center font-display text-sm font-medium text-error"
            >
              Clear review date
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
