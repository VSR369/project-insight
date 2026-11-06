import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { extractMinimumModeMessage } from '../minimumModeService';

describe('DEF-0144 minimum mode refusal message', () => {
  it('picks out the Structured refusal from a server error', () => {
    const err = new Error('check_violation: This challenge requires at least Structured governance.');
    expect(extractMinimumModeMessage(err)).toBe('This challenge requires at least Structured governance.');
  });
  it('picks out the High-Rigor refusal', () => {
    expect(extractMinimumModeMessage('This challenge requires at least High-Rigor governance.'))
      .toBe('This challenge requires at least High-Rigor governance.');
  });
  it('ignores unrelated errors', () => {
    expect(extractMinimumModeMessage(new Error('Permission denied for phase 1'))).toBeNull();
  });
});
