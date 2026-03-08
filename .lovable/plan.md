

# Retrofit Audit: Performance, Dead Code, and Architecture Compliance

## Audit Summary

After scanning all hooks, pages, components, and services built in the last 2-3 days, I identified issues across three categories: **dead/duplicate code**, **performance concerns**, and **architecture compliance gaps**. All fixes are surgical — no changes to DB schema, APIs, RLS, routing, or UX.

---

## 1. DEAD / DUPLICATE CODE (Safe to Remove)

| # | File | Issue | Action |
|---|------|-------|--------|
| 1 | `src/hooks/queries/useHierarchyResolver.ts` | **Fully superseded** by `useHierarchyResolverOptimized.ts`. The optimized version re-exports a backward-compatible `resolveHierarchy` wrapper. Only 2 consumers remain and both can use the optimized version. | Remove file. Update 2 imports in `QuestionImportDialog.tsx` and `QuestionTreePreviewDialog.tsx`. |
| 2 | `src/pages/admin/question-bank/QuestionImportDialog.tsx` (1,589 lines) | **Superseded** by `QuestionImportDialogOptimized.tsx`. The `index.ts` barrel already re-exports the optimized version as `QuestionImportDialog`. The old file is dead weight. | Remove old file after confirming no direct imports bypass the barrel. |
| 3 | `src/pages/admin/question-bank/QuestionTreePreviewDialog.tsx` (580 lines) | **Superseded** by `QuestionTreePreviewDialogVirtualized.tsx`. Barrel already re-exports the virtualized version. Old file is unused. | Remove old file. |
| 4 | `src/pages/admin/PulseSocialTestPage.tsx` (378 lines) | Test dashboard — not a production feature. Should be excluded from production builds or moved to a `test/` directory. | Flag for review; gate behind dev-only route or remove from production routing. |
| 5 | `src/pages/admin/SmokeTestPage.tsx` (485 lines) | Test page with seed data functions. Same as above. | Same treatment as #4. |
| 6 | `src/pages/admin/RegressionTestKitPage.tsx` (439 lines) | Test page. Same as above. | Same treatment as #4. |

**Estimated dead code removal: ~3,500+ lines**

---

## 2. PERFORMANCE / RESPONSE TIME ISSUES

| # | Location | Issue | Fix |
|---|----------|-------|-----|
| A | `useVerificationDashboard.ts` | Has `refetchInterval: 60_000` (polling) — this hook also likely has a Realtime subscription. Per project standards, polling should be removed when Realtime is active. | Verify if Realtime subscription exists; if yes, remove `refetchInterval`. |
| B | `useMyMetrics.ts` | Has `refetchInterval: 60_000` — metrics are recalculated daily per MOD-05 spec. Polling every 60s is wasteful. | Increase to `300_000` (5 min) or remove entirely; use invalidation on relevant mutations. |
| C | `useReinterviewEligibility.ts` | `refetchInterval: 60_000` — polls every minute for countdown. Acceptable but could use visibility-aware polling like Pulse hooks do. | Wrap with `useVisibilityPollingInterval` to stop polling when tab is hidden. |
| D | `AudioRecorder.tsx` | Contains 10+ raw `console.log` statements for debugging MediaRecorder. Violates §11.5 (no raw console in production). | Replace with `logDebug` from `errorHandler.ts` or remove. These are not test files. |
| E | `BulkReassignConfirmModal.tsx` | Has 2 raw `console.error` calls (lines 96, 99). | Replace with `handleMutationError` or `logWarning`. |
| F | `useQuestionsWithHierarchy` (both files) | Uses `select("*")` with deep joins — fetches ALL columns from `question_bank` plus nested relations. With 50K potential rows this is heavy. | Specify explicit columns instead of `*`. |

---

## 3. ARCHITECTURE COMPLIANCE GAPS

| # | Rule | Issue | Fix |
|---|------|-------|-----|
| 1 | §5.2 File size | `QuestionImportDialogOptimized.tsx` is likely 1,000+ lines. Exceeds 200-line service / 300-line component guideline. | Decompose into sub-components (parser, progress UI, results summary). This is a future refactor — not urgent. |
| 2 | §9.4 Responsive | `SmokeTestPage.tsx` line 198 uses `md:grid-cols-4` — should be `lg:grid-cols-4`. | Fix breakpoint if page is kept. |
| 3 | §9.4 Responsive | `RegressionTestKitPage.tsx` line 176 uses `md:grid-cols-3` — should be `lg:grid-cols-3`. | Fix breakpoint if page is kept. |

---

## Retrofit Plan (Prioritized)

### Phase 1 — Dead Code Removal (Zero Risk)
1. Delete `src/hooks/queries/useHierarchyResolver.ts`
2. Delete `src/pages/admin/question-bank/QuestionImportDialog.tsx` (the old, non-optimized version)
3. Delete `src/pages/admin/question-bank/QuestionTreePreviewDialog.tsx` (the old, non-virtualized version)
4. Update any remaining direct imports to point to the optimized/virtualized versions

### Phase 2 — Console.log Cleanup (Low Risk)
5. Replace `console.log/error` in `AudioRecorder.tsx` with `logDebug`/`logWarning`
6. Replace `console.error` in `BulkReassignConfirmModal.tsx` with `logWarning`

### Phase 3 — Performance Tuning (Low Risk)
7. Add `useVisibilityPollingInterval` to `useReinterviewEligibility.ts`
8. Increase `refetchInterval` in `useMyMetrics.ts` from 60s to 300s
9. Audit `useVerificationDashboard.ts` for Realtime subscription overlap
10. Replace `select("*")` in `useQuestionsWithHierarchy` with explicit columns

### Phase 4 — Test Pages Governance (Deferred / Decision Needed)
11. Decide: keep test pages gated behind supervisor-only routes, or remove from production bundle entirely

---

## What is NOT touched (Safety Guarantees)
- No DB migrations, RLS, or schema changes
- No route changes, navigation, or UX modifications
- No API or Edge Function changes
- No changes to authentication, authorization, or role logic
- No changes to any component that is actively used in production flows
- All existing functionality, rules, and business logic remain intact

