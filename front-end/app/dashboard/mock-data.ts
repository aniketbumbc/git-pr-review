import type { ApiReview, ReviewStats, VerdictFilter, VerdictMixRow } from "@/app/lib/api";

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

export type DashboardStat = {
  label: string;
  value: string;
  note: string;
};

export function buildStats(reviewStats: ReviewStats): DashboardStat[] {
  const reviewsDelta = reviewStats.reviewsLast7Days - reviewStats.reviewsPrev7Days;
  const reviewsNote =
    reviewsDelta === 0
      ? "flat vs last week"
      : `${reviewsDelta > 0 ? "+" : ""}${reviewsDelta} vs last week`;

  const avgCritical = reviewStats.avgCriticalFixesLast7Days;
  const avgCriticalPrev = reviewStats.avgCriticalFixesPrev7Days;
  const avgCriticalNote =
    reviewStats.reviewsPrev7Days === 0
      ? "no data from last week"
      : avgCritical === avgCriticalPrev
        ? "flat vs last week"
        : avgCritical < avgCriticalPrev
          ? `down from ${avgCriticalPrev.toFixed(1)}`
          : `up from ${avgCriticalPrev.toFixed(1)}`;

  return [
    {
      label: "Reviews · 7 days",
      value: String(reviewStats.reviewsLast7Days),
      note: reviewsNote,
    },
    {
      label: "Avg critical / PR",
      value: avgCritical.toFixed(1),
      note: avgCriticalNote,
    },
    {
      label: "Step success",
      value:
        reviewStats.stepSuccessRate === null
          ? "—"
          : `${reviewStats.stepSuccessRate.toFixed(1)}%`,
      note: `${reviewStats.retriesToday} retr${reviewStats.retriesToday === 1 ? "y" : "ies"} today`,
    },
  ];
}

// Mocked — the "Live activity" card (live-activity-feed.tsx) has no backing
// endpoint yet. There's no persisted view of in-progress runs (the `reviews`
// table only gets a row once a run finishes), so wiring this up requires a
// new backend endpoint that queries Inngest directly for recent/running
// events, plus polling it client-side. The "polling 3s" badge on the card is
// currently decorative.
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

export type VerdictMixItem = {
  label: string;
  count: number;
  pct: string;
  color: string;
};

const VERDICT_MIX_META: Record<VerdictFilter, { label: string; color: string }> = {
  APPROVE: { label: "Approve", color: "var(--color-accent-500)" },
  REQUEST_CHANGES: { label: "Request changes", color: "var(--color-warn-400)" },
  COMMENT: { label: "Comment", color: "#6b7080" },
};

const VERDICT_MIX_ORDER: VerdictFilter[] = ["APPROVE", "REQUEST_CHANGES", "COMMENT"];

export function buildVerdictMix(rows: VerdictMixRow[]): VerdictMixItem[] {
  const countByVerdict = new Map(rows.map((r) => [r.verdict, r.count]));
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return VERDICT_MIX_ORDER.map((verdict) => {
    const count = countByVerdict.get(verdict) ?? 0;
    const pct = total === 0 ? 0 : (count / total) * 100;
    return {
      label: VERDICT_MIX_META[verdict].label,
      color: VERDICT_MIX_META[verdict].color,
      count,
      pct: `${pct.toFixed(0)}%`,
    };
  });
}

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
