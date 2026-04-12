

## Fix: "Generate Suggestions" Button Permanently Disabled

### Root Cause

`contextLibraryReviewed` is a `useState(false)` in `useCurationPageOrchestrator.ts` (line 188). It only becomes `true` when the Context Library drawer closes after being opened **in the current browser session**. It is never persisted to the database or localStorage.

So after a page refresh (or if Pass 1 ran in a prior session), `pass1DoneSession` is `true` (hydrated from stored `ai_section_reviews`), but `contextLibraryReviewed` resets to `false` — permanently disabling the "Generate Suggestions" button until the user opens and closes the Context Library again.

### Fix

**File: `src/hooks/cogniblend/useCurationPageOrchestrator.ts`**

Two changes:

1. **Hydrate from existing state**: If `pass1DoneSession` is hydrated as `true` on mount (meaning analysis was already done), auto-set `contextLibraryReviewed` to `true`. The gate's purpose is to ensure the curator reviews sources *once* after analysis — if they already did that in a previous session, re-gating on refresh is a UX bug, not a safety feature.

2. **Persist to sessionStorage**: Store `contextLibraryReviewed` in `sessionStorage` keyed by `challengeId` so it survives soft refreshes within the same tab session.

```typescript
// Replace lines 187-197 with:

// ── Context Library reviewed gate ──
const [contextLibraryReviewed, setContextLibraryReviewed] = useState(() => {
  // Hydrate from sessionStorage for current tab persistence
  if (challengeId) {
    return sessionStorage.getItem(`ctx_reviewed_${challengeId}`) === 'true';
  }
  return false;
});

// When Context Library drawer closes after being opened post-analysis, mark as reviewed
const prevContextLibraryOpenRef = useRef(false);
useEffect(() => {
  if (prevContextLibraryOpenRef.current && !contextLibraryOpen && pass1DoneSession) {
    setContextLibraryReviewed(true);
    if (challengeId) {
      sessionStorage.setItem(`ctx_reviewed_${challengeId}`, 'true');
    }
  }
  prevContextLibraryOpenRef.current = contextLibraryOpen;
}, [contextLibraryOpen, pass1DoneSession, challengeId]);

// If pass1 was done in a prior session (hydrated from DB), auto-unlock
useEffect(() => {
  if (pass1DoneSession && !contextLibraryReviewed) {
    setContextLibraryReviewed(true);
    if (challengeId) {
      sessionStorage.setItem(`ctx_reviewed_${challengeId}`, 'true');
    }
  }
}, [pass1DoneSession]);
```

This is a single-file fix. No other files need changes — `CurationRightRail.tsx` already reads `contextLibraryReviewed` as a prop.

