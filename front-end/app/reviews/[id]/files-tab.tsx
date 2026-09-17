"use client";

import { useEffect, useState } from "react";
import { ChevronRightIcon, FileDashedIcon } from "@/app/components/icons";
import { VerdictBadge } from "@/app/dashboard/verdict-badge";
import { fetchReviewFiles, type ApiReviewFile } from "@/app/lib/api";
import type { ReviewDetail } from "./mock-data";

type DiffLineKind = "add" | "del" | "ctx" | "hunk";

type DiffLine = {
  text: string;
  kind: DiffLineKind;
  oldLine: number | null;
  newLine: number | null;
};

// GitHub returns each file's diff as a unified-diff patch string (hunk
// headers like "@@ -10,7 +10,8 @@" followed by " "/"+"/"-" prefixed lines).
// This walks it once, tracking old/new line numbers as it goes.
function parsePatch(patch: string): DiffLine[] {
  const lines: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const raw of patch.split("\n")) {
    if (raw.startsWith("@@")) {
      const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
      if (match) {
        oldLine = Number(match[1]);
        newLine = Number(match[2]);
      }
      lines.push({ text: raw, kind: "hunk", oldLine: null, newLine: null });
      continue;
    }

    const marker = raw[0];
    const text = raw.slice(1);
    if (marker === "+") {
      lines.push({ text, kind: "add", oldLine: null, newLine });
      newLine += 1;
    } else if (marker === "-") {
      lines.push({ text, kind: "del", oldLine, newLine: null });
      oldLine += 1;
    } else {
      lines.push({ text, kind: "ctx", oldLine, newLine });
      oldLine += 1;
      newLine += 1;
    }
  }

  return lines;
}

const LINE_STYLES: Record<DiffLineKind, string> = {
  add: "bg-accent-500/[0.16] text-accent-200",
  del: "bg-white/[0.07] text-fg/45",
  ctx: "text-fg/60",
  hunk: "text-accent-400/70",
};

export function FilesTab({
  review,
  onGoToReview,
}: {
  review: ReviewDetail;
  onGoToReview: () => void;
}) {
  const [files, setFiles] = useState<ApiReviewFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openFile, setOpenFile] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchReviewFiles(review.id)
      .then((body) => {
        if (!cancelled) setFiles(body.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load files");
      });
    return () => {
      cancelled = true;
    };
  }, [review.id]);

  const totalAdd = files?.reduce((a, f) => a + f.additions, 0) ?? 0;
  const totalDel = files?.reduce((a, f) => a + f.deletions, 0) ?? 0;
  const githubFilesUrl = `https://github.com/${review.owner}/${review.repo}/pull/${review.pullNumber}/files`;

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

      <div className="mb-3.5 flex flex-wrap items-baseline gap-2.5">
        <h6 className="m-0 text-[11px] uppercase tracking-wide text-accent-500">Files reviewed</h6>
        {files && files.length > 0 && (
          <span className="font-mono text-[11px] text-fg/45">
            {files.length} files · +{totalAdd} −{totalDel}
          </span>
        )}
        <a
          href={githubFilesUrl}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-[12.5px] text-accent-300 hover:text-accent-200"
        >
          View diff on GitHub →
        </a>
      </div>

      {error && (
        <div className="text-[13px] text-fg/55">Failed to load files — {error}.</div>
      )}
      {!error && !files && <div className="text-[13px] text-fg/45">Loading files…</div>}
      {!error && files && files.length === 0 && (
        <div className="text-[13px] text-fg/45">No file diffs recorded for this run.</div>
      )}

      <div className="flex flex-col">
        {files?.map((f, i) => {
          const open = openFile === i;
          const hasPatch = !!f.patch;
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
                <span className="flex-none font-mono text-xs text-accent-300">+{f.additions}</span>
                <span className="flex-none font-mono text-xs text-fg/45">−{f.deletions}</span>
              </button>

              {open && (
                <div className="px-1 pb-3.5">
                  {!hasPatch && (
                    <div className="flex items-center gap-2.5 rounded-md bg-surface px-3.5 py-3 text-[12.5px] text-fg/55">
                      <FileDashedIcon className="h-4 w-4 flex-none text-accent-400" />
                      <span>No patch recorded for this file (binary, renamed, or too large).</span>
                      <a
                        href={githubFilesUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto flex-none whitespace-nowrap text-[12.5px] text-accent-300"
                      >
                        View diff on GitHub
                      </a>
                    </div>
                  )}
                  {hasPatch && (
                    <div className="overflow-hidden rounded-md bg-surface font-mono text-[11.5px] leading-loose">
                      {parsePatch(f.patch as string).map((l, li) => (
                        <div key={li} className="flex gap-3.5 px-3">
                          <span className="w-[34px] flex-none text-right text-fg/25">
                            {l.kind === "hunk" ? "" : (l.kind === "del" ? l.oldLine : l.newLine)}
                          </span>
                          <span className={`flex-1 whitespace-pre px-1.5 ${LINE_STYLES[l.kind]}`}>
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
