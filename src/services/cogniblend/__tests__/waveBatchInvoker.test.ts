/**
 * waveBatchInvoker.test.ts — HTTP status preservation + partial-wave success.
 * Covers checklist items E2, E3.
 *
 * Mocks Supabase functions.invoke to inject 504 / 546 / 429 / 500 / unknown
 * status codes and asserts the thrown error message includes [HTTP <code>],
 * which the diagnostics UI surfaces. Regression test for the bare "NETWORK"
 * masking that hid the Wave 8 timeout for hours.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase client BEFORE importing the unit under test.
// Hoisted mocks — vi.mock is hoisted above imports, so factory state must use vi.hoisted.
const mocks = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  setReviewStatus: vi.fn(),
  setAiReview: vi.fn(),
  clearStaleness: vi.fn(),
  setSectionData: vi.fn(),
  setValidationResult: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: mocks.invokeMock } },
}));

vi.mock('@/store/curationFormStore', () => ({
  getCurationFormStore: () => ({
    getState: () => ({
      setReviewStatus: mocks.setReviewStatus,
      setAiReview: mocks.setAiReview,
      clearStaleness: mocks.clearStaleness,
      setSectionData: mocks.setSectionData,
      setValidationResult: mocks.setValidationResult,
    }),
  }),
}));

vi.mock('@/lib/cogniblend/normalizeSectionReview', () => ({
  normalizeSectionReview: (r: Record<string, unknown>) => ({ ...r, comments: r.comments ?? [] }),
}));
vi.mock('@/lib/cogniblend/parseSuggestion', () => ({
  parseSuggestionForSection: (_k: string, raw: string) => raw,
}));
vi.mock('@/lib/cogniblend/postLlmValidation', () => ({
  validateAIOutput: () => ({ corrections: [], passedChecks: [] }),
}));

const { invokeMock } = mocks;

import { invokeWaveBatch } from '../waveBatchInvoker';
import type { ChallengeContext } from '@/lib/cogniblend/challengeContextAssembler';

const ctx = { sections: {}, todaysDate: '2025-01-01' } as unknown as ChallengeContext;
const onSectionReviewed = vi.fn();

const baseOpts = {
  challengeId: 'ch_1',
  sectionActions: [{ sectionId: 'problem_statement' as const, action: 'review' as const }],
  context: ctx,
  reasoningEffort: 'high' as const,
  pass1Only: false,
  skipAnalysis: false,
  onSectionReviewed,
};

describe('invokeWaveBatch — HTTP status preservation (E2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    [504, 'IDLE_TIMEOUT'],
    [546, 'WORKER_RESOURCE_LIMIT'],
    [429, 'rate_limited'],
    [500, 'internal_server_error'],
  ])('E2: surfaces HTTP %i in the per-section errorMessage', async (status, msg) => {
    invokeMock.mockResolvedValueOnce({ data: null, error: { status, message: msg } });
    const outcomes = await invokeWaveBatch(baseOpts);
    const errored = outcomes.find((o) => o.status === 'error');
    expect(errored).toBeDefined();
    expect(errored?.errorCode).toBe('NETWORK');
    expect(errored?.errorMessage).toContain(`[HTTP ${status}]`);
    expect(errored?.errorMessage).toContain(msg);
  });

  it('E2: falls back to context.status when error.status is missing', async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: { context: { status: 504 }, message: 'Edge timeout' },
    });
    const outcomes = await invokeWaveBatch(baseOpts);
    expect(outcomes[0].errorMessage).toContain('[HTTP 504]');
  });

  it('E2: surfaces "[HTTP unknown]" when no status info is provided', async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: { message: 'Unidentified failure' } });
    const outcomes = await invokeWaveBatch(baseOpts);
    expect(outcomes[0].errorMessage).toContain('[HTTP unknown]');
  });
});

describe('invokeWaveBatch — partial-wave success (E3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('E3: per-section batch_failure flag yields error for that section but success for siblings', async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          sections: [
            { section_key: 'problem_statement', status: 'analysed', comments: [] },
            { section_key: 'scope', is_batch_failure: true, error_code: 'TRUNCATED', comments: [{ text: 'Pass 2 truncated' }] },
          ],
        },
      },
      error: null,
    });

    const outcomes = await invokeWaveBatch({
      ...baseOpts,
      sectionActions: [
        { sectionId: 'problem_statement', action: 'review' },
        { sectionId: 'scope', action: 'review' },
      ],
    });

    const ps = outcomes.find((o) => o.sectionId === 'problem_statement');
    const sc = outcomes.find((o) => o.sectionId === 'scope');
    expect(ps?.status).toBe('success');
    expect(sc?.status).toBe('error');
    expect(sc?.errorCode).toBe('TRUNCATED');
    expect(sc?.errorMessage).toContain('Pass 2 truncated');
  });

  it('E3: BATCH_EXCLUDE sections are returned as "skipped" with reason — never sent to edge fn', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { success: true, data: { sections: [] } },
      error: null,
    });
    const outcomes = await invokeWaveBatch({
      ...baseOpts,
      sectionActions: [{ sectionId: 'organization_context', action: 'review' }],
    });
    expect(outcomes[0].status).toBe('skipped');
    expect(outcomes[0].skippedReason).toMatch(/Excluded/i);
    // The edge function should NOT have been called for an all-excluded wave.
    expect(invokeMock).not.toHaveBeenCalled();
  });
});
