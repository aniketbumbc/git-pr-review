"use client";

import { useState } from "react";
import { FileCodeIcon, ListDashesIcon, SparkleIcon } from "@/app/components/icons";
import type { ReviewDetail } from "./mock-data";
import { ReviewTab } from "./review-tab";
import { RunTab } from "./run-tab";
import { FilesTab } from "./files-tab";
import { ReviewSidebar } from "./review-sidebar";

type TabKey = "review" | "run" | "files";

const TAB_DEFS: { key: TabKey; label: string; icon: typeof SparkleIcon }[] = [
  { key: "review", label: "Review", icon: SparkleIcon },
  { key: "run", label: "Run timeline", icon: ListDashesIcon },
  { key: "files", label: "Files", icon: FileCodeIcon },
];

export function ReviewDetailView({ review }: { review: ReviewDetail }) {
  const [tab, setTab] = useState<TabKey>("review");

  const counts: Record<TabKey, string> = {
    review: "",
    run: "5",
    files: String(review.changedFilesCount),
  };
  const TABS = TAB_DEFS.map((t) => ({ ...t, count: counts[t.key] }));

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

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_296px]">
        <div className="min-w-0">
          {tab === "review" && <ReviewTab review={review} />}
          {tab === "run" && <RunTab reviewId={review.id} />}
          {tab === "files" && <FilesTab review={review} onGoToReview={() => setTab("review")} />}
        </div>

        <ReviewSidebar review={review} onGoToRun={() => setTab("run")} />
      </div>
    </div>
  );
}
