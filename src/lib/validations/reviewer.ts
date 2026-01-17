/**
 * Panel Reviewer Validation Schema
 * 
 * Shared validation schema for panel reviewer invitation and management.
 */

import { z } from 'zod';

// Panel Reviewer form validation schema
export const panelReviewerSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  email: z.string()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  phone: z.string()
    .min(10, "Phone must be at least 10 digits")
    .max(20, "Phone must be less than 20 characters")
    .optional()
    .or(z.literal("")),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be less than 72 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .optional()
    .or(z.literal("")),
  industry_segment_ids: z.array(z.string().uuid())
    .min(1, "Select at least one industry segment"),
  expertise_level_ids: z.array(z.string().uuid())
    .min(1, "Select at least one expertise level"),
  years_experience: z.coerce.number().int().min(0).max(50).optional(),
  timezone: z.string().default("Asia/Calcutta"),
  languages: z.array(z.string()).default([]),
  max_interviews_per_day: z.coerce.number().int().min(1).max(20).default(4),
  is_active: z.boolean().default(true),
  notes: z.string().max(1000).optional(),
});

export type PanelReviewerFormData = z.infer<typeof panelReviewerSchema>;

// Invitation settings schema
export const invitationSettingsSchema = z.object({
  channel: z.enum(["email", "sms", "both"]).default("email"),
  message: z.string().max(1000).optional(),
  expiry_days: z.coerce.number().int().min(1).max(90).default(14),
});

export type InvitationSettingsData = z.infer<typeof invitationSettingsSchema>;

// Combined schema for the full invite form
export const reviewerInviteSchema = panelReviewerSchema.merge(invitationSettingsSchema);

export type ReviewerInviteFormData = z.infer<typeof reviewerInviteSchema>;

// Default invitation message template
export const DEFAULT_INVITATION_MESSAGE = 
  "We are pleased to invite you to join our Review Panel. Your expertise will help us evaluate and qualify solution providers on our platform.";

// Common timezone options
export const TIMEZONE_OPTIONS = [
  { value: "Asia/Calcutta", label: "India (IST)" },
  { value: "America/New_York", label: "US Eastern (EST/EDT)" },
  { value: "America/Los_Angeles", label: "US Pacific (PST/PDT)" },
  { value: "Europe/London", label: "UK (GMT/BST)" },
  { value: "Europe/Paris", label: "Central Europe (CET/CEST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Dubai", label: "UAE (GST)" },
  { value: "Australia/Sydney", label: "Australia Eastern (AEST/AEDT)" },
];

// Expiry options
export const EXPIRY_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
];

// Years of experience options
export const EXPERIENCE_OPTIONS = [
  { value: 0, label: "0-2 years" },
  { value: 3, label: "3-5 years" },
  { value: 6, label: "6-10 years" },
  { value: 11, label: "11-15 years" },
  { value: 16, label: "16-20 years" },
  { value: 21, label: "20+ years" },
];
