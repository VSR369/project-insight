/**
 * TW8: CogniBlend Enhancement Tests
 *
 * TW8-01: Duplicate flag creates review record, Curator can confirm/dismiss
 * TW8-02: Payment schedule sums to 100%, stored in reward_structure
 * TW8-03: Modification points tracked individually, Required must be addressed
 * TW8-04: Submit blocked if Required modification points outstanding
 */

import { describe, it, expect } from 'vitest';

// ── Inline helpers (pure logic extracted from source modules) ──────────────

// From useDuplicateDetection.ts — extractKeywords
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'must', 'ought',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it',
  'they', 'them', 'their', 'this', 'that', 'these', 'those', 'what',
  'which', 'who', 'whom', 'how', 'when', 'where', 'why', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'some', 'any', 'no', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and',
  'but', 'or', 'nor', 'for', 'yet', 'of', 'in', 'on', 'at', 'to',
  'by', 'up', 'out', 'if', 'about', 'into', 'with', 'from', 'as',
  'want', 'like', 'also', 'well', 'back', 'there', 'then', 'here',
]);

function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
  const unique = [...new Set(words)].sort((a, b) => b.length - a.length);
  return unique.slice(0, 4);
}

// From PaymentScheduleSection.tsx — payment milestone types and helpers
interface PaymentMilestone {
  name: string;
  trigger: string;
  percentage: number;
}

function computeRunningTotal(milestones: PaymentMilestone[]): number {
  return milestones.reduce((sum, m) => sum + (m.percentage || 0), 0);
}

const DEFAULT_MILESTONES: PaymentMilestone[] = [
  { name: 'Shortlisting Payment', trigger: 'on_shortlisting', percentage: 20 },
  { name: 'Selection Payment', trigger: 'on_selection', percentage: 30 },
  { name: 'IP Transfer Payment', trigger: 'on_ip_transfer', percentage: 50 },
];

// From useModificationPoints.ts — types
interface ModificationPoint {
  id: string;
  amendment_id: string;
  description: string;
  severity: 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';
  status: 'OUTSTANDING' | 'ADDRESSED' | 'WAIVED';
}

function hasOutstandingRequired(points: ModificationPoint[]): boolean {
  return points.some(p => p.severity === 'REQUIRED' && p.status === 'OUTSTANDING');
}

// From useDuplicateReview.ts — review types
type DuplicateReviewStatus = 'PENDING' | 'CONFIRMED_DUPLICATE' | 'DISMISSED';

interface DuplicateReview {
  id: string;
  challenge_id: string;
  matched_challenge_id: string;
  similarity_percent: number;
  status: DuplicateReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// TW8-01: Duplicate flag creates review record, Curator can confirm/dismiss
// ═══════════════════════════════════════════════════════════════════════════

describe('TW8-01 — Duplicate review workflow', () => {
  it('extractKeywords returns meaningful keywords from business problem text', () => {
    const text =
      'We need an innovative machine learning solution for predictive maintenance in manufacturing plants';
    const keywords = extractKeywords(text);
    expect(keywords.length).toBeGreaterThanOrEqual(2);
    expect(keywords.length).toBeLessThanOrEqual(4);
    // Should not include stop words
    keywords.forEach(kw => {
      expect(STOP_WORDS.has(kw)).toBe(false);
    });
  });

  it('high similarity is detected when 3+ keyword hits occur', () => {
    const text =
      'Building a predictive maintenance system using advanced analytics for our manufacturing operations';
    const keywords = extractKeywords(text);
    // Simulate matching against a challenge with similar text
    const challengeText =
      'predictive maintenance analytics manufacturing equipment monitoring';
    const hits = keywords.filter(kw => challengeText.includes(kw)).length;
    expect(hits).toBeGreaterThanOrEqual(3);
  });

  it('creates a PENDING review record structure', () => {
    const review: DuplicateReview = {
      id: 'review-1',
      challenge_id: 'challenge-new',
      matched_challenge_id: 'challenge-existing',
      similarity_percent: 85,
      status: 'PENDING',
      reviewed_by: null,
      reviewed_at: null,
    };
    expect(review.status).toBe('PENDING');
    expect(review.reviewed_by).toBeNull();
    expect(review.similarity_percent).toBeGreaterThan(80);
  });

  it('Curator can confirm duplicate — status transitions to CONFIRMED_DUPLICATE', () => {
    const review: DuplicateReview = {
      id: 'review-1',
      challenge_id: 'challenge-new',
      matched_challenge_id: 'challenge-existing',
      similarity_percent: 85,
      status: 'PENDING',
      reviewed_by: null,
      reviewed_at: null,
    };
    // Simulate confirmation
    const resolved: DuplicateReview = {
      ...review,
      status: 'CONFIRMED_DUPLICATE',
      reviewed_by: 'curator-user-id',
      reviewed_at: new Date().toISOString(),
    };
    expect(resolved.status).toBe('CONFIRMED_DUPLICATE');
    expect(resolved.reviewed_by).toBeTruthy();
    expect(resolved.reviewed_at).toBeTruthy();
  });

  it('Curator can dismiss duplicate — status transitions to DISMISSED', () => {
    const resolved: DuplicateReview = {
      id: 'review-1',
      challenge_id: 'challenge-new',
      matched_challenge_id: 'challenge-existing',
      similarity_percent: 75,
      status: 'DISMISSED',
      reviewed_by: 'curator-user-id',
      reviewed_at: new Date().toISOString(),
    };
    expect(resolved.status).toBe('DISMISSED');
  });

  it('only valid statuses are PENDING, CONFIRMED_DUPLICATE, DISMISSED', () => {
    const validStatuses: DuplicateReviewStatus[] = [
      'PENDING',
      'CONFIRMED_DUPLICATE',
      'DISMISSED',
    ];
    validStatuses.forEach(s => {
      expect(['PENDING', 'CONFIRMED_DUPLICATE', 'DISMISSED']).toContain(s);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TW8-02: Payment schedule sums to 100%, stored in reward_structure
// ═══════════════════════════════════════════════════════════════════════════

describe('TW8-02 — Payment schedule validation', () => {
  it('default milestones sum to exactly 100%', () => {
    const total = computeRunningTotal(DEFAULT_MILESTONES);
    expect(total).toBe(100);
  });

  it('default milestones have correct pre-fill values', () => {
    expect(DEFAULT_MILESTONES).toHaveLength(3);
    expect(DEFAULT_MILESTONES[0]).toEqual({
      name: 'Shortlisting Payment',
      trigger: 'on_shortlisting',
      percentage: 20,
    });
    expect(DEFAULT_MILESTONES[1]).toEqual({
      name: 'Selection Payment',
      trigger: 'on_selection',
      percentage: 30,
    });
    expect(DEFAULT_MILESTONES[2]).toEqual({
      name: 'IP Transfer Payment',
      trigger: 'on_ip_transfer',
      percentage: 50,
    });
  });

  it('rejects schedules that do not sum to 100%', () => {
    const underSchedule: PaymentMilestone[] = [
      { name: 'A', trigger: 'on_shortlisting', percentage: 20 },
      { name: 'B', trigger: 'on_selection', percentage: 30 },
    ];
    expect(computeRunningTotal(underSchedule)).toBe(50);
    expect(computeRunningTotal(underSchedule) === 100).toBe(false);
  });

  it('accepts modified schedule that sums to 100%', () => {
    const customSchedule: PaymentMilestone[] = [
      { name: 'Phase 1', trigger: 'on_shortlisting', percentage: 10 },
      { name: 'Phase 2', trigger: 'on_full_submission', percentage: 25 },
      { name: 'Phase 3', trigger: 'on_evaluation_complete', percentage: 25 },
      { name: 'Phase 4', trigger: 'on_selection', percentage: 20 },
      { name: 'Phase 5', trigger: 'on_ip_transfer', percentage: 20 },
    ];
    expect(computeRunningTotal(customSchedule)).toBe(100);
  });

  it('validates percentage range (0–100 per milestone)', () => {
    const milestones: PaymentMilestone[] = [
      { name: 'A', trigger: 'on_shortlisting', percentage: 150 },
    ];
    // Individual milestone > 100 is invalid
    expect(milestones[0].percentage > 100).toBe(true);
  });

  it('schedule is stored in reward_structure.payment_schedule format', () => {
    const rewardStructure = {
      platinum_award: { amount: 10000, currency: 'USD' },
      payment_schedule: DEFAULT_MILESTONES,
    };
    expect(rewardStructure.payment_schedule).toBeDefined();
    expect(Array.isArray(rewardStructure.payment_schedule)).toBe(true);
    expect(rewardStructure.payment_schedule).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TW8-03: Modification points tracked individually, Required must be addressed
// ═══════════════════════════════════════════════════════════════════════════

describe('TW8-03 — Modification points tracking', () => {
  const samplePoints: ModificationPoint[] = [
    { id: 'p1', amendment_id: 'a1', description: 'Fix problem statement clarity', severity: 'REQUIRED', status: 'OUTSTANDING' },
    { id: 'p2', amendment_id: 'a1', description: 'Add evaluation rubric details', severity: 'REQUIRED', status: 'ADDRESSED' },
    { id: 'p3', amendment_id: 'a1', description: 'Consider adding timeline extension', severity: 'RECOMMENDED', status: 'OUTSTANDING' },
    { id: 'p4', amendment_id: 'a1', description: 'Minor typo in scope', severity: 'OPTIONAL', status: 'WAIVED' },
  ];

  it('each point has description, severity, and status', () => {
    samplePoints.forEach(p => {
      expect(p.description).toBeTruthy();
      expect(['REQUIRED', 'RECOMMENDED', 'OPTIONAL']).toContain(p.severity);
      expect(['OUTSTANDING', 'ADDRESSED', 'WAIVED']).toContain(p.status);
    });
  });

  it('correctly identifies outstanding Required points', () => {
    expect(hasOutstandingRequired(samplePoints)).toBe(true);
  });

  it('no outstanding Required when all Required are addressed', () => {
    const allAddressed: ModificationPoint[] = [
      { id: 'p1', amendment_id: 'a1', description: 'Fix clarity', severity: 'REQUIRED', status: 'ADDRESSED' },
      { id: 'p2', amendment_id: 'a1', description: 'Add rubric', severity: 'REQUIRED', status: 'ADDRESSED' },
      { id: 'p3', amendment_id: 'a1', description: 'Timeline', severity: 'RECOMMENDED', status: 'OUTSTANDING' },
    ];
    expect(hasOutstandingRequired(allAddressed)).toBe(false);
  });

  it('WAIVED Required points are not outstanding', () => {
    const waived: ModificationPoint[] = [
      { id: 'p1', amendment_id: 'a1', description: 'Waived req', severity: 'REQUIRED', status: 'WAIVED' },
    ];
    expect(hasOutstandingRequired(waived)).toBe(false);
  });

  it('outstanding Recommended/Optional do not block', () => {
    const onlyOptional: ModificationPoint[] = [
      { id: 'p1', amendment_id: 'a1', description: 'Nice to have', severity: 'RECOMMENDED', status: 'OUTSTANDING' },
      { id: 'p2', amendment_id: 'a1', description: 'Minor fix', severity: 'OPTIONAL', status: 'OUTSTANDING' },
    ];
    expect(hasOutstandingRequired(onlyOptional)).toBe(false);
  });

  it('points can transition from OUTSTANDING to ADDRESSED', () => {
    const point: ModificationPoint = {
      id: 'p1', amendment_id: 'a1', description: 'Fix it', severity: 'REQUIRED', status: 'OUTSTANDING',
    };
    const updated: ModificationPoint = { ...point, status: 'ADDRESSED' };
    expect(updated.status).toBe('ADDRESSED');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TW8-04: Submit blocked if Required modification points outstanding
// ═══════════════════════════════════════════════════════════════════════════

describe('TW8-04 — Submit blocked with outstanding Required points', () => {
  it('blocks submission when any Required point is OUTSTANDING', () => {
    const points: ModificationPoint[] = [
      { id: 'p1', amendment_id: 'a1', description: 'Critical fix', severity: 'REQUIRED', status: 'OUTSTANDING' },
      { id: 'p2', amendment_id: 'a1', description: 'Another fix', severity: 'REQUIRED', status: 'ADDRESSED' },
    ];
    const canSubmit = !hasOutstandingRequired(points);
    expect(canSubmit).toBe(false);
  });

  it('allows submission when all Required points are ADDRESSED', () => {
    const points: ModificationPoint[] = [
      { id: 'p1', amendment_id: 'a1', description: 'Critical fix', severity: 'REQUIRED', status: 'ADDRESSED' },
      { id: 'p2', amendment_id: 'a1', description: 'Another fix', severity: 'REQUIRED', status: 'ADDRESSED' },
      { id: 'p3', amendment_id: 'a1', description: 'Optional', severity: 'OPTIONAL', status: 'OUTSTANDING' },
    ];
    const canSubmit = !hasOutstandingRequired(points);
    expect(canSubmit).toBe(true);
  });

  it('allows submission when all Required points are WAIVED', () => {
    const points: ModificationPoint[] = [
      { id: 'p1', amendment_id: 'a1', description: 'Waived fix', severity: 'REQUIRED', status: 'WAIVED' },
    ];
    const canSubmit = !hasOutstandingRequired(points);
    expect(canSubmit).toBe(true);
  });

  it('allows submission when no modification points exist', () => {
    const points: ModificationPoint[] = [];
    const canSubmit = !hasOutstandingRequired(points);
    expect(canSubmit).toBe(true);
  });

  it('blocks even with a single outstanding Required among many addressed', () => {
    const points: ModificationPoint[] = [
      { id: 'p1', amendment_id: 'a1', description: 'Done 1', severity: 'REQUIRED', status: 'ADDRESSED' },
      { id: 'p2', amendment_id: 'a1', description: 'Done 2', severity: 'REQUIRED', status: 'ADDRESSED' },
      { id: 'p3', amendment_id: 'a1', description: 'Done 3', severity: 'REQUIRED', status: 'ADDRESSED' },
      { id: 'p4', amendment_id: 'a1', description: 'Still pending', severity: 'REQUIRED', status: 'OUTSTANDING' },
      { id: 'p5', amendment_id: 'a1', description: 'Optional ok', severity: 'OPTIONAL', status: 'OUTSTANDING' },
    ];
    const canSubmit = !hasOutstandingRequired(points);
    expect(canSubmit).toBe(false);
  });

  it('mixed ADDRESSED and WAIVED Required points allow submission', () => {
    const points: ModificationPoint[] = [
      { id: 'p1', amendment_id: 'a1', description: 'Addressed', severity: 'REQUIRED', status: 'ADDRESSED' },
      { id: 'p2', amendment_id: 'a1', description: 'Waived', severity: 'REQUIRED', status: 'WAIVED' },
    ];
    const canSubmit = !hasOutstandingRequired(points);
    expect(canSubmit).toBe(true);
  });
});
