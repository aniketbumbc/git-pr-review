import express from 'express';

import { serve } from 'inngest/express';
import { inngest, functions } from './inggest/client.js';

const app = express();
app.use(express.json());

app.use('/api/inngest', serve({ client: inngest, functions }));

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
