

# Audit: Governance Compliance Gaps in Data Pipeline

## Findings

### Issue 1: `domain_tags` bypasses governance filtering entirely

**`FORM_FIELD_TO_GOVERNANCE_KEY`** does NOT include `domain_tags`. So even though the detail view has `fieldKey: 'domain_tags'` for display filtering, the following bypass governance:

- **Fill Test Data** (line 438): `domain_tags: domainIds` is always injected AFTER `filterSeedByGovernance()` runs
- **Submission** (line 220): `domain_tags: payload.domainTags` uses the raw `payload`, not `filteredPayload`
- **Snapshot** (line 255): `domain_tags: payload.domainTags` — same bypass

### Issue 2: Several submission fields use raw `payload` instead of `filteredPayload`

In `useSubmitSolutionRequest.ts`, these lines reference the unfiltered `payload` object, defeating governance filtering:

| Line | Field | Uses |
|------|-------|------|
| 158-170 | `rewardStructure` (budget_min, budget_max, currency) | `payload.budgetMin`, `payload.budgetMax`, `payload.currency` |
| 208 | `governance_mode_override` | `payload.governanceModeOverride` (fine — not content) |
| 210-216 | `eligibility` JSON | `payload.domainTags`, `payload.urgency`, `payload.industrySegmentId`, etc. |
| 220 | `domain_tags` | `payload.domainTags` |
| 251 | snapshot `title` | `payload.title` (fine — always visible) |
| 255 | snapshot `domain_tags` | `payload.domainTags` |
| 257-259 | snapshot `budget_min/max/currency` | `payload.budgetMin/Max/currency` |

Budget fields are governed by `platinum_award` field_key but the mapping doesn't include `budgetMin`/`budgetMax`/`budget_min`/`budget_max`.

### Issue 3: Missing keys in `FORM_FIELD_TO_GOVERNANCE_KEY`

Fields that should be governance-aware but are missing from the mapping:

| Missing Key | Governance field_key | Impact |
|-------------|---------------------|--------|
| `domain_tags` | `domain_tags` | Always sent to DB and snapshot |
| `budgetMin` / `budget_min` | `platinum_award` | Budget always persisted |
| `budgetMax` / `budget_max` | `platinum_award` | Budget always persisted |
| `expected_outcomes` / `expectedOutcomes` | `expected_outcomes` | Always sent (but is mandatory for all modes, so low risk) |
| `maturity_level` | `maturity_level` | Always sent |
| `deliverables_list` | `deliverables_list` | Curator-only field, not in Creator form |
| `weighted_criteria` | `weighted_criteria` | Curator-only field |

### Issue 4: Creator snapshot renders domain_tag UUIDs, not human-readable names

In the snapshot (line 255), `domain_tags: payload.domainTags` stores raw UUIDs (e.g., `["a1b2c3..."]`). The detail view (line 368) renders these UUIDs as badge text, showing cryptic IDs to the user instead of tag names like "Manufacturing" or "IoT".

## Fix Plan

### 1. Add missing keys to `FORM_FIELD_TO_GOVERNANCE_KEY`

**File: `src/lib/cogniblend/governanceFieldFilter.ts`**

Add `domain_tags`, `budgetMin`, `budgetMax`, `budget_min`, `budget_max`, `maturity_level`, and `expected_outcomes` mappings.

### 2. Fix submission to use `filteredPayload` consistently

**File: `src/hooks/cogniblend/useSubmitSolutionRequest.ts`**

- Change `domain_tags: payload.domainTags` to `domain_tags: filteredPayload.domainTags`
- Build `rewardStructure` from `filteredPayload` budget values (fall back to 0 if stripped)
- Build `eligibility` JSON from `filteredPayload`
- Apply same fixes in snapshot construction
- Apply same pattern in `useSaveDraft` and `useUpdateDraft`

### 3. Fix Fill Test Data to respect governance for domain_tags

**File: `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`**

Move `domain_tags: domainIds` into the seed BEFORE filtering so `filterSeedByGovernance` can strip it if hidden. Or conditionally add it only if `domain_tags` is visible per field rules.

### 4. Resolve domain_tags UUID display issue

**File: `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx`**

The snapshot stores UUIDs for domain_tags. Two options:
- **Option A**: Store resolved tag names in the snapshot at submission time (preferred — snapshot is immutable)
- **Option B**: Resolve UUIDs to names at display time via a lookup query

Recommend Option A: resolve tag names during snapshot creation in `useSubmitSolutionRequest.ts` by querying the domain tag names before building the snapshot.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/cogniblend/governanceFieldFilter.ts` | Add missing field mappings (domain_tags, budget, maturity_level) |
| `src/hooks/cogniblend/useSubmitSolutionRequest.ts` | Use `filteredPayload` consistently; resolve domain tag names for snapshot |
| `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` | Governance-aware domain_tags in Fill Test Data |
| `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx` | Handle UUID-based domain_tags gracefully (fallback display) |

