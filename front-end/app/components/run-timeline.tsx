"use client";

import { useEffect, useState } from "react";
import { ChevronDownIcon, RetryIcon, SpinnerIcon } from "@/app/components/icons";
import type { RunProgress, RunStep } from "@/app/lib/api";

const POLL_MS = 3000;
// Right after inngest.send() there's a brief gap before Inngest has actually
// registered the run, so an immediate poll can 404 even though the run is
// about to exist. Retry through that gap before surfacing an error.
const NOT_FOUND_RETRY_LIMIT = 6;
// If the run already finished (status left "Running") but its jobs data
// hasn't caught up yet (every step still reads "pending"), that's a stale
// snapshot, not the real end state — keep polling a few more times instead
// of freezing on it.
const STALE_TERMINAL_RETRY_LIMIT = 4;

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

function statusBadgeClasses(status: RunStep["status"]): string {
  if (status === "retried") return "border-warn-400 text-warn-300";
  if (status === "running") return "border-accent-500 text-accent-300";
  if (status === "failed") return "border-warn-500 text-warn-400";
  if (status === "succeeded") return "border-accent-500/60 text-accent-400";
  return "border-divider text-fg/60";
}

// Mirrors the function's known step order (see back-end REVIEW_STEP_NAMES) —
// used only as a placeholder shape before the first real poll resolves.
const LOADING_STEP_NAMES = [
  "fetch-pull-request-info",
  "fetch-changes-in-pull-request",
  "ai-analysis-of-changes",
  "post-comment",
  "save-review-to-db",
];
const LOADING_STEP_DELAY_MS = 3000;

function LoadingStepper() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % LOADING_STEP_NAMES.length);
    }, LOADING_STEP_DELAY_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="">
    <div className="flex flex-col">
      {LOADING_STEP_NAMES.map((name, i) => (
        <div key={name} className="flex gap-4">
          <div className="flex w-[22px] flex-none flex-col items-center pt-4">
            <span
              className={`h-[11px] w-[11px] rounded-full transition-all duration-500 ${
                i === activeIndex
                  ? "border-[1.5px] border-accent-500 bg-bg animate-pulse"
                  : "border-[1.5px] border-dashed border-white/25"
              }`}
            />
            <span className="mt-1.5 min-h-[14px] w-px flex-1 bg-gradient-to-b from-white/15 to-white/5" />
          </div>
          <div className="min-w-0 flex-1 py-2.5">
            <span
              className={`font-mono text-[13px] transition-colors duration-500 ${
                i === activeIndex ? "text-fg" : "text-fg/40"
              }`}
            >
              {name}
            </span>
          </div>
        </div>
      ))}
    </div>
    </div>
  );
}

type RunTimelineProps = {
  // Identifies what's being polled (reviewId or eventId) — passed as the
  // effect dependency so switching targets restarts the poll loop.
  pollKey: string;
  fetchProgress: () => Promise<RunProgress>;
  // Only the dashboard's live-run panel wants the animated placeholder
  // stepper while waiting for the first poll; the reviews page just wants
  // the real timeline once it loads.
  showLoadingStepper?: boolean;
};

export function RunTimeline({ pollKey, fetchProgress, showLoadingStepper = false }: RunTimelineProps) {
  const [run, setRun] = useState<RunProgress | null>(null);
  const [lastPolledAt, setLastPolledAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [openStep, setOpenStep] = useState(-1);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let notFoundAttempts = 0;
    let staleTerminalAttempts = 0;

    setRun(null);
    setError(null);
    setOpenStep(-1);

    async function poll() {
      try {
        const progress = await fetchProgress();
        if (cancelled) return;
        setRun(progress);
        setLastPolledAt(Date.now());
        setError(null);

        const allStepsPending = progress.steps.every((s) => s.status === "pending");
        if (progress.status === "Running") {
          timer = setTimeout(poll, POLL_MS);
        } else if (allStepsPending && staleTerminalAttempts < STALE_TERMINAL_RETRY_LIMIT) {
          staleTerminalAttempts += 1;
          timer = setTimeout(poll, POLL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Run history unavailable";
        if (message.includes("No run found") && notFoundAttempts < NOT_FOUND_RETRY_LIMIT) {
          notFoundAttempts += 1;
          timer = setTimeout(poll, POLL_MS);
          return;
        }
        setError(message);
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollKey]);

  if (error) {
    return (
      <div className="rounded-lg border border-divider bg-surface p-4 text-[13px] text-fg/60">
        Run history unavailable — {error}. Make sure the Inngest dev server is running
        (<code className="font-mono text-accent-300">pnpm start-inngest</code>).
      </div>
    );
  }

  if (!run) {
    if (showLoadingStepper) {
      return <LoadingStepper />;
    }
    return (
      <div className="flex items-center justify-center pt-16">
        <SpinnerIcon className="h-8 w-8 text-accent-500" />
      </div>
    );
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
                  <span
                    className={`h-[11px] w-[11px] rounded-full transition-all duration-500 ${dotClasses(step.status)}`}
                  />
                  <span className="mt-1.5 min-h-[14px] w-px flex-1 bg-gradient-to-b from-white/15 to-white/5" />
                </div>

                <div className="min-w-0 flex-1 pb-2.5">
                  <button
                    type="button"
                    onClick={() => setOpenStep((prev) => (prev === i ? -1 : i))}
                    className="flex w-full flex-wrap items-center gap-3 rounded-md py-2.5 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="font-mono text-[13px]">{step.name}</span>
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] tracking-wider transition-colors duration-500 ${statusBadgeClasses(step.status)}`}
                    >
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
