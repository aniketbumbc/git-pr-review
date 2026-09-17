import type { ApiReview, Verdict } from "@/app/lib/api";

// The `reviews` table stores critical fixes and suggestions as plain
// strings (the model's own sentences), not structured {severity, loc, code}
// data, so that's all there is to render.
export type CriticalFix = { num: string; text: string };

export type Suggestion = { text: string };

export type StepAttempt = { n: number; result: string; dur: string; at: string };

export type StepStatus = "succeeded" | "retried" | "pending";

export type Step = {
  name: string;
  status: StepStatus;
  ms: number;
  attempts: StepAttempt[];
  output: string;
};

export type ReviewDetail = {
  id: string;
  owner: string;
  repo: string;
  pullNumber: number;
  title: string;
  changedFilesCount: number;
  reviewedAgo: string;
  verdict: Exclude<Verdict, "PENDING">;
  summary: string[];
  shortReview: string;
  criticalFixes: CriticalFix[];
  suggestions: Suggestion[];
  steps: Step[];
  meta: { k: string; v: string }[];
  postedCommentAgo: string;
};

const VERDICT_NOTES: Record<Exclude<Verdict, "PENDING">, string> = {
  REQUEST_CHANGES:
    "Three blocking items must be resolved before merge. The model re-reviews automatically on the next push.",
  APPROVE: "No blocking items found. Suggestions are advisory and will not re-trigger a review.",
  COMMENT: "Notes only — the model was not confident enough to block or approve this change.",
};

export function verdictNote(verdict: Exclude<Verdict, "PENDING">): string {
  return VERDICT_NOTES[verdict];
}

export function criticalLine(review: ReviewDetail): string {
  return `${review.criticalFixes.length} critical fixes · ${review.suggestions.length} suggestions`;
}

function formatRelativeTime(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.round(diffHr / 24);
  return diffDay === 1 ? "yesterday" : `${diffDay} days ago`;
}

// The `reviews` row only has: owner/repo/pullNumber/prTitle/headSha/verdict/
// content/criticalFixes/suggestions/createdAt/eventId — no PR author and no
// branch names, so ReviewDetail doesn't carry those fields at all. `steps`
// is left as an empty array — review-sidebar.tsx's sparkline falls back
// cleanly, since real step progress is fetched live by RunTab instead. The
// Files tab similarly fetches its own data (fetchReviewFiles) rather than
// reading anything off ReviewDetail.
export function toReviewDetail(row: ApiReview): ReviewDetail {
  const reviewedAgo = formatRelativeTime(row.createdAt);
  const paragraphs = row.content?.trim()
    ? row.content.trim().split(/\n{2,}/)
    : ["No review content was recorded for this run."];

  return {
    id: row.id,
    owner: row.owner,
    repo: row.repo,
    pullNumber: row.pullNumber,
    title: row.prTitle,
    changedFilesCount: row.changedFilesCount,
    reviewedAgo,
    verdict: row.verdict,
    summary: paragraphs,
    shortReview: paragraphs[0],
    criticalFixes: row.criticalFixes.map((text, i) => ({
      num: String(i + 1).padStart(2, "0"),
      text,
    })),
    suggestions: row.suggestions.map((text) => ({ text })),
    steps: [],
    meta: [
      { k: "Event", v: "github/pull_request.review" },
      { k: "Function", v: "review-pull-request" },
      { k: "Head SHA", v: row.headSha.slice(0, 10) },
      { k: "Files changed", v: String(row.changedFilesCount) },
      { k: "Commits", v: String(row.commitsCount) },
      { k: "Triggered", v: reviewedAgo },
    ],
    postedCommentAgo: reviewedAgo,
  };
}
