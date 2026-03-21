

## Plan: Persist AI-Generated Legal Document Suggestions

### Problem
AI-generated legal document suggestions are stored only in React Query's in-memory cache (`enabled: false`, manual trigger). When the user logs out, `queryClient.clear()` wipes the cache. On re-login, all suggestions are lost and must be regenerated.

### Solution
Save AI suggestions to the database when generated, and load them on page load. Use the existing `challenge_legal_docs` table with a new status value (`ai_suggested`) to distinguish unaccepted suggestions from accepted/attached docs.

### Changes

**1. Database migration — add `content_summary` and `rationale` columns**

The `challenge_legal_docs` table lacks columns for the AI content body and rationale. Add:
```sql
ALTER TABLE public.challenge_legal_docs
  ADD COLUMN IF NOT EXISTS content_summary text,
  ADD COLUMN IF NOT EXISTS rationale text,
  ADD COLUMN IF NOT EXISTS priority text;
```

**2. Edge function update — `suggest-legal-documents/index.ts`**

After generating suggestions, insert them into `challenge_legal_docs` with `status: 'ai_suggested'` and `lc_status: null`. Before inserting, delete any prior `ai_suggested` rows for this challenge (to allow re-generation). Return the saved docs.

**3. UI update — `LcLegalWorkspacePage.tsx`**

- Remove the `useLegalSuggestions` hook that calls the edge function via `useQuery(enabled: false)`
- Split `useAttachedLegalDocs` into two queries:
  - **Attached docs**: `status != 'ai_suggested'` (accepted/manually added)
  - **AI suggestions**: `status = 'ai_suggested'` (persisted suggestions)
- The "Generate" button calls `supabase.functions.invoke(...)` via a `useMutation` instead of `refetch`; on success, invalidate the AI suggestions query
- The "Accept" mutation updates the existing row (`status: 'attached'`, `lc_status: 'approved'`) instead of inserting a new one
- The "Dismiss" action deletes the `ai_suggested` row from DB (persistent dismiss)
- Remove `acceptedDocs` and `dismissedSuggestions` local state — no longer needed since everything is DB-backed

### Technical Details

- `SuggestedDoc` interface maps to `challenge_legal_docs` rows with `status = 'ai_suggested'`
- Accept mutation: `UPDATE challenge_legal_docs SET status='attached', lc_status='approved', ... WHERE id = doc.id`
- Dismiss mutation: `DELETE FROM challenge_legal_docs WHERE id = doc.id AND status = 'ai_suggested'`
- Generate mutation: calls edge function, which handles DB insert internally
- The `visibleSuggestions` filter simplifies to just the AI suggestions query result (no local Set filtering)
- `totalAccepted` remains `attachedDocs?.length ?? 0` (unchanged)

**Files modified:**
- 1 new DB migration (add columns)
- `supabase/functions/suggest-legal-documents/index.ts` (persist suggestions to DB)
- `src/pages/cogniblend/LcLegalWorkspacePage.tsx` (load from DB, update accept/dismiss to use mutations)

