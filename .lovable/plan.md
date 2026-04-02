

# Phase D1.1 Implementation — Extract Constants + Helpers from CurationReviewPage

## What gets created (3 files)

### File 1: `src/lib/cogniblend/curationTypes.ts` (~95 lines)
All interfaces extracted from lines 158-236 + 268-275 + 901-909 + 1191-1194:
- `ChallengeData`, `LegalDocSummary`, `LegalDocDetail`, `EscrowRecord`, `ComplexityParam`
- `AIQualitySummary`, `SectionDef`, `GroupDef`

### File 2: `src/lib/cogniblend/curationHelpers.ts` (~200 lines)
Pure functions from lines 241-259 + 991-1212:
- `parseJson<T>()` — generic JSON parser
- `getFieldValue()` — extract field value for editing
- `getDeliverableItems()`, `getDeliverableObjects()`, `getExpectedOutcomeObjects()`, `getSubmissionGuidelineObjects()` — structured data extractors
- `getEvalCriteria()` — evaluation criteria parser
- `getSectionContent()` — content resolver for AI refinement
- `computeAutoChecks()` — checklist auto-check logic
- `resolveIndustrySegmentId()` — industry segment resolver
- `GAP_FIELD_TO_SECTION` constant, `CHECKLIST_LABELS` constant

Imports needed: types from `curationTypes.ts`, `parseDeliverables` from `@/utils/parseDeliverableItem`, `EXTENDED_BRIEF_FIELD_MAP` from `@/lib/cogniblend/curationSectionFormats`, `unwrapEvalCriteria`, `unwrapArray`, `isJsonFilled`, `parseJson as jsonParse` from `@/lib/cogniblend/jsonbUnwrap`, `isControlledMode`, `resolveGovernanceMode` from `@/lib/governanceMode`

### File 3: `src/lib/cogniblend/curationSectionDefs.tsx` (~680 lines)
The SECTIONS array (lines 277-899), GROUPS array (lines 912-983), SECTION_MAP, LcStatusBadge component, LOCKED_SECTIONS and TEXT_SECTIONS constants.

**Note on size**: The SECTIONS array alone is 622 lines — a pure data/config array that cannot be split without restructuring. This is acceptable as a data file with no business logic. Further decomposition would violate the "MOVE, don't REWRITE" safety rule.

Imports needed: types from `curationTypes.ts`, helpers from `curationHelpers.ts`, plus React components used in render callbacks (AiContentRenderer, Badge, DeliverableCardRenderer, RewardStructureDisplay, Table components, lucide icons, getMaturityLabel, isControlledMode, resolveGovernanceMode).

## What gets modified

### `CurationReviewPage.tsx` — Remove ~950 lines, add 3 imports
- Remove lines 154-1212 (types, section defs, helpers, constants)
- Add imports:
```typescript
import { ChallengeData, LegalDocSummary, LegalDocDetail, EscrowRecord, ComplexityParam, AIQualitySummary } from '@/lib/cogniblend/curationTypes';
import { SECTIONS, GROUPS, SECTION_MAP, LOCKED_SECTIONS, TEXT_SECTIONS } from '@/lib/cogniblend/curationSectionDefs';
import { parseJson, getFieldValue, getDeliverableItems, getDeliverableObjects, getExpectedOutcomeObjects, getSubmissionGuidelineObjects, getEvalCriteria, getSectionContent, computeAutoChecks, resolveIndustrySegmentId, GAP_FIELD_TO_SECTION, CHECKLIST_LABELS } from '@/lib/cogniblend/curationHelpers';
```
- Keep the mid-file import of `complexityScoring` since it's used elsewhere in the component
- CurationReviewPage drops from 4,402 to ~3,450 lines

## Risk Assessment
- **ZERO risk** — pure data arrays and pure functions with no state, no closures, no side effects
- No exported interfaces change
- No React Query keys change
- No Supabase references change
- The page renders identically before and after

## Verification
After implementation: open any challenge from /cogni/curation, verify all 6 section groups render, section content displays, no console errors, no TypeScript errors.

