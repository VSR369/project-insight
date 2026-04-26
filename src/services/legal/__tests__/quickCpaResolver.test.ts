/**
 * Phase 9 v4 — Prompt 3
 * Three-way fallback contract for `resolveQuickCpaTemplate`:
 *   1. ORG template present                  → { source: 'ORG' }
 *   2. ORG missing OR MP, platform present   → { source: 'PLATFORM_FALLBACK' }
 *   3. Both missing                          → throws MissingPlatformCpaTemplateError
 *
 * The SQL function is mocked at the supabase client boundary so this test runs
 * deterministically without a DB.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

import {
  resolveQuickCpaTemplate,
  MissingPlatformCpaTemplateError,
} from '../quickCpaResolver';

describe('resolveQuickCpaTemplate — three-way fallback', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it('returns ORG when org-uploaded AGG template exists', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{
        template_id: 'org-tpl-1',
        document_code: 'CPA_QUICK',
        version: '2.1',
        content: 'org content',
        source: 'ORG',
      }],
      error: null,
    });
    const result = await resolveQuickCpaTemplate('org-1', 'AGG');
    expect(result.source).toBe('ORG');
    expect(result.template_id).toBe('org-tpl-1');
  });

  it('returns PLATFORM_FALLBACK when ORG missing (AGG with no org template)', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{
        template_id: 'plat-tpl-1',
        document_code: 'CPA_QUICK',
        version: '1.0',
        content: 'platform content',
        source: 'PLATFORM_FALLBACK',
      }],
      error: null,
    });
    const result = await resolveQuickCpaTemplate('org-1', 'AGG');
    expect(result.source).toBe('PLATFORM_FALLBACK');
  });

  it('returns PLATFORM_FALLBACK for Marketplace orgs', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{
        template_id: 'plat-tpl-1',
        document_code: 'CPA_QUICK',
        version: '1.0',
        content: 'platform content',
        source: 'PLATFORM_FALLBACK',
      }],
      error: null,
    });
    const result = await resolveQuickCpaTemplate('org-1', 'MP');
    expect(result.source).toBe('PLATFORM_FALLBACK');
  });

  it('throws MissingPlatformCpaTemplateError when both ORG and PLATFORM are missing', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    await expect(resolveQuickCpaTemplate('org-1', 'AGG'))
      .rejects.toBeInstanceOf(MissingPlatformCpaTemplateError);
  });

  it('throws MissingPlatformCpaTemplateError when MP has no platform template', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await expect(resolveQuickCpaTemplate(null, 'MP'))
      .rejects.toBeInstanceOf(MissingPlatformCpaTemplateError);
  });

  it('propagates RPC errors as generic Error (not the typed missing-template error)', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'permission denied' } });
    await expect(resolveQuickCpaTemplate('org-1', 'AGG'))
      .rejects.toThrow('permission denied');
    await expect(resolveQuickCpaTemplate('org-1', 'AGG'))
      .rejects.not.toBeInstanceOf(MissingPlatformCpaTemplateError);
  });
});
