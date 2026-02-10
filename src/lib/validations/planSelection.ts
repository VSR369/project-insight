/**
 * Plan Selection Validation Schema (REG-004)
 * 
 * Zod schema for Step 4: Tier, billing cycle, engagement model.
 * Business Rules: BR-REG-011, BR-REG-013, BR-REG-014, BR-REG-015
 */

import { z } from 'zod';

export const planSelectionSchema = z.object({
  tier_id: z.string().min(1, 'Please select a subscription tier'),
  billing_cycle_id: z.string().min(1, 'Please select a billing cycle'),
  engagement_model_id: z.string().optional(),
});

export type PlanSelectionFormValues = z.infer<typeof planSelectionSchema>;
