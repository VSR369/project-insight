/**
 * Register page constants — role info, timezone options, type aliases.
 */

import { Briefcase, ClipboardCheck, Shield } from 'lucide-react';

export type RoleTab = 'provider' | 'reviewer' | 'admin';
export type ProviderSubTab = 'experienced' | 'student';

export const ROLE_INFO = {
  provider: {
    icon: Briefcase,
    title: 'Solution Provider',
    description: 'Share your expertise and connect with organizations seeking innovative solutions',
    color: 'text-primary',
  },
  reviewer: {
    icon: ClipboardCheck,
    title: 'Panel Reviewer',
    description: 'Evaluate solution providers and conduct interviews (requires admin approval)',
    color: 'text-green-600',
  },
  admin: {
    icon: Shield,
    title: 'Platform Admin',
    description: 'Manage the platform, users, and system configuration (restricted access)',
    color: 'text-destructive',
  },
} as const;

export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Calcutta', label: 'India (IST)' },
  { value: 'America/New_York', label: 'US Eastern (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (PST/PDT)' },
  { value: 'Europe/London', label: 'UK (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET/CEST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Australia Eastern (AEST/AEDT)' },
] as const;
