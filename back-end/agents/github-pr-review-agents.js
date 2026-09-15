import { Agent } from '@openai/agents';
import { z } from 'zod';

export const prReviewAgentSchema = z.object({
  critical_fixes: z
    .array(z.string())
    .optional()
    .nullable()
    .describe('A list of critical fixes to the code'),
  suggestions: z
    .array(z.string())
    .optional()
    .nullable()
    .describe('A list of suggestions for the code'),
  content: z.string().describe('A detailed review of the code'),
  event: z.enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT']),
});

export const prReviewAgent = new Agent({
  name: 'pr-review-agent',
  outputType: prReviewAgentSchema,
  instructions:
    'You are a helpful expert that reviews a pull request and understand changes the code. Suggest and give a detailed review the code and fixes if any, your comments are important. Use emojis to make your comments more engaging and friendly.',
});
