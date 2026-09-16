export type Verdict = "APPROVE" | "REQUEST_CHANGES" | "COMMENT" | "PENDING";

export type ReviewRow = {
  id: string;
  title: string;
  slug: string;
  author: string;
  verdict: Verdict;
  critical: number | "—";
  run: string;
  when: string;
};

export const reviews: ReviewRow[] = [
  {
    id: "r1",
    title: "Add durable retry to the PR review pipeline",
    slug: "acme/checkout-api #412",
    author: "@dbraga",
    verdict: "REQUEST_CHANGES",
    critical: 3,
    run: "01J9X4K2MB",
    when: "12 min ago",
  },
  {
    id: "r2",
    title: "Split webhook handler from event dispatch",
    slug: "acme/checkout-api #418",
    author: "@mfalk",
    verdict: "PENDING",
    critical: "—",
    run: "01J9X5QT7F",
    when: "running",
  },
  {
    id: "r3",
    title: "Cache PR info by head SHA",
    slug: "acme/web #1104",
    author: "@rnovak",
    verdict: "APPROVE",
    critical: 0,
    run: "01J9X2F0YC",
    when: "48 min ago",
  },
  {
    id: "r4",
    title: "Bump inngest to 3.22 and pin the model",
    slug: "acme/infra #88",
    author: "@dbraga",
    verdict: "COMMENT",
    critical: 0,
    run: "01J9X1BB3D",
    when: "2 hours ago",
  },
  {
    id: "r5",
    title: "Fan out specialist agents for security review",
    slug: "acme/checkout-api #406",
    author: "@lvasquez",
    verdict: "REQUEST_CHANGES",
    critical: 5,
    run: "01J9WZ8HKM",
    when: "5 hours ago",
  },
  {
    id: "r6",
    title: "Drop unused step from review function",
    slug: "acme/web #1098",
    author: "@mfalk",
    verdict: "APPROVE",
    critical: 0,
    run: "01J9WY1PPA",
    when: "yesterday",
  },
  {
    id: "r7",
    title: "Add debounce window to push trigger",
    slug: "acme/infra #85",
    author: "@rnovak",
    verdict: "REQUEST_CHANGES",
    critical: 2,
    run: "01J9WQ4TTC",
    when: "yesterday",
  },
  {
    id: "r8",
    title: "Log prompt hash on every run",
    slug: "acme/checkout-api #399",
    author: "@dbraga",
    verdict: "APPROVE",
    critical: 0,
    run: "01J9WK0ZZ1",
    when: "2 days ago",
  },
];

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
