import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';

import { serve } from 'inngest/express';
import { inngest } from './inggest/client.js';
import { functions } from './functions/index.js';
import { db } from './lib/db.js';
import { toCamelCase } from './lib/case.js';

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

const app = express();

const allowedOrigins = (
  process.env.FRONTEND_URL || 'http://localhost:3001'
).split(',');

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use('/api/inngest', serve({ client: inngest, functions }));

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

  res.json(toCamelCase(rows[0]));
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
