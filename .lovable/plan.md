

# Fix Remaining Curator Module Gaps

## 5 Items to Address

### 1. Add correlationId to discover-context-resources
**File:** `supabase/functions/discover-context-resources/index.ts`
- Generate a `crypto.randomUUID()` at request start
- Include in all error responses and the success response
- Log it with `console.log` at entry and on errors

### 2. PreviewSectionEditor — format-aware editors
**File:** `src/components/cogniblend/preview/PreviewSectionEditor.tsx`
- Add `LineItemsEditor` for `line_items` / `tag_input` — renders editable list with add/remove
- Add `TableEditor` for `table` / `schedule_table` — renders editable rows with column headers from config
- Add `CheckboxEditor` for `checkbox_single` / `checkbox_multi` — renders selectable options
- Keep textarea fallback for `structured_fields` / `custom`
- This will exceed 250 lines, so split into `PreviewSectionEditor.tsx` (router + action buttons, ~50 lines) and `src/components/cogniblend/preview/editors/` folder with `LineItemsEditor.tsx`, `TableEditor.tsx`, `CheckboxEditor.tsx`

### 3. Remove old wave executor props from useCurationAIActions interface
**File:** `src/hooks/cogniblend/useCurationAIActions.ts`
- Remove `pass1SetWaveProgress` from the options interface (it's only used for legacy wave progress display, not the unified flow)
- Check if `isWaveRunning` is still needed — it guards against concurrent runs, so keep it but rename context to clarify
- Remove imports: `DISCOVERY_WAVE_NUMBER`, `createInitialWaveProgressWithDiscovery`, `WaveProgress`
- Clean up any internal references to wave progress that aren't used

**File:** `src/hooks/cogniblend/useCurationPageOrchestrator.ts`
- Stop passing removed props to `useCurationAIActions`

### 4. SERPER_API_KEY — no code change needed
The Gemini grounding fallback is already implemented (line 377). This is a deployment config item, not a code fix. Will add a clearer log message when fallback activates.

### 5. Replace reReviewStale with per-section unified review
**File:** `src/hooks/useWaveExecutor.ts`
- `reReviewStale` currently calls `review-challenge-sections` (legacy combined pass) for each stale section
- Change to call `review-challenge-sections` in review-only mode (pass1Only), which is already supported
- The `useWaveReviewSection` already respects `pass1Only` — the issue is that `fullExecutor` (not `pass1Executor`) provides `reReviewStale`
- Fix: In `useCurationWaveSetup.ts`, use `pass1Executor.reReviewStale` instead of `fullExecutor.reReviewStale` so stale re-reviews are review-only, not combined pass

**File:** `src/hooks/cogniblend/useCurationWaveSetup.ts` (line 173)
- Change `reReviewStale: fullExecutor.reReviewStale` → `reReviewStale: pass1Executor.reReviewStale`

## Files Changed
| File | Change |
|------|--------|
| `supabase/functions/discover-context-resources/index.ts` | Add correlationId |
| `src/components/cogniblend/preview/PreviewSectionEditor.tsx` | Router only |
| `src/components/cogniblend/preview/editors/LineItemsEditor.tsx` | New — list editor |
| `src/components/cogniblend/preview/editors/TableEditor.tsx` | New — table editor |
| `src/components/cogniblend/preview/editors/CheckboxEditor.tsx` | New — checkbox editor |
| `src/hooks/cogniblend/useCurationAIActions.ts` | Remove unused wave props + imports |
| `src/hooks/cogniblend/useCurationPageOrchestrator.ts` | Stop passing removed props |
| `src/hooks/cogniblend/useCurationWaveSetup.ts` | Use pass1Executor for reReviewStale |

## Deploy
- `discover-context-resources` (correlationId addition)

