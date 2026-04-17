

## Plan: Conditional Attachment Content Truncation

### Verification
<lov-tool-use id="toolu_vrtx_018YUvoDFNoTXHhqf5yXU8LP" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/review-challenge-sections/index.ts\", \"lines\": \"1020-1060\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01QsG21WeyxWDc4cfYNChRix" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/review-challenge-sections/index.ts\", \"lines\": \"1010-1070\"}">
</lov-tool-use>
The truncation at lines 1044-1051 is **already implemented and live** in the deployed code. The user's proposed change matches what's already there (2000-char limit + truncation suffix). No further edit needed.

<lov-plan>

## No Implementation Needed — Already Live

The proposed truncation **is already implemented** in `supabase/functions/review-challenge-sections/index.ts` at lines 1044-1051, deployed in the previous memory-fix wave:

```ts
// Lines 1047-1051 (current state):
const contentStr = typeof ref.content === 'string' ? ref.content : '';
const truncatedContent = contentStr.length > 2000
  ? contentStr.slice(0, 2000) + '\n...[truncated for context window — see AI Summary above for distilled signal]'
  : contentStr;
attachmentBlock += truncatedContent + '\n';
```

This is functionally identical to the user's proposed snippet:
- Same 2000-char threshold
- Same truncation suffix pattern
- Same preservation of `ref.summary` + `ref.keyData` as distilled signal
- Same per-batch attachment filtering via `batchKeySet` (line 1028-1030)

### Verification
- **Edit 1 (truncate attachments)**: ✅ Live at lines 1044-1051
- **Edit 2 (deduplicate digest)**: ✅ Live at lines 1014-1022 (`digestInjectedForWave` flag)
- **Edit 3 (memory release)**: ✅ Deployed in previous wave

### What This Means
The "remaining risk" the user flagged was already mitigated in the prior surgical memory fix. No code change, no deployment, no migration required.

If 546 errors still recur on attachment-heavy challenges, the next lever would be **lowering the 2000-char threshold to 1200-1500** rather than re-adding truncation logic — but only after confirming via edge logs that attachment content (not digest, not corpus examples) is the dominant token contributor on the failing batch.

### Recommendation
Close this thread as resolved. Re-open only if a new 546 error appears with edge-log evidence showing `prompt_tokens > 45K` on a multi-attachment wave — at which point the fix is a one-line constant change (`2000` → `1200`), not new logic.

