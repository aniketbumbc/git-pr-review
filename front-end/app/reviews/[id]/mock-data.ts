import type { Verdict } from "@/app/lib/api";

export type CriticalFix = {
  num: string;
  title: string;
  severity: string;
  loc: string;
  body: string;
  code: string;
};

export type Suggestion = { text: string; loc: string };

export type StepAttempt = { n: number; result: string; dur: string; at: string };

export type StepStatus = "succeeded" | "retried" | "pending";

export type Step = {
  name: string;
  status: StepStatus;
  ms: number;
  attempts: StepAttempt[];
  output: string;
};

export type PatchLine = {
  n: number | "";
  text: string;
  kind: "add" | "del" | "ctx";
};

export type ReviewFile = {
  path: string;
  status: "modified" | "added";
  add: string;
  del: string;
  patch: PatchLine[];
};

export type ReviewDetail = {
  id: string;
  owner: string;
  repo: string;
  pullNumber: number;
  title: string;
  author: string;
  branch: string;
  targetBranch: string;
  reviewedAgo: string;
  verdict: Exclude<Verdict, "PENDING">;
  summary: string[];
  shortReview: string;
  criticalFixes: CriticalFix[];
  suggestions: Suggestion[];
  steps: Step[];
  files: ReviewFile[];
  runStats: { label: string; value: string; note: string }[];
  meta: { k: string; v: string }[];
  postedCommentAgo: string;
};

function patch(lines: string[]): PatchLine[] {
  return lines.map((l, i) => ({
    n: l[0] === "+" ? "" : 118 + i,
    text: l.slice(1),
    kind: l[0] === "+" ? "add" : l[0] === "-" ? "del" : "ctx",
  }));
}

const MOCK_REVIEW: ReviewDetail = {
  id: "01j9x4k2mb7q",
  owner: "acme",
  repo: "checkout-api",
  pullNumber: 412,
  title: "Add durable retry to the PR review pipeline",
  author: "dbraga",
  branch: "feat/durable-review",
  targetBranch: "main",
  reviewedAgo: "12 min ago",
  verdict: "REQUEST_CHANGES",
  summary: [
    'This PR moves the review pipeline onto durable steps, which is the right shape — but the AI call still sits outside step.run, so a retry re-charges tokens and can double-post the review comment. The webhook route also enqueues events before verifying the signature.',
    "Tests cover the happy path only; the retry path that this PR exists to add is untested. Three blocking items below, four non-blocking suggestions.",
  ],
  shortReview:
    "Right shape, two unsafe edges: the AI call still sits outside step.run (a retry re-charges tokens and can double-post), and the webhook enqueues before verifying its signature. Patch truncation is silent.",
  criticalFixes: [
    {
      num: "01",
      title: "Webhook enqueues before verifying signature",
      severity: "security",
      loc: "src/routes/api/inngest.ts:24",
      body: "The route calls inngest.send() on the parsed body and verifies the GitHub HMAC afterwards, so any unauthenticated caller can trigger a paid review run. Verify first, then send.",
      code: 'if (!verify(req.rawBody, sig)) return res.status(401).end();',
    },
    {
      num: "02",
      title: "AI call is not wrapped in step.run",
      severity: "correctness",
      loc: "src/inngest/functions/review-pull-request.ts:58",
      body: "analyze() runs outside a durable step in the retry branch, so a failure after it succeeds re-charges tokens on replay and can post the review comment twice.",
      code: 'await step.run("ai-analysis-of-changes", () => analyze(changes));',
    },
    {
      num: "03",
      title: "Patch truncation is silent",
      severity: "data loss",
      loc: "src/lib/github.ts:41",
      body: "Patches over 40 KB are sliced without setting the truncated flag, so the model reviews a partial diff and reports APPROVE on files it never saw.",
      code: "if (bytes > MAX) return { patch: head, truncated: true };",
    },
  ],
  suggestions: [
    {
      text: "Pin the model version in an env constant instead of reading it per call — reviews should be reproducible across runs.",
      loc: "src/agents/review.ts:12",
    },
    {
      text: "Move the review prompt into a versioned file and log its hash on the run, so a verdict can be traced to a prompt.",
      loc: "src/lib/prompt/review.md",
    },
    {
      text: "Prefix step names with the PR number to make the Inngest run list scannable.",
      loc: "src/inngest/functions/review-pull-request.ts:31",
    },
    {
      text: "Cache PR info by head SHA — pushes to the same commit re-fetch identical data.",
      loc: "src/lib/github.ts:18",
    },
  ],
  steps: [
    {
      name: "fetch-pull-request-info",
      status: "succeeded",
      ms: 412,
      attempts: [
        { n: 1, result: "ok · 200 GET /repos/acme/checkout-api/pulls/412", dur: "412ms", at: "14:02:11" },
      ],
      output:
        '{\n  "number": 412,\n  "head_sha": "9f3c1ab",\n  "changed_files": 8,\n  "additions": 414,\n  "deletions": 36\n}',
    },
    {
      name: "fetch-changes-in-pull-request",
      status: "succeeded",
      ms: 1240,
      attempts: [{ n: 1, result: "ok · 8 files, patch 41.2 KB", dur: "1.24s", at: "14:02:12" }],
      output: '{\n  "files": 8,\n  "patch_bytes": 42189,\n  "truncated": false\n}',
    },
    {
      name: "ai-analysis-of-changes",
      status: "retried",
      ms: 24800,
      attempts: [
        { n: 1, result: "failed · 429 rate_limit_exceeded", dur: "1.9s", at: "14:02:13" },
        { n: 2, result: "failed · timeout after 20s", dur: "20.0s", at: "14:02:29" },
        { n: 3, result: "ok · 3 critical, 4 suggestions", dur: "24.8s", at: "14:03:22" },
      ],
      output:
        '{\n  "verdict": "REQUEST_CHANGES",\n  "critical_fixes": 3,\n  "suggestions": 4,\n  "tokens": { "in": 31204, "out": 1842 }\n}',
    },
    {
      name: "post-comment",
      status: "succeeded",
      ms: 680,
      attempts: [{ n: 1, result: "ok · 201 POST /pulls/412/reviews", dur: "680ms", at: "14:03:23" }],
      output: '{\n  "review_id": 2841937,\n  "event": "REQUEST_CHANGES"\n}',
    },
  ],
  files: [
    {
      path: "src/inngest/functions/review-pull-request.ts",
      status: "modified",
      add: "+148",
      del: "−22",
      patch: patch([
        '   const changes = await step.run("fetch-changes-in-pull-request", () =>',
        "     github.listFiles({ owner, repo, number }));",
        "-  const analysis = await analyze(changes);",
        '+  const analysis = await step.run("ai-analysis-of-changes", () =>',
        "+    analyze(changes, { model: MODEL, maxTokens: 4096 }));",
        '   await step.run("post-comment", () => github.review(analysis));',
      ]),
    },
    {
      path: "src/lib/github.ts",
      status: "modified",
      add: "+31",
      del: "−4",
      patch: patch([
        '   const patch = files.map(f => f.patch).join("\\n");',
        "-  return { patch: patch.slice(0, MAX) };",
        "+  const truncated = patch.length > MAX;",
        "+  return { patch: patch.slice(0, MAX), truncated };",
      ]),
    },
    {
      path: "src/routes/api/inngest.ts",
      status: "modified",
      add: "+12",
      del: "−0",
      patch: patch([
        '   const sig = req.headers["x-hub-signature-256"];',
        "+  if (!verify(req.rawBody, sig)) return res.status(401).end();",
        '   await inngest.send({ name: "github/pull_request.review", data });',
      ]),
    },
    { path: "src/lib/prompt/review.md", status: "added", add: "+58", del: "−0", patch: [] },
    {
      path: "tests/review.test.ts",
      status: "added",
      add: "+96",
      del: "−0",
      patch: patch([
        '+test("retries the analysis step without re-posting", async () => {',
        "+  const run = await invoke({ failFirst: 2 });",
        '+  expect(run.steps["post-comment"].attempts).toBe(1);',
        "+});",
      ]),
    },
    { path: "src/agents/review.ts", status: "modified", add: "+61", del: "−8", patch: [] },
    { path: "package.json", status: "modified", add: "+3", del: "−1", patch: [] },
    { path: ".env.example", status: "modified", add: "+5", del: "−1", patch: [] },
  ],
  runStats: [
    { label: "Wall time", value: "27.1s", note: "incl. 22s backoff" },
    { label: "Steps", value: "4 / 4", note: "all checkpointed" },
    { label: "Attempts", value: "6", note: "2 retried" },
    { label: "Tokens", value: "33.0k", note: "31.2k in · 1.8k out" },
  ],
  meta: [
    { k: "Run ID", v: "01J9X4K2MB7Q…" },
    { k: "Event", v: "github/pull_request.review" },
    { k: "Function", v: "review-pull-request" },
    { k: "Model", v: "claude-sonnet-4-5" },
    { k: "Head SHA", v: "9f3c1ab" },
    { k: "Triggered", v: "webhook · 14:02:11" },
  ],
  postedCommentAgo: "12 min ago",
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

// The detail page is fully mocked for now — every id resolves to the same
// sample run, keeping navigation from the dashboard's real review rows working.
export function getMockReviewDetail(id: string): ReviewDetail {
  return { ...MOCK_REVIEW, id };
}
