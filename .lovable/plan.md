

## Rename Expertise Levels & Certification Tiers — Impact Analysis & Implementation Plan

---

### IMPACT ANALYSIS

**Scope**: This is a naming/labeling change across DB data + frontend constants. No structural schema changes. No new columns or tables.

**Risk Assessment**:

| Area | Risk | Detail |
|---|---|---|
| `finalize_certification` RPC (DB function) | **HIGH** | Hardcodes `'basic'`, `'competent'`, `'expert'` as certification_level values written to `provider_industry_enrollments`. Must be updated to `'proven'`, `'acclaimed'`, `'eminent'` or the RPC will write stale values that don't match the new type. |
| `FinalResultTabContent.tsx` | **MEDIUM** | Casts `data.certificationLevel as CertificationLevel` then looks up `CERTIFICATION_LEVELS[certLevel]`. If DB returns old value `'basic'` (from un-migrated rows), lookup returns `undefined`. The data UPDATE migration covers this. |
| `Certification.tsx` | **MEDIUM** | Line 40 hardcodes `as 'basic' \| 'competent' \| 'expert' \| null` — must change to new values. |
| `SeekerConfigKCPage.tsx` | **LOW** | Contains "Principal consultant" in help text — should update to "Pioneer" for consistency. Not in original spec but flagged. |
| Subscription tier `'basic'` | **SAFE** | Completely separate system (`md_subscription_tiers`). Not touched. |
| `solverAutoAssign.ts` | **SAFE** | Uses `certified_basic/competent/expert` as codes — codes stay unchanged per spec. |
| Edge functions | **SAFE** | No hardcoded `'basic'`/`'competent'`/`'expert'` certification level strings found. |
| `regressionTestKit` | **SAFE** | References `'basic'` in subscription tier context, not certification. |

**Critical Finding**: The `finalize_certification` Postgres function (lines 79/82/85 of migration `20260203005915`) writes `'expert'`, `'competent'`, `'basic'` as certification_level values. This MUST be updated in a new migration or newly certified providers will get old-format values.

---

### IMPLEMENTATION PLAN

**Phase A: Database (2 data operations + 1 RPC migration)**

1. **Data updates** (via insert tool — these are data changes, not schema):
   - Update `expertise_levels` names: L1→Explorer, L2→Catalyst, L3→Maestro, L4→Pioneer
   - Update `provider_industry_enrollments.certification_level`: basic→proven, competent→acclaimed, expert→eminent
   - Update `md_solver_eligibility` labels only (codes unchanged)

2. **Migration** (schema change — new RPC version):
   - `CREATE OR REPLACE FUNCTION finalize_certification(...)` — change hardcoded values: `'expert'`→`'eminent'`, `'competent'`→`'acclaimed'`, `'basic'`→`'proven'`

**Phase B: Frontend Constants (3 files)**

3. **`src/types/certification.types.ts`** — Change type union, CERTIFICATION_LEVEL_DISPLAY keys/labels, starRatingToLevel returns

4. **`src/constants/certification.constants.ts`** — Change type union, OUTCOME_DISPLAY level values, CERTIFICATION_LEVELS keys/labels/descriptions, starRatingToLevel returns

5. **`src/constants/challengeOptions.constants.ts`** — Update ELIGIBILITY_MODELS labels only (codes unchanged)

**Phase C: UI Components (5 files)**

6. **`src/pages/enroll/Certification.tsx`** — Line 40: change `as 'basic' | 'competent' | 'expert'` → `as 'proven' | 'acclaimed' | 'eminent'`

7. **`src/components/cogniblend/curation/CuratorGuideModal.tsx`** — Replace "Principal Consultant Grade/Level" → "Maestro Grade/Level"

8. **`src/pages/admin/question-bank/QuestionBankPage.tsx`** — Replace expertise level names in template data

9. **`src/pages/admin/question-bank/QuestionImportDialogOptimized.tsx`** — Same template data replacement

10. **`src/pages/admin/proficiency-taxonomy/ProficiencyExcelExport.ts`** — Replace "Associate Consultant" → "Explorer"

**Phase D: Additional fix (found during analysis)**

11. **`src/pages/admin/knowledge-centre/SeekerConfigKCPage.tsx`** — Line 121: "Principal consultant" → "Pioneer" in help text

12. **`src/hooks/mutations/useFinalizeCertification.ts`** — Line 117 toast shows `result.certification_level` raw from DB. After RPC update it will return `'proven'`/`'acclaimed'`/`'eminent'`. Could improve by looking up `CERTIFICATION_LEVELS[level].label` but the raw value is now user-friendly enough. Optional enhancement.

**Phase E: Verification**

13. Verify `FinalResultTabContent.tsx` — reads from constants, no hardcoded strings. No change needed.
14. Verify `DashboardEnrollmentCard.tsx` — uses star_rating only. No change needed.
15. Verify `solverAutoAssign.ts` — uses codes only. No change needed.

---

### WHAT IS NOT CHANGED (per spec)

- Eligibility codes: `certified_basic`, `certified_competent`, `certified_expert` (DB keys)
- `md_subscription_tiers` references to `'basic'`
- `regressionTestKit` subscription tier references
- Star rating numeric values (1, 2, 3)
- `BREADTH_ORDER` in `generate-challenge-spec/index.ts`

---

### EXECUTION ORDER

1. DB data updates first (expertise_levels, enrollment certification_level values, solver eligibility labels)
2. DB migration for RPC update
3. Frontend constants (certification.types.ts, certification.constants.ts, challengeOptions.constants.ts)
4. UI components (Certification.tsx, CuratorGuideModal.tsx, QuestionBankPage.tsx, QuestionImportDialogOptimized.tsx, ProficiencyExcelExport.ts, SeekerConfigKCPage.tsx)
5. Verify toast in useFinalizeCertification.ts flows correctly

**Total files changed**: 8 frontend files + 1 migration + 3 data updates. Zero structural changes. Zero breaking risk if executed atomically.

