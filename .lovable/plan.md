

## Fix: Guide curator when digest generation fails due to missing sources

### Root Cause

In `useCurationAIActions.ts` line 224, `handleGenerateSuggestions` calls `generate-context-digest` but **completely ignores the response** — no `error` check, no `data.success` check. When the edge function returns a 400 with `NO_SOURCES` or `NO_EXTRACTABLE_CONTENT`, the code proceeds to `executeWavesPass2()` which then fails with a generic "Edge Function failure" message.

The `useRegenerateDigest` hook in `useContextLibrary.ts` already handles this correctly (line 456-463), but the Generate Suggestions flow does not.

### Fix — 1 file change

**`src/hooks/cogniblend/useCurationAIActions.ts`** (lines 222-226)

Add error checking after the `generate-context-digest` invoke. Detect `NO_SOURCES` and `NO_EXTRACTABLE_CONTENT` codes and show a specific guiding toast instead of proceeding:

```typescript
// Regenerate digest so Pass 2 has enriched context from accepted sources
const { data: digestResult, error: digestError } = await supabase.functions.invoke('generate-context-digest', {
  body: { challenge_id: challengeId },
});

if (digestError || !digestResult?.success) {
  const errorCode = digestResult?.error?.code ?? '';
  const errorMsg = digestResult?.error?.message ?? digestError?.message ?? '';
  
  if (errorCode === 'NO_SOURCES' || errorMsg.includes('No accepted sources')) {
    toast.error(
      'No accepted sources found. Open the Context Library, run "Re-discover Sources", accept at least one source, then try again.',
      { duration: 8000 }
    );
  } else if (errorCode === 'NO_EXTRACTABLE_CONTENT' || errorMsg.includes('none have sufficient text')) {
    toast.error(
      'Accepted sources have no extractable text. Try adding URLs or uploading documents with readable content in the Context Library.',
      { duration: 8000 }
    );
  } else {
    toast.error(`Digest generation failed: ${errorMsg || 'Unknown error'}`, { duration: 8000 });
  }
  return; // Stop — do not proceed to Pass 2
}
```

This replaces the current fire-and-forget call (lines 223-226) with proper error handling that:
- Stops the flow before Pass 2 if digest generation fails
- Gives the curator a clear, actionable message explaining what to do
- Uses 8-second duration per project toast standards for error messages

### No other changes needed
- Edge function already returns correct error codes
- `useRegenerateDigest` (Context Library button) already handles this correctly
- No database or migration changes

