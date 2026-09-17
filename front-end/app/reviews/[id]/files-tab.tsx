"use client";

import { useState } from "react";
import { ChevronRightIcon, FileDashedIcon } from "@/app/components/icons";
import { VerdictBadge } from "@/app/dashboard/verdict-badge";
import type { ReviewDetail } from "./mock-data";

const LINE_STYLES = {
  add: "bg-accent-500/[0.16] text-accent-200",
  del: "bg-white/[0.07] text-fg/45",
  ctx: "text-fg/60",
} as const;

export function FilesTab({
  review,
  onGoToReview,
}: {
  review: ReviewDetail;
  onGoToReview: () => void;
}) {
  const [openFile, setOpenFile] = useState<number | null>(null);
  const totalAdd = review.files.reduce((a, f) => a + Number(f.add.replace(/[^0-9]/g, "")), 0);
  const totalDel = review.files.reduce((a, f) => a + Number(f.del.replace(/[^0-9]/g, "")), 0);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-2 rounded-lg border border-divider border-l-2 border-l-warn-400 bg-surface px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[11px] uppercase tracking-wide text-warn-300">Short review</span>
          <VerdictBadge verdict={review.verdict} />
          <span className="ml-auto font-mono text-[11.5px] text-fg/45">
            {review.criticalFixes.length} critical fixes · {review.suggestions.length} suggestions
          </span>
        </div>
        <p className="m-0 max-w-[72ch] text-[13.5px] leading-relaxed text-fg/80 text-pretty">
          {review.shortReview}
        </p>
        <button
          type="button"
          onClick={onGoToReview}
          className="self-start text-[13px] text-accent-300 hover:text-accent-200"
        >
          Read full review →
        </button>
      </div>

      <div className="mb-3.5 flex items-baseline gap-2.5">
        <h6 className="m-0 text-[11px] uppercase tracking-wide text-accent-500">Files reviewed</h6>
        <span className="font-mono text-[11px] text-fg/45">
          {review.files.length} files · +{totalAdd} −{totalDel} · patch sent to model: 41.2 KB
        </span>
      </div>

      <div className="flex flex-col">
        {review.files.map((f, i) => {
          const open = openFile === i;
          const hasPatch = f.patch.length > 0;
          return (
            <div key={f.path} className="border-b border-white/[0.08]">
              <button
                type="button"
                onClick={() => setOpenFile((prev) => (prev === i ? null : i))}
                className="flex w-full items-center gap-3 rounded-md px-1 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
              >
                <ChevronRightIcon
                  className={`h-3 w-3 flex-none text-fg/35 transition-transform ${open ? "rotate-90" : ""}`}
                />
                <span className="min-w-0 truncate font-mono text-[12.5px] text-fg/90">{f.path}</span>
                <span className="ml-auto flex-none rounded border border-divider px-1.5 py-0.5 text-[10px] text-fg/55">
                  {f.status}
                </span>
                <span className="flex-none font-mono text-xs text-accent-300">{f.add}</span>
                <span className="flex-none font-mono text-xs text-fg/45">{f.del}</span>
              </button>

              {open && (
                <div className="px-1 pb-3.5">
                  {!hasPatch && (
                    <div className="flex items-center gap-2.5 rounded-md bg-surface px-3.5 py-3 text-[12.5px] text-fg/55">
                      <FileDashedIcon className="h-4 w-4 flex-none text-accent-400" />
                      <span>Patch not retained for this file — it exceeded the 40 KB inline limit.</span>
                      <a href="#" className="ml-auto flex-none whitespace-nowrap text-[12.5px] text-accent-300">
                        View diff on GitHub
                      </a>
                    </div>
                  )}
                  {hasPatch && (
                    <div className="overflow-hidden rounded-md bg-surface font-mono text-[11.5px] leading-loose">
                      {f.patch.map((l, li) => (
                        <div key={li} className="flex gap-3.5 px-3">
                          <span className="w-[34px] flex-none text-right text-fg/25">{l.n}</span>
                          <span
                            className={`flex-1 whitespace-pre px-1.5 ${LINE_STYLES[l.kind]}`}
                          >
                            {l.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
