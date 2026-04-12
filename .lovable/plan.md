

## Creator & Curator Module — Compliance Gap Audit

Audit performed against Workspace Rules (R1–R12) and Project Knowledge standards.

---

### GAP 1: File Size Violations (R1 — MAX 250 lines)

| File | Lines | Over by |
|---|---|---|
| `src/hooks/cogniblend/useContextLibrary.ts` | 599 | +349 |
| `src/hooks/cogniblend/useChallengeSubmit.ts` | 402 | +152 |
| `src/hooks/cogniblend/useScreeningReview.ts` | 389 | +139 |
| `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts` | 332 | +82 |
| `src/hooks/cogniblend/useCurationPageData.ts` | 320 | +70 |
| `src/hooks/cogniblend/useCurationAIActions.ts` | 316 | +66 |
| `src/hooks/cogniblend/useComplexityState.ts` | 309 | +59 |
| `src/hooks/cogniblend/useSolverAmendmentStatus.ts` | 300 | +50 |
| `src/hooks/cogniblend/useCurationPageOrchestrator.ts` | 300 | +50 |
| `src/hooks/cogniblend/useOrgContextData.ts` | 266 | +16 |
| `src/hooks/cogniblend/useCurationComputedValues.ts` | 252 | +2 |
| `src/components/cogniblend/creator/CreatorOrgContextCard.tsx` | 405 | +155 |
| `src/components/cogniblend/creator/creatorSeedContent.ts` | 331 | +81 |
| `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` | 298 | +48 |
| `src/components/cogniblend/creator/CreatorPhaseTimeline.tsx` | 253 | +3 |
| `src/components/cogniblend/curation/PreFlightGateDialog.tsx` | 349 | +99 |
| `src/components/cogniblend/curation/CurationHeaderBar.tsx` | 314 | +64 |
| `src/components/cogniblend/curation/RewardDisplayContent.tsx` | 274 | +24 |
| `src/components/cogniblend/curation/SectionPanelItem.tsx` | 266 | +16 |
| `src/components/cogniblend/curation/CuratorGuideModal.tsx` | 261 | +11 |
| `src/components/cogniblend/curation/CurationActions.tsx` | 257 | +7 |
| `src/components/cogniblend/curation/ai-review/SuggestionEditors.tsx` | 367 | +117 |
| `src/components/cogniblend/curation/complexity/ComplexitySubComponents.tsx` | 360 | +110 |
| `src/components/cogniblend/curation/rewards/PrizeTierEditor.tsx` | 258 | +8 |
| `src/components/cogniblend/curation/ai-review/SuggestionVersionDisplay.tsx` | 255 | +5 |

**Total: 25 files over limit.** Priority: hooks > 300 lines (7 files), components > 300 lines (6 files).

---

### GAP 2: Supabase Calls in Components (R2 — Layer Separation, MOST CRITICAL)

Direct `supabase.from/rpc/storage` calls found in **component files** (should be in hooks/services only):

| Component | Operations |
|---|---|
| `curation/GovernanceModeSwitcher.tsx` | `.from('challenges').update()`, `.from('audit_trail').insert()` |
| `curation/SectionReferencePanel.tsx` | `.storage.upload()`, `.from('challenge_attachments').insert/update/delete()`, `.functions.invoke()` |
| `curation/CuratorCpaReviewPanel.tsx` | `.from('challenge_legal_docs').update()`, `.rpc('complete_phase')` |
| `curation/CurationActions.tsx` | `.rpc('log_audit')` |
| `curation/renderers/CreatorReferencesRenderer.tsx` | `.storage.createSignedUrl()` |
| `curation/SolverReferencePanel.tsx` | `.storage.createSignedUrl()` (read-only, lower severity) |

**6 component files violate R2.** These mutations should be extracted to hooks.

---

### GAP 3: `any` Type Usage (R3 — ZERO `any`)

**~217 occurrences** across 14 curation component files and **~217 occurrences** across 19 hook files. Worst offenders:

- `CurationSectionList.tsx` — 7+ `any` in props interface
- `CurationRightRail.tsx` — 6+ `any` in props
- `renderSectionContent.tsx` — 6+ `any` in props
- `useCurationPageOrchestrator.ts` — `value: any` in mutation
- `useCurationApprovalActions.ts` — 5+ `any` in interface/params
- `useComplexityState.ts` — `any` casts on params

---

### GAP 4: `console.log/warn/error` Usage (R9 — ZERO console)

| File | Type |
|---|---|
| `curation/SendForModificationModal.tsx` | `console.warn` |
| `hooks/useCurationApprovalActions.ts` | `console.error` |
| `hooks/useOrgContextData.ts` | `console.error` |
| `hooks/useCommunicationPermission.ts` | `console.error` |

Should use `handleMutationError`, `logWarning`, or `logInfo` from `errorHandler.ts`.

---

### GAP 5: `select('*')` Usage (R2/Project DB Standards)

| File | Table |
|---|---|
| `hooks/useApproveAmendment.ts` | `challenges` |
| `hooks/useCurationProgress.ts` | `curation_progress` |
| `components/ActivityFeed.tsx` | `recent_activity_view` |

Should specify columns explicitly.

---

### GAP 6: Missing `withCreatedBy`/`withUpdatedBy` Audit Fields (Project Rule 4)

Several component-level Supabase mutations skip audit field helpers:

- `GovernanceModeSwitcher.tsx` — manually sets `updated_by` instead of using `withUpdatedBy()`
- `SectionReferencePanel.tsx` — `.insert()` and `.update()` calls without `withCreatedBy`/`withUpdatedBy`
- `CurationActions.tsx` — `log_audit` RPC (acceptable — RPC handles audit internally)

---

### GAP 7: `as any` Type Casts

- `GovernanceModeSwitcher.tsx` line 63: `.update({...} as any)`
- `GovernanceModeSwitcher.tsx` line 78: `.insert({...} as any)`
- `useCurationPageOrchestrator.ts` line 117: `as any` on update payload

---

### GAP 8: Missing Error Handling in Component Mutations

- `SectionReferencePanel.tsx` — `updateAttachment` and `removeAttachment` mutations lack `onError` with `handleMutationError`
- `SectionReferencePanel.tsx` — `retryExtraction` has no error handling at all
- `GovernanceModeSwitcher.tsx` — mutation has `onError` with toast but not `handleMutationError`

---

### SUMMARY — Priority Matrix

| Priority | Gap | Impact | Files |
|---|---|---|---|
| P0 (Critical) | **R2: Supabase in components** | Architecture violation | 6 files |
| P1 (High) | **R1: File size > 250** | Maintainability | 25 files |
| P1 (High) | **R3: `any` types** | Type safety | ~33 files |
| P2 (Medium) | **R9: console usage** | Logging standards | 4 files |
| P2 (Medium) | **Audit fields missing** | Data traceability | 2 files |
| P2 (Medium) | **`select('*')`** | Performance/security | 3 files |
| P3 (Low) | **`as any` casts** | Type safety | 3 files |
| P3 (Low) | **Missing `handleMutationError`** | Error UX | 3 files |

---

### WHAT'S COMPLIANT (positive findings)

- Creator components (`src/components/cogniblend/creator/`) have **zero** direct Supabase calls — fully compliant with R2
- Most hooks properly use `handleMutationError` and `handleQueryError`
- `withCreatedBy`/`withUpdatedBy` used correctly in most hook-level mutations
- Forms use Zod + RHF (`creatorFormSchema.ts`)
- Lazy loading and route splitting in place
- Query cache constants (`CACHE_STANDARD`, `CACHE_FREQUENT`) used consistently
- Error handler centralized in `src/lib/errorHandler.ts`

---

### RECOMMENDED FIX ORDER

1. **Extract Supabase calls from 6 curation components** → new hooks (e.g., `useGovernanceModeMutation`, `useSectionAttachments`, `useCuratorCpaActions`)
2. **Split 7 hooks > 300 lines** (start with `useContextLibrary` at 599 lines)
3. **Replace `console.*` with errorHandler** in 4 files
4. **Replace `select('*')` with explicit columns** in 3 files
5. **Add `withCreatedBy`/`withUpdatedBy`** to uncovered mutations
6. **Type narrowing for `any`** — tackle prop interfaces first (CurationSectionList, CurationRightRail, renderSectionContent), then inline `any` casts

Shall I proceed with fixes? I recommend starting with P0 (Supabase extraction from components) as it's the most critical architectural violation.

