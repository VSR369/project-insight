

# Gap Analysis: Two Documents vs Current Implementation

## Document 1: FINAL-CONTEXT-INTELLIGENCE-PLAN-2.md (Phase 7)

All 10 prompts (7.1–7.10) are marked **Done** in `.lovable/plan.md` and verified in code:

| Prompt | Scope | Status | Evidence |
|--------|-------|--------|----------|
| 7.1 | `discovery_directives` JSONB + seed 27 sections | DONE | Migration exists |
| 7.2 | Enhanced `challenge_attachments` + `challenge_context_digest` table | DONE | Migration exists |
| 7.3 | `discover-context-resources` edge function | DONE | Function deployed |
| 7.4 | `generate-context-digest` edge function | DONE | Function deployed |
| 7.5 | Enhance `extract-attachment-text` with Tier 2 | DONE | Function deployed |
| 7.6 | `useContextLibrary.ts` hook | DONE | File exists |
| 7.7 | `ContextLibraryDrawer.tsx` | DONE | File exists |
| 7.8 | `ContextLibraryCard.tsx` + wire into CurationReviewPage | DONE | File exists, wired at line 4126 |
| 7.9 | Fix Pass 1 + inject digest + grounding rule | DONE | Edge function updated |
| 7.10 | `DiscoveryDirectivesEditor.tsx` + ResearchTab + AIReviewConfigPage | DONE | Files exist |

### One Gap Found in Document 1

**SectionReferencePanel "View in Library" link** — The plan (lines 329-336) specifies adding a `"View all sources in Context Library"` link at the bottom of `SectionReferencePanel` and an `onOpenLibrary(sectionKey)` prop. This was **NOT implemented**. The component has no reference to `onOpenLibrary` or any library link. The plan.md marks 7.8b as done, but this sub-item was skipped.

---

## Document 2: FINAL-EXECUTION-PLAN-3.md (Phases 1–6)

| Prompt | Scope | Status | Evidence |
|--------|-------|--------|----------|
| **Phase 1: Bug Fixes** | | | |
| 1.1 | Fix `isFieldVisible` for 'auto' | DONE | `useGovernanceFieldRules.ts` line 73 has the fix |
| 1.2 | Fix operator precedence in MyChallengesPage | DONE | Previously implemented (parentheses present) |
| 1.3 | Fix form resolver key prop | DONE | Previously implemented |
| 1.4 | Fix snapshot format mismatch | DONE | `serializeLineItems` used |
| 1.5 | Fix useEffect dependency | DONE | Previously implemented |
| 1.6 | Fix solo mode threshold | DONE | `CogniRoleContext.tsx` line 44: `>= 4` |
| **Phase 2: Legacy Role Cleanup** | | | |
| 2.1 | Remove CA from permission checks | DONE | Previously implemented |
| 2.2 | Remove CA from CurationActions | DONE | `.eq("role_code", "CR")` present |
| 2.3 | Replace ID with CU/CR in approval hooks | DONE | Previously implemented |
| 2.4 | DB: Update role_authority_matrix | DONE | Migration exists |
| 2.5 | DB: Update notification_routing | DONE | Migration exists |
| 2.6 | Delete dead code | DONE | `SimpleIntakeForm.tsx` and `ConversationalIntakePage.tsx` deleted |
| 2.7 | Clean up legacy role text references | DONE | Previously implemented |
| **Phase 3: Creator Form Alignment** | | | |
| 3.1 | DB: Fix governance field rules | DONE | Migration exists |
| 3.2 | Align Creator form schema with DB rules | DONE | Previously implemented |
| 3.3 | Hide QUICK fields in AdditionalContextTab | DONE | Previously implemented |
| 3.4 | Strip auto/hidden fields from Creator snapshot | DONE | Previously implemented |
| 3.5 | Extract shared display helpers | DONE | `displayHelpers.ts` exists, imported in 3 files |
| 3.6 | Extract shared draft payload builder | DONE | Previously implemented |
| **Phase 4: Creator Approval Flow** | | | |
| 4.1 | Add Creator Approval toggle | DONE | `creator_approval_required` in schema and `StepModeSelection.tsx` |
| 4.2 | DB: Create section approvals table | DONE | `challenge_section_approvals` migration exists |
| 4.3 | Update CurationActions for creator approval | DONE | `crApprovalRequired` and `CR_APPROVAL_PENDING` present |
| 4.4 | Update MyChallengesPage for approval state | DONE | `CR_APPROVAL_PENDING` handling at line 40 |
| 4.5 | Add approval banner to CreatorChallengeDetailView | DONE | `isPendingApproval` at line 259 |
| **Phase 5: Role Separation** | | | |
| 5.1 | DB: Role separation validation function | **NOT DONE** | `validate_role_separation` does not exist in any migration |
| **Phase 6: Governance-Aware Phase Gating** | | | |
| 6.1 | DB: Phase 3 gate validation function | **NOT DONE** | `validate_gate_03` function CREATE is missing — only the call in `complete_phase` exists (will crash at runtime) |
| 6.2 | Wire Phase 3 gate into complete_phase | **PARTIAL** | The IF block calling `validate_gate_03` exists in migration, but the function itself was never created |

---

## Summary of Gaps

### Gap 1: SectionReferencePanel "View in Library" link (Doc 1, Prompt 7.8)
- Missing `onOpenLibrary` prop and "View all sources in Context Library" link
- Low complexity — ~15 lines of changes

### Gap 2: `validate_role_separation` DB function (Doc 2, Prompt 5.1)
- The entire function is missing — CONTROLLED mode role separation (CR cannot be CU) is not enforced
- Medium complexity — one migration with the function

### Gap 3: `validate_gate_03` DB function (Doc 2, Prompt 6.1)
- The function body is missing but `complete_phase` already calls it — this will cause a **runtime error** when any challenge tries to advance past Phase 3
- High priority — the call exists but the function doesn't, so Phase 3 completion will throw an exception

### Recommended Fix Order
1. **Gap 3** (Critical) — Create `validate_gate_03` function to prevent runtime crash
2. **Gap 2** (Important) — Create `validate_role_separation` function for CONTROLLED governance
3. **Gap 1** (Minor) — Add SectionReferencePanel library link for better UX

