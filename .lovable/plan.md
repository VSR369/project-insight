

## Analysis & Fix Plan: Remaining Open Bugs

### Verified Status

| # | Issue | Status | Evidence |
|---|-------|--------|----------|
| draftForm null on first render | **FIXED** | `form` passed directly to `useCreatorDraftSave` (line 96-97) |
| cogni-my-challenges invalidation | **FIXED** | Present in `useSaveDraft.onSuccess` (line 351) and `useUpdateDraft.onSuccess` (line 379) |
| assign_challenge_role RECORD vs JSONB | **FIXED** | DB proc shows `v_validation JSONB` and `(v_validation->>'allowed')::boolean` |
| sendRoutedNotification not called | **FIXED** | Called at lines 223 (ROLE_ASSIGNED) and 263 (PHASE_COMPLETE) in useChallengeSubmit |
| complete_phase sla_hours vs sla_days | **FIXED** | DB proc shows `v_next_config.sla_days` throughout |
| notification_routing phase alignment | **FIXED** | Phase 2 rows exist for ROLE_ASSIGNED and PHASE_COMPLETE |
| reassign_role missing SLM tracking | **FIXED** | DB proc uses `assign_challenge_role`, handles pool decrement |
| referenceUrls saved on draft | **BROKEN** | `useCreatorDraftSave.ts` base object (lines 53-75) never includes `referenceUrls` |
| Draft loader restores referenceUrls | **BROKEN** | `useCreatorDraftLoader.ts` never reads `extended_brief.reference_urls` |
| evaluation_criteria parsed on draft load | **BROKEN** | Line 100 checks `Array.isArray(evaluation_criteria)` but DB stores `{ weighted_criteria: [...] }` — always fails, criteria lost on resume |
| Legal docs visible during Phase 2 | **STRUCTURAL GAP** | `challenge_legal_docs` rows only created at Phase 3 entry. Phase 2 shows nothing. |
| Files uploaded on draft save | **BY DESIGN** | Files held in React state, uploaded only on final submit. Acceptable — but worth noting. |

### Bugs to Fix (4 items)

---

**Fix 1: `useCreatorDraftSave.ts` — Pass `referenceUrls` in draft payload**

The `base` object (lines 53-75) never includes reference URLs. The form stores them in React state (`referenceUrls`), not in the RHF form. This means the hook needs access to them.

- Add `referenceUrls?: string[]` to the config interface
- Pass it through from `ChallengeCreatorForm.tsx`
- Include `referenceUrls: config.referenceUrls` in the `base` object

**File changes:** `useCreatorDraftSave.ts` (add config field + pass to payload), `ChallengeCreatorForm.tsx` (pass `referenceUrls` to `useCreatorDraftSave`)

---

**Fix 2: `useCreatorDraftLoader.ts` — Restore referenceUrls from extended_brief**

The draft loader reads `extended_brief` but never extracts `reference_urls`. After draft save writes them (Fix 1), they need to be restored when resuming.

Since `referenceUrls` lives in React state (not RHF), the loader needs a callback to set them. Add an optional `onReferenceUrlsLoaded?: (urls: string[]) => void` param.

- Parse `eb?.reference_urls` as `string[]`
- Call `onReferenceUrlsLoaded(urls)` if present

**File changes:** `useCreatorDraftLoader.ts` (add param + parse), `ChallengeCreatorForm.tsx` (pass callback)

---

**Fix 3: `useCreatorDraftLoader.ts` — Fix evaluation_criteria parsing**

Line 100: `Array.isArray((challenge).evaluation_criteria)` — but DB stores `{ weighted_criteria: [...] }`. This always returns `false`, so `weighted_criteria` is never restored from a draft.

Fix: Extract `weighted_criteria` from the JSONB wrapper:
```typescript
const ec = (challenge as Record<string, unknown>).evaluation_criteria as Record<string, unknown> | null;
const weightedCriteria = Array.isArray(ec?.weighted_criteria) ? ec.weighted_criteria : [];
```

**File changes:** `useCreatorDraftLoader.ts` (fix parsing logic at line 100)

---

**Fix 4: `ChallengeLegalDocsCard.tsx` — Show legal template preview during Phase 2**

Currently shows "Legal documents will be assembled after curation review" for Phase 2. Instead, query `legal_document_templates` (or `org_legal_document_templates` for AGG) and show a preview of which templates will be applied.

- When `currentPhase < 3` and no `challenge_legal_docs` exist, query the templates table
- Display them as "Planned" with a preview badge instead of an empty state
- Keep the actual `challenge_legal_docs` display for Phase 3+

**File changes:** `ChallengeLegalDocsCard.tsx` (add template preview query + render)

---

### Files Changed (4)

| File | Changes |
|------|---------|
| `src/hooks/cogniblend/useCreatorDraftSave.ts` | Add `referenceUrls` to config + include in draft payload |
| `src/hooks/cogniblend/useCreatorDraftLoader.ts` | Fix `evaluation_criteria` parsing; restore `referenceUrls` via callback |
| `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` | Pass `referenceUrls` to draft save hook; pass URL restore callback to draft loader |
| `src/components/cogniblend/challenges/ChallengeLegalDocsCard.tsx` | Add legal template preview for Phase 2 |

