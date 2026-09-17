"use client";

import { useEffect, useState } from "react";
import { ChevronDownIcon, RetryIcon } from "@/app/components/icons";
import { fetchReviewRun, type RunProgress, type RunStep } from "@/app/lib/api";

const POLL_MS = 3000;

function formatDuration(ms: number | null): string {
  if (ms == null || ms < 0) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString();
}

function dotClasses(status: RunStep["status"]): string {
  if (status === "retried") {
    return "border-[1.5px] border-warn-400 bg-bg shadow-[0_0_0_4px_rgba(201,96,31,0.16)]";
  }
  if (status === "running") return "border-[1.5px] border-accent-500 bg-bg animate-pulse";
  if (status === "failed") return "bg-warn-500 shadow-[0_0_10px_rgba(201,96,31,0.6)]";
  if (status === "pending") return "border-[1.5px] border-dashed border-white/25";
  return "bg-accent-500 shadow-[0_0_10px_rgba(79,187,125,0.6)]";
}

export function RunTab({ reviewId }: { reviewId: string }) {
  const [run, setRun] = useState<RunProgress | null>(null);
  const [lastPolledAt, setLastPolledAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [openStep, setOpenStep] = useState(-1);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const progress = await fetchReviewRun(reviewId);
        if (cancelled) return;
        setRun(progress);
        setLastPolledAt(Date.now());
        setError(null);
        if (progress.status === "Running") {
          timer = setTimeout(poll, POLL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Run history unavailable");
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reviewId]);

  if (error) {
    return (
      <div className="rounded-lg border border-divider bg-surface p-4 text-[13px] text-fg/60">
        Run history unavailable — {error}. Make sure the Inngest dev server is running
        (<code className="font-mono text-accent-300">pnpm start-inngest</code>) and this review
        has a recorded run.
      </div>
    );
  }

  if (!run) {
    return <div className="text-[13px] text-fg/45">Loading run…</div>;
  }

  const wallMs = run.endedAt
    ? new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime()
    : lastPolledAt - new Date(run.startedAt).getTime();
  const attemptsTotal = run.steps.reduce((a, s) => a + s.attempts.length, 0);
  const retriedCount = run.steps.filter((s) => s.status === "retried").length;
  const doneCount = run.steps.filter(
    (s) => s.status === "succeeded" || s.status === "retried",
  ).length;

  const runStats = [
    { label: "Wall time", value: formatDuration(wallMs), note: run.status },
    {
      label: "Steps",
      value: `${doneCount} / ${run.steps.length}`,
      note: run.status === "Running" ? "in progress" : "checkpointed",
    },
    {
      label: "Attempts",
      value: String(attemptsTotal),
      note: retriedCount ? `${retriedCount} retried` : "no retries",
    },
    { label: "Run ID", value: run.runId.slice(0, 10), note: run.status },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2.5">
        {runStats.map((st) => (
          <div
            key={st.label}
            className="min-w-[132px] flex-1 rounded-lg border border-divider bg-surface px-3.5 py-3"
          >
            <span className="block text-[11px] uppercase tracking-wide text-fg/45">{st.label}</span>
            <span className="mt-0.5 block text-[19px] font-medium tracking-tight">{st.value}</span>
            <span className="mt-0.5 block text-[11px] text-fg/45">{st.note}</span>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline gap-2.5">
          <h6 className="m-0 text-[11px] uppercase tracking-wide text-accent-500">Step timeline</h6>
          <span className="font-mono text-[11px] text-fg/45">
            github/pull_request.review · {run.steps.length} steps · {attemptsTotal} attempts
          </span>
        </div>
        <div className="mb-4 text-xs text-fg/45">
          Live from Inngest — step names come from the function&apos;s known step order, and
          durations are approximated from job-schedule timestamps, since Inngest&apos;s API doesn&apos;t
          expose per-step names or output directly.
        </div>

        <div className="flex flex-col">
          {run.steps.map((step, i) => {
            const open = openStep === i;
            return (
              <div key={step.name} className="flex gap-4">
                <div className="flex w-[22px] flex-none flex-col items-center pt-4">
                  <span className={`h-[11px] w-[11px] rounded-full ${dotClasses(step.status)}`} />
                  <span className="mt-1.5 min-h-[14px] w-px flex-1 bg-gradient-to-b from-white/15 to-white/5" />
                </div>

                <div className="min-w-0 flex-1 pb-2.5">
                  <button
                    type="button"
                    onClick={() => setOpenStep((prev) => (prev === i ? -1 : i))}
                    className="flex w-full flex-wrap items-center gap-3 rounded-md py-2.5 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="font-mono text-[13px]">{step.name}</span>
                    <span className="rounded border border-divider px-1.5 py-0.5 text-[10px] tracking-wider text-fg/60">
                      {step.status}
                    </span>
                    {step.status === "retried" && (
                      <span className="inline-flex items-center gap-1.5 rounded border border-warn-400 px-1.5 py-0.5 text-[10px] text-warn-300">
                        <RetryIcon className="h-3 w-3" />
                        {step.attempts.length} attempts
                      </span>
                    )}
                    <span className="ml-auto font-mono text-xs text-fg/55">
                      {formatDuration(step.ms)}
                    </span>
                    <ChevronDownIcon
                      className={`h-3.5 w-3.5 text-fg/40 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>

                  {open && (
                    <div className="mt-3 flex flex-col gap-3 rounded-lg bg-surface/70 px-4 py-3.5 shadow-sm">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-wide text-fg/45">Attempts</span>
                        {step.attempts.length === 0 && (
                          <span className="py-1.5 text-xs text-fg/40">Not reached yet.</span>
                        )}
                        {step.attempts.map((a) => (
                          <div
                            key={a.attempt}
                            className="flex items-center gap-3 border-b border-white/[0.07] py-1.5 font-mono text-xs last:border-b-0"
                          >
                            <span className="w-[22px] text-fg/45">#{a.attempt}</span>
                            <span className="min-w-0 flex-1 text-fg/45">scheduled</span>
                            <span className="text-fg/50">{formatTime(a.at)}</span>
                          </div>
                        ))}
                      </div>
                      {i === run.steps.length - 1 && run.output != null && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] uppercase tracking-wide text-fg/45">
                            Run output
                          </span>
                          <pre className="m-0 overflow-x-auto rounded-md bg-black/30 px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-fg/75">
                            {JSON.stringify(run.output, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
