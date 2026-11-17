"use client";

import { useState, useEffect } from "react";
import { Heart, X } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const sources = [
  {
    title: "Blind Curated 75 Question List",
    url: "https://www.teamblind.com/post/New-Year-Gift---Curated-List-of-Top-100-LeetCode-Questions-to-Save-Your-Time-OaM1orEU",
    image: "/images/Blind.png",
  },
  {
    title: "Grokking the Coding Interview: Patterns for Coding Questions",
    url: "https://www.designgurus.io/course/grokking-the-coding-interview",
    image: "/images/DesignGurus.png",
  },
  {
    title: "14 Patterns to Ace Any Coding Interview Question",
    url: "https://hackernoon.com/14-patterns-to-ace-any-coding-interview-question-c5bb3357f6ed",
    image: "/images/Hackernoon.png",
  },
];

export default function AcknowledgementsPanel() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); trackEvent("panel_close", { panel: "acknowledgements" }); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      {/* Opener – sits in the masthead's reference row in page.tsx */}
      <button
        type="button"
        onClick={() => { setOpen(true); trackEvent("panel_open", { panel: "acknowledgements" }); }}
        className="btn btn-quiet"
        aria-label="Open acknowledgements"
      >
        <Heart className="h-4 w-4" aria-hidden="true" />
        Acknowledgements
      </button>

      {/* Panel */}
      <div
        className={`fixed left-0 top-0 z-(--z-modal) flex h-full w-80 flex-col border-r border-rule-2 bg-sheet transition-[transform,visibility] duration-(--dur-long) ease-out ${
          open ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b-2 border-ink py-2 pl-6 pr-3">
          <h2 className="flex items-center gap-2">
            <Heart className="h-4 w-4 shrink-0" aria-hidden="true" />
            Acknowledgements
          </h2>
          <button
            type="button"
            onClick={() => { setOpen(false); trackEvent("panel_close", { panel: "acknowledgements" }); }}
            aria-label="Close acknowledgements"
            className="btn btn-quiet btn-icon"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <p className="mb-6 text-sm text-muted">
            Leetcode Patterns wouldn&apos;t exist without the following resources:
          </p>
          <ul className="space-y-6">
            {sources.map((source) => (
              <li key={source.title}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${source.image}`}
                    alt={source.title}
                    width={256}
                    height={256}
                    className="h-32 w-full object-cover outline outline-1 -outline-offset-1 outline-rule-2"
                  />
                  <span className="link mt-2 block text-md leading-snug group-hover:decoration-2">
                    {source.title}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
