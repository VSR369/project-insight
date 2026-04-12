/**
 * useContextLibrary — Barrel re-export for all Context Library hooks.
 * Split into queries + mutations for R1 compliance (max 250 lines).
 */

export type { ContextSource, ContextDigest } from './useContextLibraryQueries';
export {
  useContextSources,
  useContextDigest,
  useContextSourceCount,
  usePendingSuggestionCount,
  useIntakeStatus,
} from './useContextLibraryQueries';

export {
  useDiscoverSources,
  useAcceptSuggestion,
  useRejectSuggestion,
  useAcceptMultipleSuggestions,
  useRejectAllSuggestions,
  useUnacceptSource,
  useUploadContextFile,
  useAddContextUrl,
  useDeleteContextSource,
  useReExtractSource,
  useUpdateSourceSharing,
  useUpdateSourceSections,
  useRegenerateDigest,
  useSaveDigest,
  useClearAllSources,
  useCurationIntelligence,
} from './useContextLibraryMutations';

export { CONTEXT_KEYS, invalidateAllContextKeys } from './contextLibraryKeys';
