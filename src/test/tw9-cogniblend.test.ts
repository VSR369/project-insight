/**
 * TW9 — SLA Escalation, Auto-Hold, Notification Routing, Configurable Thresholds
 *
 * Tests cover:
 *  TW9-01: SLA breach escalation tiers 0→1→2→3 over time
 *  TW9-02: Auto-hold on breach when configured
 *  TW9-03: Notifications sent to primary + CC roles per routing matrix
 *  TW9-04: Configurable breach thresholds per phase
 */

import { describe, it, expect } from 'vitest';
import {
  parsePhaseScheduleThresholds,
  computeAutoHold,
  getEscalationTierLabel,
  getEscalationTierColor,
} from '@/services/slaEscalationService';

// ─── Helpers: simulate escalation logic (mirrors process_sla_escalation) ───

interface SLATimer {
  timer_id: string;
  challenge_id: string;
  phase: number;
  role_code: string;
  status: string;
  deadline_at: string;
  breached_at: string | null;
  escalation_tier: number;
  auto_hold_on_breach: boolean;
  last_escalated_at: string | null;
}

interface EscalationResult {
  timer_id: string;
  new_tier: number;
  notified_roles: string[];
  auto_held: boolean;
}

/**
 * Pure simulation of the DB function process_sla_escalation logic.
 */
function simulateEscalation(timer: SLATimer, nowDate: Date): EscalationResult {
  if (timer.status !== 'BREACHED' || !timer.breached_at) {
    return { timer_id: timer.timer_id, new_tier: timer.escalation_tier, notified_roles: [], auto_held: false };
  }

  const breachedAt = new Date(timer.breached_at);
  const daysSinceBreach = (nowDate.getTime() - breachedAt.getTime()) / (1000 * 60 * 60 * 24);

  let newTier = timer.escalation_tier;
  const notifiedRoles: string[] = [];
  let autoHeld = false;

  // Tier 0 → 1: immediate on breach
  if (timer.escalation_tier === 0) {
    newTier = 1;
    notifiedRoles.push(timer.role_code); // assigned user
  }
  // Tier 1 → 2: 2+ days breached
  else if (timer.escalation_tier === 1 && daysSinceBreach >= 2) {
    newTier = 2;
    notifiedRoles.push(timer.role_code, 'ORG_ADMIN');
  }
  // Tier 2 → 3: 5+ days breached
  else if (timer.escalation_tier === 2 && daysSinceBreach >= 5) {
    newTier = 3;
    notifiedRoles.push('PLATFORM_ADMIN');

    if (timer.auto_hold_on_breach) {
      autoHeld = true;
    }
  }

  return { timer_id: timer.timer_id, new_tier: newTier, notified_roles: notifiedRoles, auto_held: autoHeld };
}

// ─── Helpers: simulate notification routing fan-out ───

interface RoutingRule {
  phase: number;
  event_type: string;
  primary_recipient_role: string;
  cc_roles: string[];
  escalation_roles: string[];
  is_active: boolean;
}

function resolveRoutingRecipients(rule: RoutingRule): string[] {
  const roles = new Set<string>();
  roles.add(rule.primary_recipient_role);
  (rule.cc_roles ?? []).forEach((r) => roles.add(r));
  (rule.escalation_roles ?? []).forEach((r) => roles.add(r));
  return [...roles];
}

// ─── Seed data: BRD §7.2 routing matrix ───

const ROUTING_MATRIX: RoutingRule[] = [
  { phase: 1, event_type: 'SLA_WARNING',   primary_recipient_role: 'AM', cc_roles: ['ID'], escalation_roles: [], is_active: true },
  { phase: 1, event_type: 'SLA_BREACH',    primary_recipient_role: 'AM', cc_roles: ['ID'], escalation_roles: ['ORG_ADMIN'], is_active: true },
  { phase: 1, event_type: 'PHASE_COMPLETE', primary_recipient_role: 'AM', cc_roles: ['ID'], escalation_roles: [], is_active: true },
  { phase: 2, event_type: 'SLA_WARNING',   primary_recipient_role: 'CR', cc_roles: ['CU'], escalation_roles: [], is_active: true },
  { phase: 2, event_type: 'SLA_BREACH',    primary_recipient_role: 'CR', cc_roles: ['CU'], escalation_roles: ['ORG_ADMIN'], is_active: true },
  { phase: 3, event_type: 'SLA_WARNING',   primary_recipient_role: 'CU', cc_roles: ['ID'], escalation_roles: [], is_active: true },
  { phase: 3, event_type: 'PHASE_COMPLETE', primary_recipient_role: 'CU', cc_roles: ['ID'], escalation_roles: [], is_active: true },
  { phase: 4, event_type: 'SLA_BREACH',    primary_recipient_role: 'ID', cc_roles: ['ORG_ADMIN'], escalation_roles: [], is_active: true },
  { phase: 5, event_type: 'PHASE_COMPLETE', primary_recipient_role: 'ID', cc_roles: ['FC'], escalation_roles: [], is_active: true },
  { phase: 8, event_type: 'SLA_WARNING',   primary_recipient_role: 'ER', cc_roles: ['ID'], escalation_roles: [], is_active: true },
  { phase: 8, event_type: 'SLA_BREACH',    primary_recipient_role: 'ER', cc_roles: ['ID'], escalation_roles: ['ORG_ADMIN'], is_active: true },
];

// ═══════════════════════════════════════════════════════════════════
// TW9-01: SLA breach escalation tiers 0→1→2→3 over time
// ═══════════════════════════════════════════════════════════════════

describe('TW9-01: SLA breach escalation tiers', () => {
  const baseTimer: SLATimer = {
    timer_id: 'timer-001',
    challenge_id: 'ch-001',
    phase: 3,
    role_code: 'CU',
    status: 'BREACHED',
    deadline_at: '2026-03-10T00:00:00Z',
    breached_at: '2026-03-10T00:00:00Z',
    escalation_tier: 0,
    auto_hold_on_breach: false,
    last_escalated_at: null,
  };

  it('should escalate tier 0 → 1 immediately on breach', () => {
    const result = simulateEscalation(baseTimer, new Date('2026-03-10T01:00:00Z'));
    expect(result.new_tier).toBe(1);
    expect(result.notified_roles).toContain('CU');
  });

  it('should escalate tier 1 → 2 after 2+ days', () => {
    const timer = { ...baseTimer, escalation_tier: 1 };
    const result = simulateEscalation(timer, new Date('2026-03-12T01:00:00Z'));
    expect(result.new_tier).toBe(2);
    expect(result.notified_roles).toContain('CU');
    expect(result.notified_roles).toContain('ORG_ADMIN');
  });

  it('should NOT escalate tier 1 → 2 before 2 days', () => {
    const timer = { ...baseTimer, escalation_tier: 1 };
    const result = simulateEscalation(timer, new Date('2026-03-11T12:00:00Z'));
    expect(result.new_tier).toBe(1);
    expect(result.notified_roles).toHaveLength(0);
  });

  it('should escalate tier 2 → 3 after 5+ days', () => {
    const timer = { ...baseTimer, escalation_tier: 2 };
    const result = simulateEscalation(timer, new Date('2026-03-15T01:00:00Z'));
    expect(result.new_tier).toBe(3);
    expect(result.notified_roles).toContain('PLATFORM_ADMIN');
  });

  it('should NOT escalate tier 2 → 3 before 5 days', () => {
    const timer = { ...baseTimer, escalation_tier: 2 };
    const result = simulateEscalation(timer, new Date('2026-03-14T00:00:00Z'));
    expect(result.new_tier).toBe(2);
    expect(result.notified_roles).toHaveLength(0);
  });

  it('should not escalate non-breached timers', () => {
    const timer = { ...baseTimer, status: 'ACTIVE', breached_at: null };
    const result = simulateEscalation(timer, new Date('2026-03-20T00:00:00Z'));
    expect(result.new_tier).toBe(0);
    expect(result.notified_roles).toHaveLength(0);
  });

  it('should have correct tier labels', () => {
    expect(getEscalationTierLabel(0)).toBe('No Escalation');
    expect(getEscalationTierLabel(1)).toContain('Tier 1');
    expect(getEscalationTierLabel(2)).toContain('Tier 2');
    expect(getEscalationTierLabel(3)).toContain('Tier 3');
  });

  it('should have correct tier colors', () => {
    expect(getEscalationTierColor(0)).toContain('muted');
    expect(getEscalationTierColor(1)).toContain('amber');
    expect(getEscalationTierColor(2)).toContain('orange');
    expect(getEscalationTierColor(3)).toContain('destructive');
  });
});

// ═══════════════════════════════════════════════════════════════════
// TW9-02: Auto-hold on breach when configured
// ═══════════════════════════════════════════════════════════════════

describe('TW9-02: Auto-hold on breach when configured', () => {
  const baseTimer: SLATimer = {
    timer_id: 'timer-002',
    challenge_id: 'ch-002',
    phase: 4,
    role_code: 'ID',
    status: 'BREACHED',
    deadline_at: '2026-03-05T00:00:00Z',
    breached_at: '2026-03-05T00:00:00Z',
    escalation_tier: 2,
    auto_hold_on_breach: true,
    last_escalated_at: '2026-03-07T00:00:00Z',
  };

  it('should auto-hold at tier 3 when auto_hold_on_breach is true', () => {
    const result = simulateEscalation(baseTimer, new Date('2026-03-10T01:00:00Z'));
    expect(result.new_tier).toBe(3);
    expect(result.auto_held).toBe(true);
  });

  it('should NOT auto-hold at tier 3 when auto_hold_on_breach is false', () => {
    const timer = { ...baseTimer, auto_hold_on_breach: false };
    const result = simulateEscalation(timer, new Date('2026-03-10T01:00:00Z'));
    expect(result.new_tier).toBe(3);
    expect(result.auto_held).toBe(false);
  });

  it('should NOT auto-hold below tier 3 even if flag is true', () => {
    const timer = { ...baseTimer, escalation_tier: 1 };
    const result = simulateEscalation(timer, new Date('2026-03-07T01:00:00Z'));
    expect(result.new_tier).toBe(2);
    expect(result.auto_held).toBe(false);
  });

  it('should derive auto_hold from phase_schedule config', () => {
    const schedule = [
      { phase: 3, duration_days: 5, auto_hold: false },
      { phase: 4, duration_days: 7, auto_hold: true },
    ];
    expect(computeAutoHold(schedule, 4)).toBe(true);
    expect(computeAutoHold(schedule, 3)).toBe(false);
    expect(computeAutoHold(schedule, 99)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// TW9-03: Notifications sent to primary + CC roles per routing matrix
// ═══════════════════════════════════════════════════════════════════

describe('TW9-03: Notification routing fan-out to primary + CC', () => {
  it('Phase 1 SLA_WARNING → AM (primary), ID (cc)', () => {
    const rule = ROUTING_MATRIX.find((r) => r.phase === 1 && r.event_type === 'SLA_WARNING')!;
    const recipients = resolveRoutingRecipients(rule);
    expect(recipients).toContain('AM');
    expect(recipients).toContain('ID');
    expect(recipients).toHaveLength(2);
  });

  it('Phase 1 SLA_BREACH → AM (primary), ID (cc), ORG_ADMIN (escalation)', () => {
    const rule = ROUTING_MATRIX.find((r) => r.phase === 1 && r.event_type === 'SLA_BREACH')!;
    const recipients = resolveRoutingRecipients(rule);
    expect(recipients).toContain('AM');
    expect(recipients).toContain('ID');
    expect(recipients).toContain('ORG_ADMIN');
    expect(recipients).toHaveLength(3);
  });

  it('Phase 2 SLA_WARNING → CR (primary), CU (cc)', () => {
    const rule = ROUTING_MATRIX.find((r) => r.phase === 2 && r.event_type === 'SLA_WARNING')!;
    const recipients = resolveRoutingRecipients(rule);
    expect(recipients).toContain('CR');
    expect(recipients).toContain('CU');
    expect(recipients).toHaveLength(2);
  });

  it('Phase 3 PHASE_COMPLETE → CU (primary), ID (cc)', () => {
    const rule = ROUTING_MATRIX.find((r) => r.phase === 3 && r.event_type === 'PHASE_COMPLETE')!;
    const recipients = resolveRoutingRecipients(rule);
    expect(recipients).toContain('CU');
    expect(recipients).toContain('ID');
    expect(recipients).toHaveLength(2);
  });

  it('Phase 5 PHASE_COMPLETE → ID (primary), FC (cc for escrow)', () => {
    const rule = ROUTING_MATRIX.find((r) => r.phase === 5 && r.event_type === 'PHASE_COMPLETE')!;
    const recipients = resolveRoutingRecipients(rule);
    expect(recipients).toContain('ID');
    expect(recipients).toContain('FC');
    expect(recipients).toHaveLength(2);
  });

  it('Phase 8 SLA_BREACH → ER (primary), ID (cc), ORG_ADMIN (escalation)', () => {
    const rule = ROUTING_MATRIX.find((r) => r.phase === 8 && r.event_type === 'SLA_BREACH')!;
    const recipients = resolveRoutingRecipients(rule);
    expect(recipients).toContain('ER');
    expect(recipients).toContain('ID');
    expect(recipients).toContain('ORG_ADMIN');
    expect(recipients).toHaveLength(3);
  });

  it('should deduplicate roles when primary appears in cc', () => {
    const rule: RoutingRule = {
      phase: 99,
      event_type: 'TEST',
      primary_recipient_role: 'AM',
      cc_roles: ['AM', 'ID'],
      escalation_roles: ['AM'],
      is_active: true,
    };
    const recipients = resolveRoutingRecipients(rule);
    expect(recipients).toHaveLength(2); // AM + ID, deduplicated
  });

  it('should handle empty cc_roles and escalation_roles', () => {
    const rule: RoutingRule = {
      phase: 10,
      event_type: 'TEST',
      primary_recipient_role: 'ID',
      cc_roles: [],
      escalation_roles: [],
      is_active: true,
    };
    const recipients = resolveRoutingRecipients(rule);
    expect(recipients).toEqual(['ID']);
  });
});

// ═══════════════════════════════════════════════════════════════════
// TW9-04: Configurable breach thresholds per phase
// ═══════════════════════════════════════════════════════════════════

describe('TW9-04: Configurable breach thresholds per phase_schedule', () => {
  const phaseSchedule = [
    { phase: 1, duration_days: 3, warn_at_percent: 70, breach_at_percent: 100, auto_hold: false },
    { phase: 2, duration_days: 5, warn_at_percent: 80, breach_at_percent: 95, auto_hold: false },
    { phase: 3, duration_days: 7, warn_at_percent: 75, breach_at_percent: 100, auto_hold: true },
    { phase_number: 4, duration: 10, auto_hold: true },
  ];

  it('should parse thresholds for phase 1', () => {
    const config = parsePhaseScheduleThresholds(phaseSchedule, 1);
    expect(config).not.toBeNull();
    expect(config!.duration_days).toBe(3);
    expect(config!.warn_at_percent).toBe(70);
    expect(config!.breach_at_percent).toBe(100);
    expect(config!.auto_hold).toBe(false);
  });

  it('should parse custom breach threshold for phase 2 (95%)', () => {
    const config = parsePhaseScheduleThresholds(phaseSchedule, 2);
    expect(config).not.toBeNull();
    expect(config!.breach_at_percent).toBe(95);
    expect(config!.warn_at_percent).toBe(80);
  });

  it('should parse auto_hold = true for phase 3', () => {
    const config = parsePhaseScheduleThresholds(phaseSchedule, 3);
    expect(config).not.toBeNull();
    expect(config!.auto_hold).toBe(true);
    expect(config!.duration_days).toBe(7);
  });

  it('should handle alternate key names (phase_number, duration)', () => {
    const config = parsePhaseScheduleThresholds(phaseSchedule, 4);
    expect(config).not.toBeNull();
    expect(config!.duration_days).toBe(10);
    expect(config!.auto_hold).toBe(true);
    // defaults for missing fields
    expect(config!.warn_at_percent).toBe(75);
    expect(config!.breach_at_percent).toBe(100);
  });

  it('should return null for missing phase', () => {
    const config = parsePhaseScheduleThresholds(phaseSchedule, 99);
    expect(config).toBeNull();
  });

  it('should return null for null/undefined schedule', () => {
    expect(parsePhaseScheduleThresholds(null, 1)).toBeNull();
    expect(parsePhaseScheduleThresholds(undefined, 1)).toBeNull();
  });

  it('should return null for non-array schedule', () => {
    expect(parsePhaseScheduleThresholds({ phase: 1 }, 1)).toBeNull();
    expect(parsePhaseScheduleThresholds('invalid', 1)).toBeNull();
  });

  it('should apply defaults for missing threshold fields', () => {
    const minimal = [{ phase: 5 }];
    const config = parsePhaseScheduleThresholds(minimal, 5);
    expect(config).not.toBeNull();
    expect(config!.duration_days).toBe(7);
    expect(config!.warn_at_percent).toBe(75);
    expect(config!.breach_at_percent).toBe(100);
    expect(config!.auto_hold).toBe(false);
  });
});
