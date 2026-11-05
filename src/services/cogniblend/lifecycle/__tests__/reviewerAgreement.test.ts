import { describe, expect, it } from 'vitest';
import { roleRequiresPwa, shouldShowPwaPrompt } from '../reviewerAgreement';

describe('roleRequiresPwa (BR-SEC-019 gated roles)', () => {
  it('Expert Reviewer (ER) requires the agreement', () => {
    expect(roleRequiresPwa('ER')).toBe(true);
  });

  it('Curator (CU) requires the agreement', () => {
    expect(roleRequiresPwa('CU')).toBe(true);
  });

  it('Creator (CR) requires the agreement', () => {
    expect(roleRequiresPwa('CR')).toBe(true);
  });

  it('Solution Provider role codes are not gated by this rule', () => {
    expect(roleRequiresPwa('SP')).toBe(false);
  });
});

describe('shouldShowPwaPrompt', () => {
  it('prompts only when the user holds a gated role and has not accepted', () => {
    expect(shouldShowPwaPrompt(true, false)).toBe(true);
  });

  it('never prompts while acceptance status is still loading', () => {
    expect(shouldShowPwaPrompt(true, undefined)).toBe(false);
  });

  it('never prompts a user who has accepted', () => {
    expect(shouldShowPwaPrompt(true, true)).toBe(false);
  });

  it('never prompts a user without a gated role', () => {
    expect(shouldShowPwaPrompt(false, false)).toBe(false);
  });
});
