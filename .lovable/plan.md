

## Fix 3 — Extraction Wait + Digest After Extraction

### Problem
- `useAddContextUrl` awaits the edge function invoke but not the actual extraction completion (the edge function may return before text is fully extracted)
- `useAcceptSuggestion` still fires extraction and digest as fire-and-forget
- `useAcceptMultipleSuggestions` same issue
- `useUploadContextFile` same issue — fire-and-forget extraction

### Changes — Single file: `src/hooks/cogniblend/useContextLibrary.ts`

**1. Add `waitForExtraction` helper** (before mutations section, ~line 149)
- Polls `challenge_attachments.extraction_status` every 2s, max 45s
- Returns when status is `completed` or `failed`

**2. Rewrite `useAcceptSuggestion`** (line 169)
- After updating `discovery_status` to `accepted`: `await` extraction invoke
- `await waitForExtraction(attachmentId)`
- Then `await` digest regeneration
- Toast: "Source accepted and indexed"

**3. Rewrite `useAcceptMultipleSuggestions`** (line 210)
- After bulk update: trigger all extractions in parallel with `Promise.allSettled`
- `await Promise.allSettled` of `waitForExtraction` for each id
- Then regenerate digest once
- Toast: "Sources accepted and indexed"

**4. Update `useAddContextUrl`** (line 298)
- Add `await waitForExtraction(att.id)` between extraction invoke and digest invoke (currently missing the poll)

**5. Update `useUploadContextFile`** (line 255)
- Same pattern: await extraction, wait for completion, then regenerate digest
- Toast: "File uploaded and indexed"

### No other files affected

