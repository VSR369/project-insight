

## Performance Optimization Plan

### Summary
Apply 4 safe, high-impact performance fixes. Two bottlenecks from the audit (Bottleneck 4: LC workspace decomposition, Bottleneck 6: narrowing SELECT statements) are deferred to a second pass due to medium regression risk and higher effort.

---

### Fix 1: AuthGuard — Cache legal gate in sessionStorage (Bottleneck 1)

**What changes:**
- In `AuthGuard.tsx`, on mount check `sessionStorage.getItem('cogniblend_legal_gate_passed')`. If `'true'`, skip the `LegalGateModal` entirely.
- In `handleAllAccepted`, write `sessionStorage.setItem('cogniblend_legal_gate_passed', 'true')`.
- The existing `useAuth` signOut already clears sessionStorage keys — add `cogniblend_legal_gate_passed` to the list cleared on SIGNED_OUT in `useAuth.tsx`.
- For SPA status: update `useSpaStatus.ts` to use `CACHE_STATIC` (30min staleTime) instead of current 5min. Import from `@/config/queryCache`.

**Files:**
- `src/components/auth/AuthGuard.tsx` — add sessionStorage check + write
- `src/hooks/useAuth.tsx` — clear `cogniblend_legal_gate_passed` on sign out
- `src/hooks/cogniblend/useSpaStatus.ts` — switch to `CACHE_STATIC`

**Risk:** LOW. Legal gate still fires on first login per session. sessionStorage clears on tab close and on sign-out.

---

### Fix 2: PWA status — Use CACHE_STATIC (Bottleneck 2)

**What changes:**
- In `usePwaStatus.ts`, replace `staleTime: 5 * 60_000` with `...CACHE_STATIC` import from `@/config/queryCache`.

**Files:**
- `src/hooks/cogniblend/usePwaStatus.ts` — 2-line change

**Risk:** VERY LOW. PWA acceptance is immutable within a session.

---

### Fix 3: Lazy-load auth pages (Bottleneck 5)

**What changes:**
- In `App.tsx`, convert the 5 eagerly imported pages (`Login`, `Register`, `ForgotPassword`, `ResetPassword`, `InviteAccept`, `Dashboard`, `Welcome`, `NotFound`) to `lazy()` imports using the existing `lazyRetry` wrapper.
- They're already wrapped in `<Suspense>` via `RouteLoadingFallback`.

**Files:**
- `src/App.tsx` — replace 8 direct imports with lazy imports (lines 45-54)

**Risk:** VERY LOW. 195+ other pages already use this pattern.

---

### Fix 4: Curation page — Merge legal queries + defer non-critical (Bottleneck 3, partial)

**What changes:**
- In `useCurationPageData.ts`, merge `legalDocs` (summary) and `legalDetails` queries into a single query that fetches all needed columns from `challenge_legal_docs`, then derives both summaries and details client-side.
- Defer `escrowRecord` and `sectionActions` queries: add `enabled: !!challengeId && !isLoading` so they fire after the main challenge query resolves and content is visible.
- The `orgTypeName` waterfall (challenge → org → org_type) stays as-is for now since it already has `staleTime: 5min` and the fix requires a JOIN that changes the query structure significantly.

**Files:**
- `src/hooks/cogniblend/useCurationPageData.ts` — merge 2 legal queries into 1, defer escrow + sectionActions

**Risk:** LOW-MEDIUM. The merged query returns a superset of fields. Derived summaries are computed client-side from the same data. Deferred queries don't affect initial render.

---

### Deferred (second pass)
- **Bottleneck 4** (LC workspace decomposition): 1358-line file needs careful extraction into sub-components. High effort, medium risk — no perf fix without thorough prop mapping.
- **Bottleneck 6** (Narrow SELECT): Reducing the challenge SELECT column list requires verifying every section renderer still has its data. Medium risk.

### Technical details

All changes preserve existing fail-open semantics (legal gates default to passing on error). No database changes needed. No new dependencies.

Cache tier mapping:
- `CACHE_STATIC` = `{ staleTime: 30min, gcTime: 60min }` — appropriate for acceptance statuses that are immutable within a session.

