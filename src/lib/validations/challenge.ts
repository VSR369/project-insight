/**
 * Challenge Creation Validation Schema (CHG-001)
 * 
 * Zod schema for the Challenge Creation form.
 * Validates title, description, engagement model, complexity, and visibility.
 */

import { z } from 'zod';

export const challengeSchema = z.object({
  title: z.string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be 200 characters or less'),

  description: z.string()
    .trim()
    .max(2000, 'Description must be 2,000 characters or less')
    .optional()
    .or(z.literal('')),

  engagement_model_id: z.string()
    .min(1, 'Please select an engagement model'),

  complexity_id: z.string()
    .min(1, 'Please select a complexity level'),

  visibility: z.enum(['private', 'marketplace', 'invited'], {
    errorMap: () => ({ message: 'Please select a visibility option' }),
  }).default('private'),

  solver_eligibility_id: z.string()
    .min(1, 'Please select a solver eligibility category'),
});

export type ChallengeFormValues = z.infer<typeof challengeSchema>;
