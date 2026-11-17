"use client";

import { useState, useEffect, useSyncExternalStore, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { TableProperties, Map, Trophy, Repeat } from "lucide-react";
import QuestionsTable from "@/components/questions/QuestionsTable";
import RoadmapView from "@/components/roadmaps/RoadmapView";
import RevisionView from "@/components/revision/RevisionView";
import { useDueCount } from "@/lib/revision/useDueCount";
import { Question } from "@/types/question";
import { beginnerRoadmap, experiencedRoadmap } from "@/data/roadmaps";
import { trackEvent } from "@/lib/analytics";

type View = "table" | "beginner" | "experienced" | "revision";

const VIEW_KEY = "leetcode-patterns-view";

const views: { id: View; label: string; icon: typeof TableProperties; description: string }[] = [
  { id: "table", label: "All Questions", icon: TableProperties, description: "Browse all questions with filters" },
  { id: "beginner", label: "Beginner Roadmap", icon: Map, description: "Structured path for newcomers" },
  { id: "experienced", label: "Experienced Roadmap", icon: Trophy, description: "Must-know problems for experienced engineers" },
  { id: "revision", label: "Revision", icon: Repeat, description: "Review solved questions when they're due" },
];

function isValidView(v: string | null): v is View {
  return v !== null && views.some((view) => view.id === v);
}

export default function ViewSwitcher({
  questions,
  updatedDate,
}: {
  questions: Question[];
  updatedDate: string;
}) {
  const searchParams = useSearchParams();
  const dueCount = useDueCount(questions);

  const paramView = searchParams.get("view");

  const storedView = useSyncExternalStore(
    () => () => {},
    () => {
      if (isValidView(paramView)) return paramView;
      const stored = localStorage.getItem(VIEW_KEY) as View | null;
      return stored && isValidView(stored) ? stored : "table";
    },
    () => (isValidView(paramView) ? paramView : "table"),
  );

  const [activeView, setActiveView] = useState<View>(storedView);
  const [displayedView, setDisplayedView] = useState<View>(storedView);
  const [fading, setFading] = useState(false);
  const pendingView = useRef<View | null>(null);

  const switchView = useCallback((view: View) => {
    setActiveView(view);
    localStorage.setItem(VIEW_KEY, view);
    const params = new URLSearchParams(window.location.search);
    if (view === "table") {
      params.delete("view");
    } else {
      params.set("view", view);
    }
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    trackEvent("switch_view", { view });

    pendingView.current = view;
    setFading(true);
  }, []);

  useEffect(() => {
    if (!fading || pendingView.current === null) return;
    const timeout = setTimeout(() => {
      if (pendingView.current !== null) {
        setDisplayedView(pendingView.current);
        pendingView.current = null;
        setFading(false);
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [fading]);

  const handleTransitionEnd = useCallback(() => {
    if (fading && pendingView.current !== null) {
      setDisplayedView(pendingView.current);
      pendingView.current = null;
      setFading(false);
    }
  }, [fading]);

  return (
    <>
      {/* View tabs: the active one is cut from the sheet below */}
      <div className="flex overflow-x-auto border-b-2 border-ink">
        {views.map((v) => {
          const Icon = v.icon;
          const isActive = activeView === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => switchView(v.id)}
              aria-pressed={isActive}
              aria-label={v.id === "revision" && dueCount > 0 ? `${v.label}, ${dueCount} due` : undefined}
              className="tab"
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{v.label}</span>
              {v.id === "revision" && dueCount > 0 && (
                <span className="font-outlier text-sm text-muted tabular-nums" aria-hidden="true">{dueCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* View content, printed on the sheet */}
      <div
        className={`bg-sheet px-3 pb-10 transition-opacity duration-150 sm:px-6 ${fading ? "opacity-0" : "opacity-100"}`}
        onTransitionEnd={handleTransitionEnd}
      >
        {displayedView === "table" && (
          <QuestionsTable data={questions} updatedDate={updatedDate} />
        )}
        {displayedView === "beginner" && (
          <RoadmapView roadmap={beginnerRoadmap} questions={questions} />
        )}
        {displayedView === "experienced" && (
          <RoadmapView roadmap={experiencedRoadmap} questions={questions} />
        )}
        {displayedView === "revision" && (
          <RevisionView questions={questions} />
        )}
      </div>
    </>
  );
}
