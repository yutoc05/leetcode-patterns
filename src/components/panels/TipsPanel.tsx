"use client";

import { useState, useCallback, useEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import { Lightbulb, X, Copy, Check } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

function formatApproach(text: string) {
  const parts = text.split(/(O\([^)]*\)|\bK\b)/g);
  return parts.map((part, i) =>
    /^O\(/.test(part) || /^\bK\b$/.test(part) ? (
      <code key={i} className="rounded-pill bg-sheet-2 px-1 py-0.5 font-outlier text-xs text-ink">{part}</code>
    ) : (
      part
    )
  );
}

const tipGroups = [
  { label: "Arrays & Strings", tips: [
    { condition: "If input array is sorted", approaches: ["Binary search", "Two pointers"] },
    { condition: "If need O(1) lookup", approaches: ["Hash table", "Hash set"] },
    { condition: "If must solve in-place", approaches: ["Swap corresponding values", "Store multiple values in the same pointer"] },
    { condition: "If asked for common strings", approaches: ["Map", "Trie"] },
    { condition: "If asked to count bits or use XOR", approaches: ["Bit manipulation"] },
  ]},
  { label: "Subarrays & Sequences", tips: [
    { condition: "If asked for max/min subarray/subset", approaches: ["Dynamic programming", "Sliding window"] },
    { condition: "If asked for sliding window max/min", approaches: ["Monotonic queue"] },
    { condition: "If asked for next greater/smaller element", approaches: ["Monotonic stack"] },
    { condition: "If need range sum/frequency queries", approaches: ["Prefix sum", "Binary indexed tree", "Segment tree"] },
  ]},
  { label: "Trees & Graphs", tips: [
    { condition: "If given a tree", approaches: ["DFS", "BFS"] },
    { condition: "If given a graph", approaches: ["DFS", "BFS", "Union-Find"] },
    { condition: "If given a matrix", approaches: ["BFS", "DFS", "Dynamic programming"] },
    { condition: "If asked for connectivity/grouping", approaches: ["Union-Find", "DFS"] },
    { condition: "If asked for ordering/scheduling", approaches: ["Topological sort"] },
  ]},
  { label: "Linked Lists & Stacks", tips: [
    { condition: "If given a linked list", approaches: ["Two pointers"] },
    { condition: "If recursion is banned", approaches: ["Stack"] },
  ]},
  { label: "Sorting & Intervals", tips: [
    { condition: "If asked for top/least K items", approaches: ["Heap", "Quickselect", "Bucket sort"] },
    { condition: "If asked to merge sorted lists/intervals", approaches: ["Merge sort", "Heap"] },
    { condition: "If asked for overlapping intervals", approaches: ["Sorting", "Sweep line"] },
    { condition: "If given a stream of data", approaches: ["Heap", "Design"] },
  ]},
  { label: "Optimization", tips: [
    { condition: "If asked for all permutations/subsets", approaches: ["Backtracking"] },
    { condition: "If need to count/divide optimally", approaches: ["Greedy", "Dynamic programming"] },
  ]},
  { label: "General", tips: [
    { condition: "Else", approaches: ["Map/Set for O(1) time & O(n) space", "Sort input for O(nlogn) time and O(1) space"] },
  ]},
];

export default function TipsPanel() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastFading, setToastFading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); trackEvent("panel_close", { panel: "tips" }); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  const copyToClipboard = useCallback(() => {
    const text = tipGroups
      .map((group) => {
        const rows = group.tips
          .map((tip) => `  ${tip.condition} → ${tip.approaches.join(", ")}`)
          .join("\n");
        return `${group.label}\n${rows}`;
      })
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setToastFading(false);
    trackEvent("copy_tips");
  }, []);

  useEffect(() => {
    if (!copied) return;
    const fadeTimer = setTimeout(() => setToastFading(true), 1500);
    const removeTimer = setTimeout(() => { setCopied(false); setToastFading(false); }, 2200);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, [copied]);

  return (
    <>
      {/* Opener – sits in the masthead's reference row in page.tsx */}
      <button
        type="button"
        onClick={() => { setOpen(true); trackEvent("panel_open", { panel: "tips" }); }}
        className="btn btn-quiet"
        aria-label="Open tips"
      >
        <Lightbulb className="h-4 w-4" aria-hidden="true" />
        Helpful Tips
      </button>

      {/* Panel */}
      <div
        className={`fixed left-0 top-0 z-(--z-modal) flex h-full w-80 flex-col border-r border-rule-2 bg-sheet transition-[transform,visibility] duration-(--dur-long) ease-out sm:w-96 ${
          open ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b-2 border-ink py-2 pl-6 pr-3">
          <h2 className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" aria-hidden="true" />
            Helpful Tips
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={copyToClipboard}
              className="btn btn-quiet btn-icon"
              title="Copy to clipboard"
              aria-label="Copy to clipboard"
            >
              {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); trackEvent("panel_close", { panel: "tips" }); }}
              aria-label="Close tips"
              className="btn btn-quiet btn-icon"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <p className="mb-4 text-sm text-muted">
            Based on the problem constraints, use these heuristics to identify possible approaches when unsure.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-rule-2">
                <th className="pb-2 text-left font-medium text-muted">Condition</th>
                <th className="pb-2 text-left font-medium text-muted">Approach</th>
              </tr>
            </thead>
            <tbody>
              {tipGroups.map((group) => (
                <Fragment key={group.label}>
                  <tr>
                    <td colSpan={2} className="pt-6 pb-1 font-display text-sm font-semibold text-ink">
                      {group.label}
                    </td>
                  </tr>
                  {group.tips.map((tip) => (
                    <tr key={tip.condition} className="border-b border-rule">
                      <td className="py-2 pr-3 align-top text-ink">{formatApproach(tip.condition)}</td>
                      <td className="py-2 align-top text-ink-2">
                        {tip.approaches.map((a, i) => (
                          <span key={i}>{i > 0 && ", "}{formatApproach(a)}</span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Copy toast – portalled to body so it centres on the viewport */}
      {copied && createPortal(
        <div
          role="status"
          className={`toast ${toastFading ? "opacity-0" : "opacity-100"}`}
        >
          <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" /> Tips copied to clipboard
        </div>,
        document.body
      )}
    </>
  );
}
