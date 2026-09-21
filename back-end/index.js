import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';

import { serve } from 'inngest/express';
import { inngest } from './inggest/client.js';
import { functions } from './functions/index.js';
import { db } from './lib/db.js';
import { toCamelCase } from './lib/case.js';
import { fetchStepHistory } from './lib/step-tracking.js';

const triggerReviewSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  pull_number: z.coerce.number().int().positive(),
});

const reviewsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  repo: z.string().min(1).optional(),
  verdict: z.enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT']).optional(),
  search: z.string().min(1).optional(),
  since: z.coerce.date().optional(),
});

// The Inngest function runs these steps strictly in sequence (no branching,
// no parallel steps), so a step's position here maps 1:1 to the "position"
// column written in review_run_steps by lib/step-tracking.js.
const REVIEW_STEP_NAMES = [
  'fetch-pull-request-info',
  'fetch-changes-in-pull-request',
  'ai-analysis-of-changes',
  'post-comment',
  'save-review-to-db',
];

const INNGEST_BASE_URL = (
  process.env.INNGEST_BASE_URL || 'http://localhost:8288'
).replace(/\/$/, '');
const INNGEST_SIGNING_KEY = process.env.INNGEST_SIGNING_KEY;
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

const PULL_REQUEST_ACTIONS_TO_REVIEW = ['opened', 'reopened', 'synchronize'];

function isValidGithubSignature(req) {
  const signature = req.get('x-hub-signature-256');
  if (!signature || !GITHUB_WEBHOOK_SECRET || !req.rawBody) return false;

  const expected =
    'sha256=' +
    crypto
      .createHmac('sha256', GITHUB_WEBHOOK_SECRET)
      .update(req.rawBody)
      .digest('hex');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

async function inngestApiFetch(path) {
  const res = await fetch(`${INNGEST_BASE_URL}${path}`, {
    headers: INNGEST_SIGNING_KEY
      ? { Authorization: `Bearer ${INNGEST_SIGNING_KEY}` }
      : {},
  });
  if (!res.ok) {
    throw new Error(`Inngest API ${path} responded ${res.status}`);
  }
  return res.json();
}

// Run-level status/timestamps/output preferably come from Inngest's REST
// API, and per-step history always comes from our own review_run_steps
// table (Inngest's /jobs endpoint only reflects the live execution queue,
// which is empty once a run finishes — see lib/step-tracking.js). Inngest's
// dev server doesn't persist event/run history across restarts, though, so
// if it no longer knows about this event, we fall back to deriving the run
// summary entirely from our own step data instead of failing outright.
async function getRunProgressForEvent(eventId) {
  const stepRows = await fetchStepHistory(eventId);

  let run = null;
  try {
    const runsBody = await inngestApiFetch(`/v1/events/${eventId}/runs`);
    run = runsBody.data?.[0] ?? null;
  } catch {
    run = null;
  }

  if (!run && stepRows.length === 0) return null;

  const stepsByPosition = new Map(stepRows.map((row) => [row.position, row]));

  const steps = REVIEW_STEP_NAMES.map((name, position) => {
    const row = stepsByPosition.get(position);
    if (!row) {
      return { name, position, status: 'pending', attempts: [], startedAt: null, ms: null };
    }

    const attempts = row.attempts.map((a) => ({ attempt: a.attempt, at: a.at }));
    const startedAt = row.started_at;
    const endedAt = row.status === 'running' ? new Date().toISOString() : row.ended_at;
    const ms =
      startedAt && endedAt
        ? new Date(endedAt).getTime() - new Date(startedAt).getTime()
        : null;

    return { name, position, status: row.status, attempts, startedAt, ms };
  });

  if (run) {
    return {
      runId: run.run_id,
      status: run.status,
      startedAt: run.run_started_at,
      endedAt: run.ended_at,
      output: run.output ?? null,
      steps,
    };
  }

  // Inngest has no record of this event anymore — derive everything from
  // our own step history instead.
  const anyFailed = steps.some((s) => s.status === 'failed');
  const allSettled = steps.every(
    (s) => s.status === 'succeeded' || s.status === 'retried' || s.status === 'failed',
  );
  const endedTimestamps = stepRows.map((r) => r.ended_at).filter(Boolean);

  return {
    runId: eventId,
    status: anyFailed && allSettled ? 'Failed' : allSettled ? 'Completed' : 'Running',
    startedAt: steps.find((s) => s.startedAt)?.startedAt ?? null,
    endedAt: endedTimestamps.length
      ? new Date(Math.max(...endedTimestamps.map((d) => new Date(d).getTime()))).toISOString()
      : null,
    output: null,
    steps,
  };
}

// Aggregates step success/retry counts across the last 7 days of reviews by
// replaying getRunProgressForEvent for each one. There's no persisted step
// telemetry table, so this is computed on read rather than tracked as it
// happens.
async function getStepSuccessStatsForLast7Days() {
  const { rows } = await db.query(`
    SELECT event_id FROM reviews
    WHERE event_id IS NOT NULL
      AND created_at >= now() - interval '7 days'
  `);

  let succeededSteps = 0;
  let failedSteps = 0;
  let retriedSteps = 0;

  for (const row of rows) {
    let progress;
    try {
      progress = await getRunProgressForEvent(row.event_id);
    } catch {
      continue;
    }
    if (!progress) continue;

    for (const step of progress.steps) {
      if (step.status === 'succeeded' || step.status === 'retried') {
        succeededSteps += 1;
      } else if (step.status === 'failed') {
        failedSteps += 1;
      }
      if (step.status === 'retried') {
        retriedSteps += 1;
      }
    }
  }

  const totalSteps = succeededSteps + failedSteps;
  return {
    stepSuccessRate: totalSteps > 0 ? (succeededSteps / totalSteps) * 100 : null,
    retriesLast7Days: retriedSteps,
  };
}

const app = express();

const allowedOrigins = (
  process.env.FRONTEND_URL || 'http://localhost:3001'
).split(',');

app.use(cors({ origin: allowedOrigins }));
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use('/api/inngest', serve({ client: inngest, functions }));

app.post('/webhooks/github', async (req, res) => {
  if (!isValidGithubSignature(req)) {
    return res.status(401).json({ message: 'Invalid signature' });
  }

  if (req.get('x-github-event') !== 'pull_request') {
    return res.status(200).json({ message: 'Event ignored' });
  }

  const { action, number, repository } = req.body;
  if (!PULL_REQUEST_ACTIONS_TO_REVIEW.includes(action)) {
    return res.status(200).json({ message: 'Action ignored' });
  }

  const { ids } = await inngest.send({
    name: 'github/pull_request.review',
    data: {
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: number,
    },
  });

  res.status(202).json({ message: 'Review triggered', eventId: ids[0] });
});

app.post('/reviews/trigger', async (req, res) => {
  const parsed = triggerReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: 'Invalid request body', errors: parsed.error.issues });
  }

  const { owner, repo, pull_number } = parsed.data;
  const { ids } = await inngest.send({
    name: 'github/pull_request.review',
    data: { owner, repo, pull_number },
  });

  res.status(202).json({ message: 'Review triggered', eventId: ids[0] });
});

app.get('/reviews', async (req, res) => {
  const parsed = reviewsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: 'Invalid query params', errors: parsed.error.issues });
  }

  const { limit, offset, repo, verdict, search, since } = parsed.data;

  const conditions = [];
  const params = [];

  if (repo) {
    const [repoOwner, repoName] = repo.includes('/')
      ? repo.split('/')
      : [null, repo];
    if (repoOwner) {
      params.push(repoOwner);
      conditions.push(`owner = $${params.length}`);
    }
    params.push(repoName);
    conditions.push(`repo = $${params.length}`);
  }

  if (verdict) {
    params.push(verdict);
    conditions.push(`verdict = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`pr_title ILIKE $${params.length}`);
  }

  if (since) {
    params.push(since.toISOString());
    conditions.push(`created_at >= $${params.length}`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const countResult = await db.query(
    `SELECT COUNT(*)::int AS total FROM reviews ${whereClause}`,
    params,
  );

  const limitPos = params.length + 1;
  const offsetPos = params.length + 2;
  const { rows } = await db.query(
    `SELECT * FROM reviews ${whereClause} ORDER BY created_at DESC LIMIT $${limitPos} OFFSET $${offsetPos}`,
    [...params, limit, offset],
  );

  res.json({
    data: toCamelCase(rows),
    total: countResult.rows[0].total,
    limit,
    offset,
  });
});

app.get('/owners', async (req, res) => {
  const { rows } = await db.query(
    'SELECT DISTINCT owner, repo FROM reviews ORDER BY owner, repo',
  );
  res.json({ data: toCamelCase(rows) });
});

app.get('/reviews/stats', async (req, res) => {
  const { rows } = await db.query(`
    SELECT
      COUNT(*) FILTER (
        WHERE created_at >= now() - interval '7 days'
      )::int AS reviews_last_7_days,
      COUNT(*) FILTER (
        WHERE created_at >= now() - interval '14 days'
          AND created_at < now() - interval '7 days'
      )::int AS reviews_prev_7_days,
      COALESCE(AVG(jsonb_array_length(critical_fixes::jsonb)) FILTER (
        WHERE created_at >= now() - interval '7 days'
      ), 0)::float AS avg_critical_fixes_last_7_days,
      COALESCE(AVG(jsonb_array_length(critical_fixes::jsonb)) FILTER (
        WHERE created_at >= now() - interval '14 days'
          AND created_at < now() - interval '7 days'
      ), 0)::float AS avg_critical_fixes_prev_7_days
    FROM reviews
  `);

  const stepStats = await getStepSuccessStatsForLast7Days();

  const verdictRows = await db.query(`
    SELECT verdict, COUNT(*)::int AS count
    FROM reviews
    WHERE created_at >= now() - interval '7 days'
    GROUP BY verdict
  `);

  res.json({
    ...toCamelCase(rows[0]),
    ...stepStats,
    verdictMix: toCamelCase(verdictRows.rows),
  });
});

app.get('/reviews/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM reviews WHERE id = $1', [
    req.params.id,
  ]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Review not found' });
  }
  res.json(toCamelCase(rows[0]));
});

app.get('/reviews/:id/run', async (req, res) => {
  const { rows } = await db.query(
    'SELECT event_id FROM reviews WHERE id = $1',
    [req.params.id],
  );
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Review not found' });
  }

  const eventId = rows[0].event_id;
  if (!eventId) {
    return res
      .status(404)
      .json({ message: 'No run recorded for this review' });
  }

  try {
    const progress = await getRunProgressForEvent(eventId);
    if (!progress) {
      return res
        .status(404)
        .json({ message: 'No run found for this review' });
    }
    res.json(progress);
  } catch (err) {
    res
      .status(502)
      .json({ message: 'Run history unavailable', error: err.message });
  }
});

app.get('/runs/by-event/:eventId', async (req, res) => {
  try {
    const progress = await getRunProgressForEvent(req.params.eventId);
    if (!progress) {
      return res.status(404).json({ message: 'No run found for this event' });
    }
    res.json(progress);
  } catch (err) {
    res
      .status(502)
      .json({ message: 'Run history unavailable', error: err.message });
  }
});

app.get('/reviews/:id/files', async (req, res) => {
  const reviewCheck = await db.query('SELECT id FROM reviews WHERE id = $1', [
    req.params.id,
  ]);
  if (reviewCheck.rows.length === 0) {
    return res.status(404).json({ message: 'Review not found' });
  }

  const { rows } = await db.query(
    `SELECT path, status, additions, deletions, patch
     FROM review_files
     WHERE review_id = $1
     ORDER BY id`,
    [req.params.id],
  );
  res.json({ data: toCamelCase(rows) });
});

app.get('/reviews/:owner/:repo/:pull_number', async (req, res) => {
  const { owner, repo } = req.params;
  const pullNumber = Number(req.params.pull_number);
  if (!Number.isInteger(pullNumber) || pullNumber <= 0) {
    return res
      .status(400)
      .json({ message: 'pull_number must be a positive integer' });
  }

  const { rows } = await db.query(
    `SELECT * FROM reviews
     WHERE owner = $1 AND repo = $2 AND pull_number = $3
     ORDER BY created_at DESC
     LIMIT 1`,
    [owner, repo, pullNumber],
  );
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Review not found' });
  }
  res.json(toCamelCase(rows[0]));
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
