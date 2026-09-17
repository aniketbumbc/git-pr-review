"use client";

import { useState } from "react";
import { FileCodeIcon, ListDashesIcon, SparkleIcon } from "@/app/components/icons";
import type { ReviewDetail } from "./mock-data";
import { ReviewTab } from "./review-tab";
import { RunTab } from "./run-tab";
import { FilesTab } from "./files-tab";
import { ReviewSidebar } from "./review-sidebar";

type TabKey = "review" | "run" | "files";

const TABS: { key: TabKey; label: string; icon: typeof SparkleIcon; count: string }[] = [
  { key: "review", label: "Review", icon: SparkleIcon, count: "" },
  { key: "run", label: "Run timeline", icon: ListDashesIcon, count: "4" },
  { key: "files", label: "Files", icon: FileCodeIcon, count: "8" },
];

export function ReviewDetailView({ review }: { review: ReviewDetail }) {
  const [tab, setTab] = useState<TabKey>("review");

  return (
    <div>
      <div className="mb-6 flex gap-0.5">
        {TABS.map((t) => {
          const active = t.key === tab;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={
                active
                  ? "flex items-center gap-2 rounded-t-md border-0 border-b px-3.5 py-2 text-[13.5px] font-medium border-accent-500 bg-accent-500/10 text-accent-200"
                  : "flex items-center gap-2 rounded-t-md border-0 border-b border-transparent px-3.5 py-2 text-[13.5px] font-medium text-fg/55 transition-colors hover:text-fg"
              }
            >
              <Icon className={`h-4 w-4 ${active ? "text-accent-500" : ""}`} />
              {t.label}
              {t.count && (
                <span className="font-mono text-[11px] opacity-70">{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-start gap-8">
        <div className="min-w-0 flex-[1_1_560px]">
          {tab === "review" && <ReviewTab review={review} />}
          {tab === "run" && <RunTab review={review} />}
          {tab === "files" && <FilesTab review={review} onGoToReview={() => setTab("review")} />}
        </div>

        <ReviewSidebar review={review} onGoToRun={() => setTab("run")} />
      </div>
    </div>
  );
}
