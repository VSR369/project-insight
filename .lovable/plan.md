

## Root Cause Analysis: Creator Detail View Missing Fields

### What the user sees

The challenge `f15d6710...` is CONTROLLED governance, Phase 2. The DB has rich data: hook, scope, context_background, affected_stakeholders (6 entries), root_causes, current_deficiencies, preferred_approach, approaches_not_of_interest, expected_timeline, weighted_criteria, etc. But the detail view only shows a handful of sections.

### Root Causes Identified

**Root Cause 1 — "My Version" snapshot missing `hook` and `weighted_criteria`**

The `creator_snapshot` has `hook: null` and `weighted_criteria: null`. The hook exists on the `challenges.hook` column but was never copied into the snapshot during Phase 1→2 transition. The weighted_criteria is nested inside `evaluation_criteria.weighted_criteria` in the snapshot — the builder correctly reads it from there, so this one actually works. But `hook` being null means the CONTROLLED-required "Value Proposition" section shows nothing in My Version.

**Root Cause 2 — "My Version" missing CONTROLLED-only fields (context_background, root_causes, stakeholders, etc.)**

`buildAllSnapshotSections` only builds sections for: title, problem_statement, hook, scope, context_background, currency_code, platinum_award, expected_timeline, maturity_level, ip_model, domain_tags, weighted_criteria, reference_urls.

It does NOT build sections for:
- `root_causes` (in snapshot's `extended_brief.root_causes`)
- `affected_stakeholders` (in snapshot's `extended_brief.affected_stakeholders`)
- `current_deficiencies` (in snapshot's `extended_brief.current_deficiencies`)
- `preferred_approach` (in snapshot's `extended_brief.preferred_approach`)
- `approaches_not_of_interest` (in snapshot's `extended_brief.approaches_not_of_interest`)
- `expected_outcomes` (in snapshot's `expected_outcomes`)

These fields ARE in the Curator Version builder but NOT in the snapshot builder. So "My Version" is always incomplete for CONTROLLED challenges.

**Root Cause 3 — `FilteredSections` does not use `fieldRules` from database**

The `CreatorChallengeDetailView` passes `creatorFieldKeys` to `FilteredSections` but never passes `fieldRules`. The `fieldRules` prop is optional and unused. This means the dynamic governance field rules from `md_governance_field_rules` are never consulted — the view relies solely on the hardcoded `CREATOR_SECTION_KEYS` array.

The CONTROLLED mode has 27 non-hidden field rules in the DB (including root_causes, affected_stakeholders, current_deficiencies, etc.) but the hardcoded `CREATOR_SECTION_KEYS.CONTROLLED` only lists 12 keys. Sections like root_causes, affected_stakeholders, etc. have `fieldKey` set so they get governance-gated — but they're not in the 12-key list, so they're filtered out.

**Root Cause 4 — Legal docs query returns empty**

`challenge_legal_docs` has zero rows for this challenge. This is expected — the challenge is still in Phase 2 (curation). Legal docs are only created during Phase 3 compliance review or via `auto_apply` in QUICK mode. The `ChallengeLegalDocsCard` correctly shows nothing. However, for CONTROLLED mode, a "Legal docs will be assembled after curation" message would be more informative than showing nothing.

**Root Cause 5 — Attachments query returns empty**

`challenge_attachments` has zero rows. The creator hasn't uploaded any files. This is correct behavior — `CreatorAttachmentsSection` correctly returns null when empty.

**Root Cause 6 — Organization context not shown**

The `extended_brief.context_background` is rich (multi-paragraph org context), but it's only shown if it appears in CREATOR_SECTION_KEYS. For CONTROLLED, `context_background` IS in the keys — so it should show in Curator Version. Let me verify: the Curator Version builder reads `(eb as Record<string, unknown>).context_background` and the data has `extended_brief.context_background` populated. This should work for Curator Version but only shows after Phase 3+ or CR_APPROVAL_PENDING (line 69-70). Since this challenge is Phase 2 with phase_status=ACTIVE, `showCuratorContent` is false — so Curator Version shows "Under Review by Curator" placeholder instead of actual content.

### Summary of Fixes Needed

| # | Bug | Fix |
|---|-----|-----|
| 1 | Snapshot builder missing 6 extended_brief fields | Add root_causes, affected_stakeholders, current_deficiencies, preferred_approach, approaches_not_of_interest, expected_outcomes sections to `buildAllSnapshotSections` |
| 2 | `CREATOR_SECTION_KEYS` too narrow for CONTROLLED | Either use `md_governance_field_rules` from DB (preferred) or expand hardcoded keys to include all CONTROLLED fields |
| 3 | Curator Version hidden during Phase 2 for the Creator | Change `showCuratorContent` to also show for Phase 2 challenges (the Creator should see what they submitted, even during curation) — OR show My Version properly (which requires fix #1) |
| 4 | `hook` not in creator_snapshot | Fix snapshot capture to include `hook` column. For existing data, fall back to `challenges.hook` in the snapshot builder |
| 5 | No "pending" message for legal docs in non-QUICK modes | Add a placeholder message in `ChallengeLegalDocsCard` for Phase 2 STRUCTURED/CONTROLLED |
| 6 | `useGovernanceFieldRules` not used in detail view | Fetch and pass `fieldRules` to `FilteredSections` for dynamic governance-aware filtering instead of relying solely on hardcoded keys |

### Implementation Plan

**File 1: `src/components/cogniblend/challenges/CreatorSectionBuilders.tsx`**

- Add 6 missing snapshot sections (root_causes, affected_stakeholders, current_deficiencies, preferred_approach, approaches_not_of_interest, expected_outcomes) reading from `eb.*` and snapshot root
- Add `hook` fallback: if `snapshot.hook` is null, still build the section entry (content will be null, which is fine — the filter removes it)
- Expand `CREATOR_SECTION_KEYS.CONTROLLED` to include all DB-configured required fields: root_causes, affected_stakeholders, current_deficiencies, expected_outcomes, preferred_approach, approaches_not_of_interest (total becomes 18 instead of 12)
- Similarly expand STRUCTURED if needed per DB rules

**File 2: `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx`**

- Import and call `useGovernanceFieldRules(effectiveGovernance)` 
- Pass `fieldRules` to `FilteredSections` so DB-driven visibility overrides the hardcoded key lists
- Change `showCuratorContent` to show for Phase 2+ (Creator owns the data, they should see it)

**File 3: `src/components/cogniblend/challenges/ChallengeLegalDocsCard.tsx`**

- When `legalDocs` is empty and `!isQuickMode` and phase < 3, show a "Legal documents will be assembled after curation review" message instead of returning null

### Technical Details

- The `CREATOR_SECTION_KEYS` hardcoded approach conflicts with the DB-driven `md_governance_field_rules`. The correct architecture is: use `md_governance_field_rules` as the authority for which fields to show, and use `CREATOR_SECTION_KEYS` only for the "Your input" badge
- The `buildAllSnapshotSections` and `buildAllCuratorSections` should build ALL possible sections — the filtering is done by `FilteredSections` using `fieldRules`
- No DB migration needed — all fixes are frontend display layer

### Files Changed (3 modified)

1. `src/components/cogniblend/challenges/CreatorSectionBuilders.tsx` — add missing sections, expand key lists
2. `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx` — integrate field rules, fix curator visibility
3. `src/components/cogniblend/challenges/ChallengeLegalDocsCard.tsx` — add pending legal docs message

