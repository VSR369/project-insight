
# Final Fix Plan — Legal Template Interpolation & Enrollment Gates

## Verdict on the submitted prompt

The plan correctly identifies real gaps (Creator-side SKPA gate, ER-side PWA gate, need for org/geo/industry-aware variables in workforce-facing docs). But large parts **conflict with code that already exists** and would silently break parity with server-side `assemble_cpa`. The single-paste prompt cannot be applied as-is. Below is what to keep, what to drop, and what to refactor.

## Issues found (vs codebase + workspace rules)

### A. Duplication / would replace working code
1. **Proposed `templateInterpolation.ts` duplicates `src/services/legal/cpaPreviewInterpolator.ts`** — which already exists, has `buildPreviewVariables`, `interpolateCpaTemplate`, `analyzeTemplateCompleteness`, and is **explicitly documented as mirroring the server `assemble_cpa` RPC**. Replacing it diverges client preview from server output → solver sees different text than what gets stored in `challenge_legal_docs`.
2. **Proposed `useTemplateContext` overlaps `useGeoContextForOrg`** (already resolves jurisdiction + governing-law from `geography_context` via org HQ country). Keep the existing hook; the new hook should *consume* it, not duplicate it.
3. **Part F "MP Template Source Fix" is already done.** `CreatorLegalPreview.tsx` lines 78-87 already use `legalTemplateSource(engagementModel)` from `engagementModelRulesService` — MP reads `useLegalDocTemplates`, AGG reads `useOrgCpaTemplates`. The proposed `effectiveTemplate = orgTemplate ?? platformTemplate` would *regress* the rule (orgs on MP cannot override platform CPA — that's a deliberate platform-governance decision).
4. **Part D3 says "add `useTemplateContext` to `CreatorLegalPreview`"** — it already accepts `templateContext: CpaPreviewVariables` (line 48). Don't change the prop shape.

### B. Server↔client parity violations
5. **`IP_MODEL_LABELS` proposed in the new file disagrees with `IP_CLAUSE_TEXT` in `legalPreview.constants.ts`** (the server's text). Two truth sources for the same clause = solvers will accept text the DB never stored. **Block.**
6. **`anti_disintermediation_period`/`penalty` hardcoded to "24 months / 150%"** — the server's `assemble_cpa` controls this via `ANTI_DISINT_CLAUSE_AGG`. Hardcoding here drifts. Keep the constant as the single source.
7. **`buildResolvedValues` formats numbers with `'en-IN'`** unconditionally and dates with `'en-IN'` long form — diverges from the unformatted strings the server stores. CPA preview must be *byte-identical* to server output for the solver-acceptance audit trail.

### C. Workspace rule violations (R1-R12)
8. **`useTemplateContext` proposed at ~100 lines with 9 optional inputs is a "kitchen-sink" hook** — violates R2 (layer separation: it's doing service-layer aggregation in a hook) and R10 (single-responsibility). Should be a **service** under `src/services/legal/templateContextBuilder.ts` that pure-composes already-fetched data, with thin per-surface hooks calling it.
9. **`useChallengeSubmit` returning `{ needsSkpaAcceptance: true }` mixes control-flow with mutation results** — violates R7/R9. The SKPA pre-check belongs in a separate `useSkpaStatus(userId)` hook (mirroring `usePwaStatus`) called by the form *before* invoking submit. Cleaner, no special return shape.
10. **Part D2 adds two more `useQuery` calls inside `CpaEnrollmentGate`** for challenge + org. Component already has 1 query; with 3 it crosses the line into "data orchestration in a component" (R2). Move to one composite hook `useCpaGateContext(challengeId)`.
11. **Inline supabase calls inside `CpaEnrollmentGate`/`PwaAcceptanceGate`** — violates R2 ("NEVER: Supabase in components"). Existing code already violates this; we should **not add more**. Use hooks under `src/hooks/queries/`.
12. **`mode='preview'` injects raw HTML `<span style="…">`** — XSS risk if any template field somehow contains user-influenced text. Must use Tailwind classes via existing `LegalDocumentViewer` rendering, not inline `style=`.
13. **Hardcoded strings** ("CogniBlend", "150% of challenge prize value", "24 months", "Platform Workforce Member", "Solution Provider") — must live in `src/constants/legal.constants.ts` (R10).

### D. Functional gaps the plan misses
14. **No invalidation of `usePwaStatus` after acceptance** — proposed `pwaAccepted` local state will desync from cache; user navigating away sees gate again. Must `queryClient.invalidateQueries(['pwa-acceptance-status', userId])` in mutation `onSuccess`.
15. **`ScrollToAcceptLegal.documentContent` is plain text rendered with `whitespace-pre-line`** — feeding it interpolated HTML (preview mode) will display raw `<span>` tags. The interpolation layer must be applied **before** the text is handed to this component, and only `'final'` mode (plain text with `[var name]`) is safe here.
16. **No SKPA template seeded** — Part E1 checks `legal_acceptance_log` for `document_code='SKPA'` but doesn't verify the template actually exists in `legal_document_templates`. Need a guard + clear error if missing (similar to the AGG silent-failure issue).
17. **ER (Expert Reviewer) gate location** — Part E3 wraps `ScreeningReviewPage`, but ER also reviews on `AISpecReviewPage` and `WinnerSelectionPage`. Single-page gate leaks. PWA acceptance is *user-scoped* not page-scoped; should be enforced once at the role-router level.

## Final fix plan — what to actually do

Implement in this order. Each step is independent and reversible.

### Step 1 — Extend the EXISTING interpolator (do not replace)
File: `src/services/legal/cpaPreviewInterpolator.ts`
- Add new optional fields to `CpaPreviewInput`: `seeker_legal_entity`, `seeker_country`, `seeker_industry`, `data_privacy_laws`, `industry_name`, `user_full_name`, `user_email`, `user_role`, `acceptance_date`, `escrow_required`, `payment_mode`, `installment_count`, `platform_fee_pct`.
- Extend `buildPreviewVariables` to emit those keys when present, **using the same string-handling rules** (`safeString`, no locale formatting unless server does it).
- No changes to existing keys, no new label maps (use constants file).

File: `src/constants/legalPreview.constants.ts`
- Add `SOLVER_AUDIENCE_LABELS`, `ENGAGEMENT_MODEL_LABELS`, `PLATFORM_NAME`, `DEFAULT_ANTI_DISINT_PERIOD`, `DEFAULT_ANTI_DISINT_PENALTY`. **Mirror exact server strings**.

### Step 2 — Variable registry (lightweight, no logic)
File: `src/lib/cogniblend/legal/templateVariables.ts` (~50 lines, **descriptions only**)
- Export `VARIABLES_BY_DOCUMENT` map for documentation/UI listing in `CpaVariableReference`. **No interpolation logic here.** Single source of truth = `cpaPreviewInterpolator.ts`.

### Step 3 — Context builder as a SERVICE, not a hook
File: `src/services/legal/templateContextBuilder.ts` (~80 lines)
- Pure function `buildCpaPreviewInput({ challenge, org, countryName, industrySegmentName, geoContext, industryPack, user, escrow, roleName }) → CpaPreviewInput`.
- No data fetching. Composes already-fetched inputs.

File: `src/hooks/queries/useCpaGateContext.ts` (NEW, ~60 lines)
- Single composite hook for `CpaEnrollmentGate`: fetches challenge + org + reuses `useGeoContextForOrg`, returns `CpaPreviewVariables` ready for `interpolateCpaTemplate`.

File: `src/hooks/queries/usePwaGateContext.ts` (NEW, ~40 lines)
- Same pattern for `PwaAcceptanceGate` when `challengeId` is provided.

### Step 4 — Wire interpolation into the 3 acceptance surfaces (display only)
- `CpaEnrollmentGate`: replace the 2 inline supabase queries with `useCpaGateContext(challengeId)`. Pass interpolated `content` (mode `'final'`) to `LegalDocumentViewer`. Component drops below 250 lines.
- `PwaAcceptanceGate`: when `challengeId` present, call `usePwaGateContext(challengeId)` and interpolate. When absent (role-level acceptance), skip interpolation.
- `ScrollToAcceptLegal`: **no API change.** Caller is responsible for passing already-interpolated text. Add a JSDoc note documenting this contract.

### Step 5 — Cache invalidation
File: `src/hooks/cogniblend/useLegalAcceptance.ts`
- In `useRecordLegalAcceptance.onSuccess`, invalidate: `['pwa-acceptance-status', userId]`, `['skpa-acceptance-status', userId]`, `['cpa-enrollment', challengeId]`. Fixes desync bug.

### Step 6 — SKPA gate for Creator (smallest viable path)
File: `src/hooks/cogniblend/useSkpaStatus.ts` (NEW, mirrors `usePwaStatus`, ~25 lines)
File: `src/components/cogniblend/creator/SkpaAcceptanceDialog.tsx` (NEW, ~120 lines — note R1 limit)
- Uses `useLegalDocTemplates` + `ScrollToAcceptLegal` + `useRecordLegalAcceptance`.
- If SKPA template missing → toast error, refuse to mount, log via `handleQueryError` (no silent skip).

File: `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` (MODIFY, +15 lines)
- Before triggering `useChallengeSubmit().mutate(...)`, call `useSkpaStatus(user.id)`. If `!hasSkpa`, open `SkpaAcceptanceDialog`. On accept → re-trigger submit. **Do NOT modify `useChallengeSubmit` return shape.**

### Step 7 — PWA gate for ER at the right level
**Drop Part E3.** Instead:
File: `src/components/auth/ReviewerGuard.tsx` (MODIFY, +10 lines)
- Add `usePwaStatus` check; if reviewer + no PWA, render `PwaAcceptanceGate` instead of children.
- Covers `ScreeningReviewPage`, `AISpecReviewPage`, `WinnerSelectionPage`, and any future ER page automatically.

### Step 8 — Constants extraction
File: `src/constants/legalPreview.constants.ts`
- Add: `PLATFORM_NAME`, `ROLE_LABELS` (`{ creator, solver, curator, lc, fc, er, workforce }`), `LEGAL_TRIGGER_EVENTS` (`CHALLENGE_SUBMIT`, `ENROLLMENT`, `ROLE_ACCEPTANCE`).
- All hardcoded strings in new code reference these.

### Step 9 — Update `CpaVariableReference` and `cpaDefaults.constants.ts`
- Replace 10-variable list with the full registry from `templateVariables.ts`. Keep description-only (no logic).

## Files summary (revised)

| File | Action | Notes |
|---|---|---|
| `src/services/legal/cpaPreviewInterpolator.ts` | EXTEND | Add fields to existing interpolator. Server parity preserved. |
| `src/constants/legalPreview.constants.ts` | EXTEND | New label maps + role/event constants. |
| `src/lib/cogniblend/legal/templateVariables.ts` | CREATE | Documentation-only registry, ~50 lines. |
| `src/services/legal/templateContextBuilder.ts` | CREATE | Pure composer, ~80 lines. |
| `src/hooks/queries/useCpaGateContext.ts` | CREATE | Composite hook for Cpa gate, ~60 lines. |
| `src/hooks/queries/usePwaGateContext.ts` | CREATE | Composite hook for Pwa gate, ~40 lines. |
| `src/hooks/cogniblend/useSkpaStatus.ts` | CREATE | Mirrors usePwaStatus, ~25 lines. |
| `src/hooks/cogniblend/useLegalAcceptance.ts` | MODIFY | +5 lines invalidation. |
| `src/components/cogniblend/creator/SkpaAcceptanceDialog.tsx` | CREATE | ~120 lines. |
| `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` | MODIFY | +15 lines, no submit-shape change. |
| `src/components/cogniblend/solver/CpaEnrollmentGate.tsx` | MODIFY | Replace inline queries with `useCpaGateContext`; drop below 250 lines. |
| `src/components/cogniblend/workforce/PwaAcceptanceGate.tsx` | MODIFY | Add optional interpolation via `usePwaGateContext`. |
| `src/components/auth/ReviewerGuard.tsx` | MODIFY | +10 lines, role-level PWA gate. |
| `src/components/org-settings/CpaVariableReference.tsx` | MODIFY | Pull list from new registry. |
| `src/constants/cpaDefaults.constants.ts` | MODIFY | Re-export expanded variable list. |
| `src/components/cogniblend/creator/CreatorLegalPreview.tsx` | NO CHANGE | Already correct. |
| `src/services/engagementModelRulesService.ts` | NO CHANGE | Already correct (drop Part F). |
| `src/hooks/cogniblend/useChallengeSubmit.ts` | NO CHANGE | Drop Part E1. |

## What is explicitly NOT done (with reason)

- **No new `templateInterpolation.ts`** — would shadow the server-mirroring interpolator.
- **No `useTemplateContext` mega-hook** — replaced by service + 2 small composite hooks.
- **No MP fallback in `CreatorLegalPreview`** — Part F is already done correctly via `engagementModelRulesService`. Adding fallback would break the platform-governance rule that orgs on MP cannot override platform CPA.
- **No `useChallengeSubmit` return-shape change** — SKPA gate is enforced in the form, not the mutation.
- **No HTML `<span style>` injection in preview mode** — XSS-safe only if rendered via `LegalDocumentViewer` with sanitization; preview mode kept for the *creator-side editor only*, never for solver/CU/LC/FC acceptance gates.

## Safety guarantees preserved

- `legal_acceptance_log` schema: untouched.
- `legal_document_templates`, `org_legal_document_templates` schemas: untouched.
- `assemble_cpa` RPC: untouched. Client interpolator extended *in lock-step*; any new variable added to client must also be added to server in a follow-up migration before production rollout.
- `seed_default_legal_docs`: untouched.
- Public APIs of `ScrollToAcceptLegal`, `CpaEnrollmentGate`, `PwaAcceptanceGate`: unchanged (only internal queries swapped).
- Existing tests in `Wave6EnrollmentFlow.test.tsx` continue to pass (component prop shape preserved).
