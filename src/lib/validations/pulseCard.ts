/**
 * PulsePages - Zod Validation Schemas
 */

import { z } from 'zod';
import { CARD_LIMITS } from '@/constants/pulseCards.constants';

// ===========================================
// Card Schemas
// ===========================================

export const createCardSchema = z.object({
  topic_id: z.string().uuid('Please select a topic'),
  content_text: z
    .string()
    .min(1, 'Content is required')
    .max(CARD_LIMITS.MAX_CONTENT_LENGTH, `Maximum ${CARD_LIMITS.MAX_CONTENT_LENGTH} characters allowed`),
  media_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  media_type: z.enum(['image', 'video']).optional(),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;

// ===========================================
// Layer Schemas
// ===========================================

export const createLayerSchema = z.object({
  card_id: z.string().uuid('Card ID is required'),
  content_text: z
    .string()
    .min(1, 'Content is required')
    .max(CARD_LIMITS.MAX_CONTENT_LENGTH, `Maximum ${CARD_LIMITS.MAX_CONTENT_LENGTH} characters allowed`),
  media_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  media_type: z.enum(['image', 'video']).optional(),
  parent_layer_id: z.string().uuid().optional(),
});

export type CreateLayerInput = z.infer<typeof createLayerSchema>;

// ===========================================
// Vote Schemas
// ===========================================

export const voteSchema = z.object({
  layer_id: z.string().uuid('Layer ID is required'),
  vote_type: z.enum(['up', 'down']),
});

export type VoteInput = z.infer<typeof voteSchema>;

// ===========================================
// Flag Schemas
// ===========================================

export const flagSchema = z.object({
  target_type: z.enum(['card', 'layer']),
  target_id: z.string().uuid('Target ID is required'),
  flag_type: z.enum(['spam', 'false_claim', 'uncited', 'unconstructive', 'other']),
  description: z.string().max(500, 'Description too long').optional(),
});

export type FlagInput = z.infer<typeof flagSchema>;

// ===========================================
// Topic Schemas
// ===========================================

export const createTopicSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().max(500, 'Description too long').optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
  industry_segment_id: z.string().uuid().optional(),
});

export type CreateTopicInput = z.infer<typeof createTopicSchema>;
