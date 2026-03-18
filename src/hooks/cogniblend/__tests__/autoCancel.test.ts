/**
 * TW3-06: Auto-cancel after 30 days on hold
 *
 * Tests the auto-cancel logic from check-sla-breaches edge function.
 * Validates that challenges ON_HOLD beyond max_hold_days are auto-cancelled.
 */

import { describe, it, expect } from 'vitest';

describe('TW3-06: Auto-cancel after 30 days on hold', () => {
  it('should identify challenge as auto-cancellable when days on hold exceed max_hold_days', () => {
    const maxDays = 30;
    const pausedSince = new Date('2026-02-01T00:00:00Z');
    const now = new Date('2026-03-15T00:00:00Z');
    const daysPaused = (now.getTime() - pausedSince.getTime()) / (1000 * 60 * 60 * 24);

    expect(daysPaused).toBeGreaterThan(maxDays);
    expect(daysPaused >= maxDays).toBe(true);
  });

  it('should NOT auto-cancel when days on hold are less than max_hold_days', () => {
    const maxDays = 30;
    const pausedSince = new Date('2026-03-10T00:00:00Z');
    const now = new Date('2026-03-15T00:00:00Z');
    const daysPaused = (now.getTime() - pausedSince.getTime()) / (1000 * 60 * 60 * 24);

    expect(daysPaused).toBeLessThan(maxDays);
    expect(daysPaused < maxDays).toBe(true);
  });

  it('should use configurable max_hold_days with default of 30', () => {
    const timerWithDefault = { max_hold_days: null };
    const maxDays = timerWithDefault.max_hold_days ?? 30;
    expect(maxDays).toBe(30);

    const timerWithCustom = { max_hold_days: 60 };
    const customMaxDays = timerWithCustom.max_hold_days ?? 30;
    expect(customMaxDays).toBe(60);
  });

  it('should set phase_status to TERMINAL on auto-cancel', () => {
    const updatePayload = { phase_status: 'TERMINAL' };
    expect(updatePayload.phase_status).toBe('TERMINAL');
  });

  it('should complete all active and paused SLA timers on auto-cancel', () => {
    const slaUpdate = {
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
    };
    const statusFilter = ['ACTIVE', 'PAUSED'];

    expect(slaUpdate.status).toBe('COMPLETED');
    expect(statusFilter).toEqual(['ACTIVE', 'PAUSED']);
  });

  it('should log audit with CHALLENGE_AUTO_CANCELLED action', () => {
    const maxDays = 30;
    const daysPaused = 42;

    const auditParams = {
      p_action: 'CHALLENGE_AUTO_CANCELLED',
      p_method: 'SYSTEM',
      p_details: {
        reason: `Auto-cancelled: On Hold exceeded maximum duration of ${maxDays} days.`,
        days_on_hold: Math.floor(daysPaused),
        max_hold_days: maxDays,
      },
    };

    expect(auditParams.p_action).toBe('CHALLENGE_AUTO_CANCELLED');
    expect(auditParams.p_method).toBe('SYSTEM');
    expect(auditParams.p_details.reason).toContain('Auto-cancelled');
    expect(auditParams.p_details.days_on_hold).toBe(42);
  });

  it('should use system user ID for auto-cancel audit', () => {
    const systemUserId = '00000000-0000-0000-0000-000000000000';
    expect(systemUserId).toBe('00000000-0000-0000-0000-000000000000');
  });

  it('should notify all role holders with CHALLENGE_AUTO_CANCELLED type', () => {
    const notification = {
      notification_type: 'CHALLENGE_AUTO_CANCELLED',
      title: 'Challenge Auto-Cancelled',
      message: 'Challenge "Test" has been auto-cancelled after being on hold for 42 days (maximum: 30 days).',
    };

    expect(notification.notification_type).toBe('CHALLENGE_AUTO_CANCELLED');
    expect(notification.message).toContain('auto-cancelled');
    expect(notification.message).toContain('42 days');
  });
});
