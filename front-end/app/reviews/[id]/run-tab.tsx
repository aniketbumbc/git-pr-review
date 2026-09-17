"use client";

import { useState } from "react";
import { ChevronDownIcon, RetryIcon } from "@/app/components/icons";
import type { ReviewDetail, Step } from "./mock-data";

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
}

function dotClasses(status: Step["status"]): string {
  if (status === "retried") {
    return "border-[1.5px] border-warn-400 bg-bg shadow-[0_0_0_4px_rgba(201,96,31,0.16)]";
  }
  if (status === "pending") return "border-[1.5px] border-dashed border-white/25";
  return "bg-accent-500 shadow-[0_0_10px_rgba(79,187,125,0.6)]";
}

export function RunTab({ review }: { review: ReviewDetail }) {
  const [openStep, setOpenStep] = useState(2);

  const total = review.steps.reduce((a, s) => a + s.ms, 0);
  const offsets = review.steps.reduce<number[]>((acc, s, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + review.steps[i - 1].ms);
    return acc;
  }, []);
  const steps = review.steps.map((s, i) => {
    return {
      ...s,
      left: (offsets[i] / total) * 100,
      width: Math.max(1.5, (s.ms / total) * 100),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2.5">
        {review.runStats.map((st) => (
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
            github/pull_request.review · {steps.length} steps ·{" "}
            {steps.reduce((a, s) => a + s.attempts.length, 0)} attempts
          </span>
        </div>
        <div className="mb-4 text-xs text-fg/45">
          Durable execution — each step is checkpointed, so a retry resumes here instead of
          re-running the function.
        </div>

        <div className="flex flex-col">
          {steps.map((step, i) => {
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

                  <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <span
                      className="absolute inset-y-0 rounded-full bg-gradient-to-r from-accent-700 to-accent-500"
                      style={{ left: `${step.left}%`, width: `${step.width}%` }}
                    />
                  </div>

                  {open && (
                    <div className="mt-3 flex flex-col gap-3 rounded-lg bg-surface/70 px-4 py-3.5 shadow-sm">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-wide text-fg/45">Attempts</span>
                        {step.attempts.map((a) => (
                          <div
                            key={a.n}
                            className="flex items-center gap-3 border-b border-white/[0.07] py-1.5 font-mono text-xs last:border-b-0"
                          >
                            <span className="w-[22px] text-fg/45">#{a.n}</span>
                            <span className="min-w-0 flex-1 text-fg/80">{a.result}</span>
                            <span className="text-fg/50">{a.dur}</span>
                            <span className="text-fg/35">{a.at}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] uppercase tracking-wide text-fg/45">Step output</span>
                        <pre className="m-0 overflow-x-auto rounded-md bg-black/30 px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-fg/75">
                          {step.output}
                        </pre>
                      </div>
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
