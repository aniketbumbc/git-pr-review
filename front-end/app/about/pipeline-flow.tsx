"use client";

import { useEffect, useState } from "react";
import {
  CheckIcon,
  FileCodeIcon,
  GitPullRequestIcon,
  ListDashesIcon,
  PaperPlaneIcon,
  SparkleIcon,
} from "@/app/components/icons";

const STEP_DELAY_MS = 1600;

const PIPELINE_STEPS = [
  {
    label: "PR opened / pushed",
    detail: "GitHub webhook fires, or you trigger it manually from the dashboard.",
    icon: GitPullRequestIcon,
  },
  {
    label: "Fetch PR info",
    detail: "Title, state, head SHA, commit and file counts via Octokit.",
    icon: ListDashesIcon,
  },
  {
    label: "Fetch changed files",
    detail: "Every changed file's patch, additions and deletions, paginated.",
    icon: FileCodeIcon,
  },
  {
    label: "AI analysis",
    detail: "The OpenAI Agents SDK reviews the diff and returns a verdict.",
    icon: SparkleIcon,
  },
  {
    label: "Post review comment",
    detail: "The result is posted back onto the PR as a GitHub review.",
    icon: PaperPlaneIcon,
  },
  {
    label: "Save to database",
    detail: "Verdict, fixes, suggestions and step history are persisted.",
    icon: CheckIcon,
  },
] as const;

export function PipelineFlow() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % PIPELINE_STEPS.length);
    }, STEP_DELAY_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-2">
      {PIPELINE_STEPS.map((step, i) => {
        const Icon = step.icon;
        const isDone = i < activeIndex;
        const isActive = i === activeIndex;
        const isLast = i === PIPELINE_STEPS.length - 1;

        return (
          <div key={step.label} className="flex flex-none items-start">
            <div className="flex w-[140px] flex-col items-center text-center">
              <div
                className={`flex h-11 w-11 flex-none items-center justify-center rounded-full border-[1.5px] transition-all duration-500 ${
                  isDone
                    ? "border-accent-500 bg-accent-500/15 text-accent-400"
                    : isActive
                      ? "animate-pulse border-accent-500 bg-accent-500/10 text-accent-400 shadow-[0_0_0_6px_rgba(79,187,125,0.14)]"
                      : "border-dashed border-white/20 text-fg/35"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <span
                className={`mt-2.5 block text-[12.5px] font-medium transition-colors duration-500 ${
                  isActive || isDone ? "text-fg" : "text-fg/45"
                }`}
              >
                {step.label}
              </span>
              <span className="mt-0.5 block px-1 text-[11px] leading-snug text-fg/45">
                {step.detail}
              </span>
            </div>

            {!isLast && (
              <div className="mt-[21px] h-px w-8 flex-none sm:w-14">
                <div
                  className={`h-full w-full rounded-full transition-colors duration-500 ${
                    isDone ? "bg-accent-500/70" : "bg-white/10"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
