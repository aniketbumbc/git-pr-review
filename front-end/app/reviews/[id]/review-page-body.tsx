import Link from "next/link";
import { ArrowLeftIcon, ExternalLinkIcon, GitPullRequestIcon } from "@/app/components/icons";
import { VerdictBadge } from "@/app/dashboard/verdict-badge";
import type { ReviewDetail } from "./mock-data";
import { ReviewDetailView } from "./review-detail-view";

export function ReviewPageBody({ review }: { review: ReviewDetail }) {
  return (
    <div className="mx-auto max-w-[1240px] px-8 pb-16">
      <Link
        href="/dashboard"
        className="mt-4 inline-flex items-center gap-1.5 text-xs text-accent-400 transition-colors hover:text-accent-300"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        Back to dashboard
      </Link>
      <div className="mb-4 mt-2 flex items-center gap-2 text-xs text-fg/45">
        <Link href="/dashboard" className="hover:text-fg/70">
          Reviews
        </Link>
        <span>/</span>
        <span>
          {review.owner}/{review.repo}
        </span>
        <span>/</span>
        <span className="text-fg/80">#{review.pullNumber}</span>
      </div>

      <div className="flex flex-wrap items-start gap-7">
        <div className="min-w-0 flex-[1_1_520px]">
          <div className="mb-2.5 flex items-center gap-2.5">
            <VerdictBadge verdict={review.verdict} />
            <span className="text-xs text-fg/50">
              {review.criticalFixes.length} critical fixes · {review.suggestions.length} suggestions
            </span>
          </div>
          <h1 className="m-0 max-w-[22ch] text-2xl font-medium tracking-tight text-balance">
            {review.title}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-3.5 text-[12.5px] text-fg/55">
            <span className="inline-flex items-center gap-1.5">
              <GitPullRequestIcon className="h-[15px] w-[15px] text-accent-400" />
              {review.owner}/{review.repo}{" "}
              <span className="text-fg/80">#{review.pullNumber}</span>
            </span>
            <span>reviewed {review.reviewedAgo}</span>
          </div>
        </div>
        <div className="flex gap-2 pt-1.5">
          <a
            href={`https://github.com/${review.owner}/${review.repo}/pull/${review.pullNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 items-center gap-1.5 rounded-md bg-accent-500 px-3.5 text-[13px] font-medium text-accent-900 transition-colors hover:bg-accent-400"
          >
            <ExternalLinkIcon className="h-[15px] w-[15px]" />
            Open on GitHub
          </a>
        </div>
      </div>

      <div className="mt-5 h-px bg-divider" />

      <ReviewDetailView review={review} />
    </div>
  );
}
