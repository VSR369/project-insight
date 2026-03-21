

## Root Cause Analysis & Fix: Submit to Curation Button Disabled

### Root Causes

The button is disabled by `disabled={submitting || totalAccepted === 0}` (line 1167).

`totalAccepted` is calculated as `acceptedDocs.size + (attachedDocs?.length ?? 0)` (line 544).

**Root Cause 1: `acceptedDocs` is ephemeral local state (useState Set)**
When the LC accepts an AI-suggested document, the accept mutation inserts it into `challenge_legal_docs` AND adds the doc type to the local `acceptedDocs` Set. However, if the page is refreshed or revisited, `acceptedDocs` resets to an empty Set. The only persistent count comes from `attachedDocs` (the DB query).

**Root Cause 2: `attachedDocs` query filters exclude previously accepted docs**
The `attachedDocs` query fetches from `challenge_legal_docs` correctly. From the network response, it returns `[]` — meaning no documents have been accepted/inserted yet. The user must first accept AI suggestions before the count goes above 0.

**Root Cause 3: No documents accepted yet**
The network data shows `challenge_legal_docs` returns empty for this challenge. The AI suggestions are generated but none have been accepted. The button correctly reflects this — there are 0 attached documents.

**However**, there's a UX problem: if the user accepts documents, navigates away, and returns, the `acceptedDocs` state resets to empty. The fix should ensure `totalAccepted` relies solely on the persistent `attachedDocs` query (which re-fetches from DB), not on ephemeral state.

### Fix

**File: `src/pages/cogniblend/LcLegalWorkspacePage.tsx`**

1. Change `totalAccepted` to only use `attachedDocs?.length ?? 0` (the DB source of truth), removing dependency on the ephemeral `acceptedDocs.size` for the button state
2. Ensure the `attachedDocs` query is invalidated after each accept mutation (already done)
3. The `acceptedDocs` Set should only be used for filtering visible suggestions (hiding just-accepted cards), not for the submit gate

This is a one-line change on line 544:
```typescript
const totalAccepted = attachedDocs?.length ?? 0;
```

The `acceptedDocs` Set continues to serve its UI purpose of immediately hiding the accepted suggestion card (before the query refetch completes), but the submit button relies on the actual DB count.

