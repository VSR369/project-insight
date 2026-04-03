/**
 * displayHelpers — Shared display utility functions for challenge views.
 * Extracted from CreatorChallengeDetailView, PublicChallengeDetailPage, MyChallengesPage
 * to eliminate duplication.
 */

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function governanceLabel(profile: string | null): string {
  switch (profile) {
    case 'QUICK':
      return 'Quick';
    case 'STRUCTURED':
      return 'Structured';
    case 'CONTROLLED':
      return 'Controlled';
    default:
      return profile || '—';
  }
}

export function complexityColor(level: string | null): string {
  switch (level) {
    case 'L1': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'L2': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'L3': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'L4': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'L5': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}
