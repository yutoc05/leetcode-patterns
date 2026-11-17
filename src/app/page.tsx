import { Suspense } from "react";
import { MessageSquarePlus } from "lucide-react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import GitHubLink from "@/components/layout/GitHubLink";
import UserMenu from "@/components/layout/UserMenu";
import Logo from "@/components/layout/Logo";
import ViewSwitcher from "@/components/layout/ViewSwitcher";
import AboutPanel from "@/components/panels/AboutPanel";
import AcknowledgementsPanel from "@/components/panels/AcknowledgementsPanel";
import TipsPanel from "@/components/panels/TipsPanel";
import questionsJson from "@/data/questions.json";
import { QuestionsData } from "@/types/question";

const { data: questions } = questionsJson as QuestionsData;

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-(--container) px-(--gutter) pb-16">
      <header className="grid gap-x-10 gap-y-6 pt-10 pb-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0">
          <h1>
            <Logo />
          </h1>
          <p className="mt-3 text-md text-ink-2">
            by{" "}
            <a
              href="https://github.com/yutoc05"
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              Yuto Chau
            </a>
            {", est. 2026"}
          </p>
          <p className="mt-2 max-w-[60ch] text-lg leading-snug text-ink">
            A collection of {questions.length} questions grouped by pattern to help you prepare for coding interviews.
          </p>
          {/* Reference drawers: each button opens its own fixed panel */}
          <nav aria-label="Reference" className="-ml-3 mt-4 flex flex-wrap items-center gap-x-1 gap-y-2">
            <AboutPanel />
            <TipsPanel />
            <AcknowledgementsPanel />
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <GitHubLink />
          <span className="group/fb relative">
            <a
              href="https://github.com/yutoc05/yeetcode-patterns/issues/new/choose"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Feedback"
              className="btn btn-icon"
            >
              <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
            </a>
            <span className="tip left-1/2 top-full mt-2 -translate-x-1/2 group-hover/fb:block group-hover/fb:delay-800 group-focus-within/fb:block">
              Feedback
            </span>
          </span>
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>
      <Suspense>
        <ViewSwitcher
          questions={questions}
          updatedDate={questionsJson.updated}
        />
      </Suspense>
    </div>
  );
}
