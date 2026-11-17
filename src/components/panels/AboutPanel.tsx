"use client";

import { useState, useEffect } from "react";
import { Info, X } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export default function AboutPanel() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); trackEvent("panel_close", { panel: "about" }); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      {/* Opener – sits in the masthead's reference row in page.tsx */}
      <button
        type="button"
        onClick={() => { setOpen(true); trackEvent("panel_open", { panel: "about" }); }}
        className="btn btn-quiet"
        aria-label="Open about"
      >
        <Info className="h-4 w-4" aria-hidden="true" />
        About
      </button>

      {/* Panel */}
      <div
        className={`fixed left-0 top-0 z-(--z-modal) flex h-full w-80 flex-col border-r border-rule-2 bg-sheet transition-[transform,visibility] duration-(--dur-long) ease-out ${
          open ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b-2 border-ink py-2 pl-6 pr-3">
          <h2 className="flex items-center gap-2">
            <Info className="h-4 w-4" aria-hidden="true" />
            About
          </h2>
          <button
            type="button"
            onClick={() => { setOpen(false); trackEvent("panel_close", { panel: "about" }); }}
            aria-label="Close about"
            className="btn btn-quiet btn-icon"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-4 text-md leading-relaxed text-ink-2">
            <p>
              <span className="font-medium text-ink">Yeetcode Patterns</span> is a curated list of LeetCode questions grouped by the pattern that solves them, so you practise recognising patterns instead of tackling problems at random.
            </p>
            <p>
              Browse <span className="font-medium text-ink">All Questions</span> with filters for difficulty, pattern and company, or follow the <span className="font-medium text-ink">Beginner</span> and <span className="font-medium text-ink">Experienced</span> roadmaps. Tick questions off as you solve them, keep notes, and set review dates to come back to them.
            </p>
            <p>
              Your progress is saved in this browser. Sign in with GitHub to sync it across devices.
            </p>
            <p>
              The site is <a
                href="https://github.com/yutoc05/yeetcode-patterns"
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >open source</a> and free to use. Good luck with your interviews.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
