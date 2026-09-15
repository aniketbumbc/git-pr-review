import 'dotenv/config';
import express from 'express';

import { serve } from 'inngest/express';
import { inngest } from './inggest/client.js';
import { functions } from './functions/index.js';
import { db } from './lib/db.js';

const app = express();
app.use(express.json());

app.use('/api/inngest', serve({ client: inngest, functions }));

app.get('/reviews', async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM reviews ORDER BY created_at DESC LIMIT 50',
  );
  res.json(rows);
});

app.get('/reviews/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM reviews WHERE id = $1', [
    req.params.id,
  ]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Review not found' });
  }
  res.json(rows[0]);
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
