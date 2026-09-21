import { ExternalLinkIcon, ListDashesIcon } from "@/app/components/icons";
import { VerdictBadge } from "@/app/dashboard/verdict-badge";
import { verdictNote, type ReviewDetail } from "./mock-data";

export function ReviewSidebar({
  review,
  onGoToRun,
}: {
  review: ReviewDetail;
  onGoToRun: () => void;
}) {
  const hasSteps = review.steps.length > 0;
  const total = review.steps.reduce((a, s) => a + s.ms, 0);
  const retries = review.steps.reduce((a, s) => a + s.attempts.length - 1, 0);
  const retriedStep = review.steps.find((s) => s.status === "retried");
  const wallTime =
    total >= 1000 ? `${(total / 1000).toFixed(1)}s` : `${total}ms`;

  return (
    <aside className="flex min-w-0 flex-col gap-3.5">
      <div className="flex flex-col gap-3 rounded-lg border border-divider bg-surface p-4">
        <span className="text-[11px] uppercase tracking-wide text-fg/45">Verdict</span>
        <VerdictBadge verdict={review.verdict} />
        <p className="m-0 text-[12.5px] leading-relaxed text-fg/60">{verdictNote(review.verdict)}</p>
        <div className="h-px bg-white/10" />
        <div className="flex flex-col">
          {review.meta.map((m) => (
            <div key={m.k} className="flex items-baseline gap-2.5 py-0.5 text-xs">
              <span className="w-[86px] flex-none text-fg/45">{m.k}</span>
              <span className="truncate font-mono text-[11.5px] text-fg/85">{m.v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 rounded-lg border border-divider bg-surface p-4">
        <span className="text-[11px] uppercase tracking-wide text-fg/45">Run</span>
        {hasSteps ? (
          <>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent-500 shadow-[0_0_10px_var(--color-accent-500)]" />
              <span className="text-[13.5px]">
                Completed · {review.steps.length} of {review.steps.length} steps
              </span>
            </div>
            <div className="flex h-[26px] items-end gap-1">
              {review.steps.map((s) => (
                <span
                  key={s.name}
                  className="flex-1 rounded-sm bg-accent-700"
                  style={{ height: `${Math.max(20, (s.ms / total) * 100)}%` }}
                />
              ))}
            </div>
            <span className="text-[11px] text-fg/45">
              {wallTime} wall{retriedStep ? ` · ${retries} retries on ${retriedStep.name}` : ""}
            </span>
          </>
        ) : (
          <span className="text-[13.5px] text-fg/60">See the Run timeline tab for live status.</span>
        )}
        <button
          type="button"
          onClick={onGoToRun}
          className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-divider text-[13px] text-fg/80 transition-colors hover:border-fg/25"
        >
          <ListDashesIcon className="h-[15px] w-[15px]" />
          View step timeline
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-divider bg-surface p-4">
        <span className="text-[11px] uppercase tracking-wide text-fg/45">Posted comment</span>
        <p className="m-0 text-[12.5px] leading-relaxed text-fg/65">
          Review posted to GitHub as{" "}
          <span className="font-mono text-[11.5px] text-accent-300">auto-reviewpr[bot]</span>{" "}
          {review.postedCommentAgo}.
        </p>
        <a
          href={`https://github.com/${review.owner}/${review.repo}/pull/${review.pullNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 self-start text-[13px] text-accent-300 hover:text-accent-200"
        >
          <ExternalLinkIcon className="h-3.5 w-3.5" />
          View on GitHub
        </a>
      </div>
    </aside>
  );
}
