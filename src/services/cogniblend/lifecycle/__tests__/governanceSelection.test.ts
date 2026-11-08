import { describe, expect, it } from 'vitest';
import { creationGovernanceDefault, creationGovernanceModes, higherGovernanceModes } from '../../creator/governanceSelection';

describe('DEF-0013 governance selection', () => {
  it('Marketplace excludes Express even on a Premium subscription', (): void => {
    expect(creationGovernanceModes('premium', 'MP')).toEqual(['STRUCTURED', 'CONTROLLED']);
  });
  it('Aggregator retains all three permitted modes', (): void => {
    expect(creationGovernanceModes('premium', 'AGG')).toEqual(['QUICK', 'STRUCTURED', 'CONTROLLED']);
  });
  it('Marketplace raises an Express org profile to Structured', (): void => {
    expect(creationGovernanceDefault('premium', 'MP', 'QUICK')).toBe('STRUCTURED');
  });
  it('uses the organisation High-Rigor profile when permitted', (): void => {
    expect(creationGovernanceDefault('premium', 'MP', 'CONTROLLED')).toBe('CONTROLLED');
  });
  it('does not silently offer an unavailable Marketplace mode', (): void => {
    expect(creationGovernanceDefault('basic', 'MP', 'QUICK')).toBeNull();
  });
  it('preserves a valid Draft selection when the engagement model changes', (): void => {
    expect(creationGovernanceDefault('premium', 'AGG', 'QUICK', 'CONTROLLED')).toBe('CONTROLLED');
  });
  it('raises Express when switching a Draft from Aggregator to Marketplace', (): void => {
    expect(creationGovernanceDefault('premium', 'MP', 'QUICK', 'QUICK')).toBe('STRUCTURED');
  });
  it('allows a Curator only higher modes, never a downgrade', (): void => {
    expect(higherGovernanceModes('STRUCTURED', ['QUICK', 'STRUCTURED', 'CONTROLLED'])).toEqual(['CONTROLLED']);
  });
  it('offers no further raise for High-Rigor', (): void => {
    expect(higherGovernanceModes('CONTROLLED', ['QUICK', 'STRUCTURED', 'CONTROLLED'])).toEqual([]);
  });
});