import type { ApiReview, VerdictFilter } from "@/app/lib/api";

export type Verdict = VerdictFilter | "PENDING";

// The raw shape a review comes back in from GET /reviews (camelCased columns).
export type ReviewRow = ApiReview;

// The shape the table actually renders. A "PENDING" row never comes from the
// API — it only exists client-side, optimistically inserted while a
// triggered review is still running (see TriggerPanel).
export type ReviewViewModel = {
  id: string;
  title: string;
  slug: string;
  author?: string;
  verdict: Verdict;
  critical: number | "—";
  run: string;
  when: string;
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;

  const diffDay = Math.round(diffHr / 24);
  if (diffDay === 1) return "yesterday";
  return `${diffDay} days ago`;
}

// `reviews` has no PR-author column — `owner` is the GitHub org/repo owner,
// not who opened the pull request — so author is left blank until the
// schema tracks it.
export function toReviewViewModel(row: ReviewRow): ReviewViewModel {
  return {
    id: row.id,
    title: row.prTitle,
    slug: `${row.owner}/${row.repo} #${row.pullNumber}`,
    verdict: row.verdict,
    critical: row.criticalFixes ? row.criticalFixes.length : "—",
    run: row.headSha.slice(0, 10),
    when: formatRelativeTime(row.createdAt),
  };
}

export const stats = [
  { label: "Reviews · 7 days", value: "38", note: "+6 vs last week" },
  { label: "Avg critical / PR", value: "1.8", note: "down from 2.4" },
  { label: "Runs in flight", value: "2", note: "1 retrying" },
  { label: "Step success", value: "96.4%", note: "6 retries today" },
];

export const feed = [
  {
    icon: "spinner" as const,
    text: "Reviewing acme/checkout-api#418",
    meta: "step 3 of 4 · ai-analysis-of-changes",
  },
  {
    icon: "retry" as const,
    text: "Retrying acme/infra#89 — 429 rate limit",
    meta: "attempt 2 · backoff 8s",
  },
  {
    icon: "check" as const,
    text: "Completed acme/web#1104 — APPROVE",
    meta: "19.4s · 4 steps",
  },
  {
    icon: "warning" as const,
    text: "Completed acme/checkout-api#412 — REQUEST_CHANGES",
    meta: "27.1s · 2 retries",
  },
  {
    icon: "paper-plane" as const,
    text: "Event received for acme/infra#88",
    meta: "github/pull_request.review",
  },
];

export const verdictMix = [
  { label: "Approve", count: 21, pct: "55%", color: "var(--color-accent-500)" },
  { label: "Request changes", count: 12, pct: "32%", color: "var(--color-warn-400)" },
  { label: "Comment", count: 5, pct: "13%", color: "#6b7080" },
];

export const repoOptions = [
  "All repositories",
  "acme/checkout-api",
  "acme/web",
  "acme/infra",
];

export const dateRangeOptions = ["Last 7 days", "Last 30 days", "All time"];

export const verdictFilters = ["All", "Request changes", "Approve", "Comment"] as const;

export const FILTER_TO_VERDICT: Record<
  (typeof verdictFilters)[number],
  VerdictFilter | null
> = {
  All: null,
  "Request changes": "REQUEST_CHANGES",
  Approve: "APPROVE",
  Comment: "COMMENT",
};

export const REVIEWS_PAGE_SIZE = 20;
