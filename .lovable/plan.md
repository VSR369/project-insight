
# Legal Template Variables + Missing Enrollment Gates — Implementation Plan

## Goal

Two outcomes:
1. **Richer legal template interpolation** — workforce-facing legal docs (CPA, PWA) display org-, geo-, industry-, user-aware values instead of raw `{{variables}}`, while staying byte-identical to what the server's `assemble_cpa` RPC stores.
2. **Two missing enrollment gates** — Creator must accept SKPA before first challenge submit; Expert Reviewer must accept PWA before first review action.

## Non-negotiable safety rules

- `legal_acceptance_log`, `legal_document_templates`, `org_legal_document_templates` schemas: untouched.
- `assemble_cpa` RPC and `seed_default_legal_docs`: untouched.
- Public APIs of `ScrollToAcceptLegal`, `CpaEnrollmentGate`, `PwaAcceptanceGate`: unchanged.
- `useChallengeSubmit` mutation return shape: unchanged.
- Existing `src/services/legal/cpaPreviewInterpolator.ts` is the single source of truth for variable resolution (mirrors server). It is **extended**, never replaced or shadowed.
- All client-side label/clause text already lives in `src/constants/legalPreview.constants.ts` — that remains the only place those strings live.

## Architecture (per workspace rules R1, R2, R10)

```
Components (render only)
    ↓ call
Hooks (data fetch + react-query)
    ↓ call
Services (pure logic — composition, interpolation)
    ↓ uses
Constants (label maps, clause text, defaults)
```

No new Supabase calls inside components. No new "kitchen-sink" hooks. Each new file <250 lines.

## Implementation steps

### Step 1 — Extend the variable surface (no logic duplication)

**File: `src/services/legal/cpaPreviewInterpolator.ts`** (EXTEND existing)
- Add optional fields to `CpaPreviewInput`: `seeker_legal_entity`, `seeker_country`, `seeker_industry`, `data_privacy_laws`, `regulatory_frameworks`, `industry_name`, `industry_certifications`, `industry_frameworks`, `user_full_name`, `user_email`, `user_role`, `acceptance_date`, `escrow_required`, `payment_mode`, `installment_count`, `platform_fee_pct`, `platform_name`.
- Extend `buildPreviewVariables` to emit these keys via the existing `safeString` helper. **No new locale formatting** — server stores raw strings, client must match.
- No new label maps. New clause text (if any) goes in the constants file.

**File: `src/constants/legalPreview.constants.ts`** (EXTEND)
- Add: `PLATFORM_NAME = 'CogniBlend'`, `ROLE_LABELS` (`{ creator, solver, curator, lc, fc, er, workforce }`), `LEGAL_TRIGGER_EVENTS` (`{ CHALLENGE_SUBMIT, ENROLLMENT, ROLE_ACCEPTANCE }`), `SOLVER_AUDIENCE_LABELS`, `ENGAGEMENT_MODEL_LABELS`.
- These mirror exact server strings where the server already emits them.

**File: `src/lib/cogniblend/legal/templateVariables.ts`** (NEW, ~50 lines)
- **Documentation only.** Exports `VARIABLES_BY_DOCUMENT: Record<DocCode, readonly { name: string; description: string }[]>` for the `CpaVariableReference` UI to list available variables per document type. Zero interpolation logic here.

### Step 2 — Pure context composer (service, not hook)

**File: `src/services/legal/templateContextBuilder.ts`** (NEW, ~80 lines)
- Pure function `buildCpaPreviewInput(args: { challenge?, org?, countryName?, industrySegmentName?, geoContext?, industryPack?, legalConfig?, user?, escrow?, roleName? }) → CpaPreviewInput`.
- No data fetching. Composes already-fetched inputs into the shape the existing interpolator consumes.

### Step 3 — Thin per-surface composite hooks

**File: `src/hooks/queries/useCpaGateContext.ts`** (NEW, ~60 lines)
- Single composite hook for `CpaEnrollmentGate(challengeId)`.
- Fetches challenge + org via existing column-scoped selects, reuses `useGeoContextForOrg`, calls `buildCpaPreviewInput`, returns `CpaPreviewVariables` ready for `interpolateCpaTemplate`.
- Replaces the 2 inline supabase calls currently inside `CpaEnrollmentGate` (R2 cleanup).

**File: `src/hooks/queries/usePwaGateContext.ts`** (NEW, ~40 lines)
- Same pattern for `PwaAcceptanceGate(challengeId?)`. When `challengeId` is null (role-level acceptance), returns minimal context (user + role).

### Step 4 — Wire interpolation into acceptance surfaces

- **`CpaEnrollmentGate`**: replace inline supabase queries with `useCpaGateContext`; pass `interpolateCpaTemplate(content, ctx, 'final')` to `LegalDocumentViewer`. Component drops below 250 lines.
- **`PwaAcceptanceGate`**: when `challengeId` present, call `usePwaGateContext` and interpolate. When absent, render raw template (role-level PWA has no challenge context).
- **`ScrollToAcceptLegal`**: NO API change. JSDoc note added: "Caller must pass already-interpolated text — this component renders plain text only."
- **`CreatorLegalPreview`**: NO change. Already accepts `templateContext: CpaPreviewVariables` and uses `interpolateCpaTemplate` correctly.

### Step 5 — Cache invalidation on acceptance (fixes desync bug)

**File: `src/hooks/cogniblend/useLegalAcceptance.ts`** (MODIFY)
- In `useRecordLegalAcceptance.onSuccess`, invalidate:
  - `['pwa-acceptance-status', userId]`
  - `['skpa-acceptance-status', userId]`
  - `['cpa-enrollment', challengeId]` (when applicable)
- Without this, local `pwaAccepted` state desyncs from `usePwaStatus` after navigation.

### Step 6 — Creator SKPA gate (smallest viable path)

**File: `src/hooks/cogniblend/useSkpaStatus.ts`** (NEW, ~25 lines)
- Mirrors `usePwaStatus`. Returns `{ hasSkpa, isLoading }` from `legal_acceptance_log` filtered by `user_id` + `document_code='SKPA'`.

**File: `src/components/cogniblend/creator/SkpaAcceptanceDialog.tsx`** (NEW, ~120 lines)
- AlertDialog wrapping `ScrollToAcceptLegal`.
- Fetches SKPA template via `useLegalDocTemplates`. If template missing → toast error via `handleQueryError`, refuse to mount (no silent skip — same lesson as the AGG-legal silent-failure issue).
- On accept → `useRecordLegalAcceptance` with `trigger_event = LEGAL_TRIGGER_EVENTS.CHALLENGE_SUBMIT` → `onAccepted()` callback.

**File: `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`** (MODIFY, +15 lines)
- Before invoking submit mutation, check `useSkpaStatus(user.id)`. If `!hasSkpa`, open `SkpaAcceptanceDialog`. On accept, re-trigger the form's submit handler.
- `useChallengeSubmit` itself is **not modified**.

### Step 7 — Expert Reviewer PWA gate at guard level (not page level)

**File: `src/components/auth/ReviewerGuard.tsx`** (MODIFY, +10 lines)
- Add `usePwaStatus(user.id)` check. If reviewer role + `!hasPwa`, render `PwaAcceptanceGate` instead of children.
- One change covers `ScreeningReviewPage`, `AISpecReviewPage`, `WinnerSelectionPage`, and any future ER page automatically.
- Loading state: render existing skeleton while PWA status resolves (R6).

### Step 8 — Update variable reference UI

**File: `src/constants/cpaDefaults.constants.ts`** (MODIFY)
- Re-export the expanded variable list from `templateVariables.ts` so `CpaVariableReference.tsx` (no code change needed) shows the full set in the Org Settings → Legal Templates editor.

## Files summary

| File | Action | Approx lines |
|---|---|---|
| `src/services/legal/cpaPreviewInterpolator.ts` | EXTEND | +40 (new fields) |
| `src/constants/legalPreview.constants.ts` | EXTEND | +30 (constants) |
| `src/lib/cogniblend/legal/templateVariables.ts` | CREATE | ~50 |
| `src/services/legal/templateContextBuilder.ts` | CREATE | ~80 |
| `src/hooks/queries/useCpaGateContext.ts` | CREATE | ~60 |
| `src/hooks/queries/usePwaGateContext.ts` | CREATE | ~40 |
| `src/hooks/cogniblend/useSkpaStatus.ts` | CREATE | ~25 |
| `src/hooks/cogniblend/useLegalAcceptance.ts` | MODIFY | +5 (invalidation) |
| `src/components/cogniblend/creator/SkpaAcceptanceDialog.tsx` | CREATE | ~120 |
| `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` | MODIFY | +15 |
| `src/components/cogniblend/solver/CpaEnrollmentGate.tsx` | MODIFY | net −20 (drops below 250 lines) |
| `src/components/cogniblend/workforce/PwaAcceptanceGate.tsx` | MODIFY | +12 (interpolation) |
| `src/components/auth/ReviewerGuard.tsx` | MODIFY | +10 |
| `src/constants/cpaDefaults.constants.ts` | MODIFY | +5 (re-export) |

**No DB migration required.** No edge function changes required. No changes to RPCs, RLS, or table schemas.

## Verification checklist

- [ ] CPA preview text in `CreatorLegalPreview` matches text shown in `CpaEnrollmentGate` for the same challenge (server-parity check).
- [ ] Creator submitting first challenge sees SKPA dialog; second submit goes straight through.
- [ ] ER navigating to `/cogni/challenges/:id/screen` without PWA sees gate; after accept, gate stays dismissed across `AISpecReviewPage` navigation (cache invalidation working).
- [ ] No new TypeScript errors. No file >250 lines.
- [ ] `rg "from '@supabase/.*'" src/components/` returns no new matches inside the modified components (R2 preserved).
- [ ] `rg "console\.(log|warn|error)"` returns no new matches (R9 preserved).

## Explicitly out of scope

- New global `templateInterpolation.ts` (would shadow the server-mirroring interpolator).
- Changes to MP/AGG template-source resolution in `CreatorLegalPreview` (already correct via `engagementModelRulesService`).
- Changes to `useChallengeSubmit` return shape.
- Server-side `assemble_cpa` extension — done as a separate follow-up migration only after this client work ships and is verified.
