

# Plan: Taxonomy-Based Auto-Assignment + AM Approval Gate in Curation

## Current State

1. **Industry segment is mandatory for AM (MP)** but **missing for RQ (AGG)** — the RQ form has no industry segment selector.
2. **CR/CA assignment** currently uses a manual architect picker in the AM form or direct user_id insertion. No taxonomy-based auto-assignment from the `platform_provider_pool` exists for CR, CU, or ID roles.
3. **CU and ID assignment** — currently done manually or not at all. No auto-assignment logic based on challenge industry/proficiency taxonomy.
4. **Curation flow** goes directly Curator → Innovation Director. There is **no AM approval step** in between for Marketplace challenges. The `CurationActions.tsx` button says "Submit to Innovation Director" unconditionally.

## What Needs to Change

### Taxonomy-Based Assignment Logic

The `platform_provider_pool` table stores each member's `domain_scope` JSONB with `industry_segment_ids`, `proficiency_area_ids`, `sub_domain_ids`, `speciality_ids`. The existing `execute_auto_assignment` RPC handles admin assignment using industry-based scoring. We need a **similar mechanism for challenge role staffing** (CR, CU, ID).

```text
Assignment Tree:
  Industry Segment (MUST match — from AM/RQ input)
  └── Proficiency Area (optional filter — empty = ALL)
      └── Sub Domain (optional filter — empty = ALL)
          └── Speciality (optional filter — empty = ALL)
```

### Marketplace Approval Flow Change

```text
CURRENT:  Curator → Innovation Director
NEW (MP): Curator → Account Manager Approval → Innovation Director
NEW (AGG): Curator → Innovation Director (unchanged)
```

## Changes

### 1. Add Industry Segment to RQ (AGG) Form — Mandatory

**File: `src/components/cogniblend/SimpleIntakeForm.tsx`**

- Add `industry_segment_id: z.string().min(1, 'Please select an industry segment')` to `aggSchema` (currently optional)
- Add an Industry Segment dropdown to the RQ form after the Template Selector, before the Problem editor
- Import and use `useIndustrySegmentOptions` (already imported but only used in MP render)
- Store `industry_segment_id` in the challenge's `eligibility` JSONB on submission

### 2. Create Auto-Assignment Hook for Challenge Roles

**File: `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts`** (New)

A hook/utility that, given a challenge's `industry_segment_id` (and optional proficiency/sub-domain/speciality from the challenge record), queries `platform_provider_pool` to find the best-fit member for a given role code (CR, CU, ID):

- Filter pool members where `role_codes` array contains the target role code
- Filter by `is_active = true` and `availability_status` in ('available', 'partially_available')
- Match `domain_scope.industry_segment_ids` — member must include the challenge's industry segment (empty array = ALL industries = matches everything)
- If proficiency/sub-domain/speciality are provided on the challenge, further filter (empty = ALL = matches)
- Rank by: fewest `current_assignments` (workload balance), then most specific domain match
- Insert into `challenge_role_assignments` table with the winning pool member
- Also insert into `user_challenge_roles` for notification routing

### 3. Wire Auto-Assignment into Submission Flow

**File: `src/hooks/cogniblend/useSubmitSolutionRequest.ts`**

After challenge creation (step 2), instead of manually assigning `architectId`:

- Call the auto-assignment function for role `CR` (Challenge Creator/Architect) based on the challenge's `industry_segment_id`
- For CU and ID: auto-assign at appropriate phase transitions (CU when entering Phase 3/Curation, ID when entering Phase 4/Approval) — these should be triggered in `CurationActions.tsx` and the phase completion hooks

Remove the `architectId` parameter from both `SubmitPayload` and `DraftPayload` since architect is no longer manually selected.

### 4. Auto-Assign CU at Phase 3 Entry, ID at Phase 4 Entry

**File: `src/hooks/cogniblend/useSubmitSolutionRequest.ts`** — After `complete_phase` call (Phase 1→2), also auto-assign CR.

**File: `src/pages/cogniblend/LegalReviewPage.tsx`** or the LC submission hook — When LC advances to Phase 3, auto-assign CU from pool.

**File: `src/components/cogniblend/curation/CurationActions.tsx`** — When Curator submits (Phase 4→5 for MP, Phase 3→4 for AGG):
- **MP model**: Auto-assign ID and route to AM approval first
- **AGG model**: Auto-assign ID and route directly to Innovation Director

### 5. AM Approval Gate for Marketplace Curation

**File: `src/components/cogniblend/curation/CurationActions.tsx`**

- Fetch challenge's `operating_model`
- **If MP**: Change button from "Submit to Innovation Director" to "Send to Account Manager for Approval"
  - On click: update `phase_status` to `'AM_APPROVAL_PENDING'`, notify the AM user
  - The AM sees this in their dashboard and can Approve or Return
- **If AGG**: Keep current "Submit to Innovation Director" flow unchanged

**File: `src/pages/cogniblend/ApprovalReviewPage.tsx`** or new component

- Add AM approval handling: when AM approves, advance to Innovation Director (auto-assign ID from pool)
- When AM returns, send back to Curator with feedback

### 6. Seeding Data Display (AM → ID chain)

**File: `src/pages/cogniblend/AISpecReviewPage.tsx`** — Already has read-only AM brief panel for MP. Ensure this data flows through:
- CA sees AM's original brief (already implemented)
- Curator sees AM's brief in CurationReviewPage (add read-only AM section)
- ID sees AM's brief + Curator's assessment in ApprovalReviewPage

**File: `src/pages/cogniblend/CurationReviewPage.tsx`** — Add a collapsed "Original Brief from AM/RQ" card at the top showing problem_statement, budget, timeline as read-only reference.

**File: `src/pages/cogniblend/ApprovalReviewPage.tsx`** — Add similar seeding data display showing the chain: AM brief → CA spec → Curator assessment.

## Files Modified

| File | Change |
|------|--------|
| `src/components/cogniblend/SimpleIntakeForm.tsx` | Add mandatory industry_segment_id to AGG schema + RQ form |
| `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts` | **New** — taxonomy-based pool matching for CR, CU, ID |
| `src/hooks/cogniblend/useSubmitSolutionRequest.ts` | Remove manual architectId, auto-assign CR from pool |
| `src/components/cogniblend/curation/CurationActions.tsx` | MP: "Send to AM for Approval"; AGG: "Submit to ID" |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Add read-only "Original Brief" seeding panel |
| `src/pages/cogniblend/ApprovalReviewPage.tsx` | Add AM approval handling + seeding data chain display |

