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
              In <span className="font-medium text-ink">2019</span>, as a broke college
              student who couldn&apos;t afford premium interview resources, I spent countless hours searching
              for free materials and teaching myself React to build <span className="font-medium text-ink">Leetcode Patterns</span>.
            </p>
            <p>
              I believe <span className="font-medium text-ink">everyone</span>&nbsp;deserves
              access to high-quality interview material - regardless of their financial situation. It&apos;s why I chose to make this website <a
                href="https://github.com/seanprashad/leetcode-patterns/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >free and open source</a>.
            </p>
            <p>
              Best of luck on your journey!
            </p>
            <p className="text-2xl italic text-ink">
              <a
                href="https://github.com/SeanPrashad"
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >Sean</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
