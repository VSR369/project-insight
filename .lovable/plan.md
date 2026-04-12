

## Plan: Creator Challenge Preferences — 3 New Toggles

### Summary
Add three new creator-set preference toggles that persist in `extended_brief` JSONB, flow from Creator wizard to Curator's Organization tab, and are available for downstream use (publishing, solver visibility).

### New Fields

| Field | Key in `extended_brief` | Default | Visibility |
|---|---|---|---|
| Creator Approval Required | `creator_approval_required` | `true` (STRUCTURED/CONTROLLED), forced `true` (MP), hidden (QUICK) | AGG only toggle; MP always mandatory |
| Community Creation | `community_creation_allowed` | `false` | All models, all governance modes |
| Anonymous Challenge | `is_anonymous` | `false` | All models, all governance modes |

### Pre-existing Bug Fix
`creator_approval_required` exists in the wizard form schema but is **never persisted to the DB** — neither `buildFieldsFromForm` (wizard) nor `useCreatorDraftSave` (simple form) writes it to `extended_brief`. This plan fixes that.

---

### Changes by File

#### 1. Creator Wizard Form Schema
**File:** `src/components/cogniblend/challenge-wizard/challengeFormSchema.ts`
- Add `community_creation_allowed: z.boolean().default(false)` and `is_anonymous: z.boolean().default(false)` to the schema
- Add defaults to `DEFAULT_FORM_VALUES`

#### 2. Creator Simple Form Schema
**File:** `src/components/cogniblend/creator/creatorFormSchema.ts`
- Add `community_creation_allowed` and `is_anonymous` boolean fields to schema and `CreatorFormValues` type

#### 3. StepModeSelection — UI Toggles
**File:** `src/components/cogniblend/challenge-wizard/StepModeSelection.tsx`
- Refactor Creator Approval section: hide entirely when `selectedMode === 'QUICK'`; show "Mandatory" badge (non-toggleable) for MP; show toggle for AGG only
- Add "Community Creation" toggle: Allowed / Not Allowed, all modes
- Add "Anonymous Challenge" toggle: YES / NO (default NO), all modes
- Extract toggles into a new sub-component to keep file under 200 lines

#### 4. New: `ChallengePreferenceToggles.tsx`
**File:** `src/components/cogniblend/challenge-wizard/ChallengePreferenceToggles.tsx` (NEW, ~120 lines)
- Extracted component rendering the 3 toggle cards
- Props: `form`, `selectedMode`, `selectedModel`
- Creator Approval: hidden in QUICK, forced ON for MP (disabled switch), toggleable for AGG
- Community Creation: toggle for all modes
- Anonymous: toggle for all modes

#### 5. Wizard — Persist to DB
**File:** `src/pages/cogniblend/ChallengeWizardPage.tsx`
- In `buildFieldsFromForm`: add the 3 fields into the `deliverables` JSONB (which maps to `extended_brief`):
  ```
  creator_approval_required: values.creator_approval_required,
  community_creation_allowed: values.community_creation_allowed,
  is_anonymous: values.is_anonymous,
  ```

#### 6. Simple Form — Persist to DB
**File:** `src/hooks/cogniblend/useCreatorDraftSave.ts`
- In the draft payload's extended_brief-bound fields, add the 3 new fields from `data`

#### 7. Submit Mutation — Persist to extended_brief
**File:** `src/hooks/cogniblend/useChallengeSubmit.ts`
- In `useChallengeSubmit` (line 74-86): add the 3 fields to `rawExtendedBrief`
- In snapshot brief (line 136-147): include the 3 fields

#### 8. Payload Types
**File:** `src/lib/cogniblend/challengePayloads.ts`
- Add `creatorApprovalRequired?: boolean`, `communityCreationAllowed?: boolean`, `isAnonymous?: boolean` to both `SubmitPayload` and `DraftPayload`
- In `buildChallengeUpdatePayload`: merge these into `rawExtBrief`

#### 9. Curator Organization Tab — Read-Only Info Cards
**File:** `src/components/cogniblend/curation/OrgContextPanel.tsx`
- Add `challengeExtendedBrief` prop
- Below org info, render a "Challenge Preferences" card showing the 3 fields as read-only badges/labels
- Extract into a new sub-component for cleanliness

#### 10. New: `ChallengePreferencesInfo.tsx`
**File:** `src/components/cogniblend/curation/ChallengePreferencesInfo.tsx` (NEW, ~80 lines)
- Read-only display of the 3 creator preferences
- Props: `operatingModel`, `creatorApprovalRequired`, `communityCreationAllowed`, `isAnonymous`
- Uses Badge/info styling consistent with existing curation cards

#### 11. Wire to CurationSectionList
**File:** `src/components/cogniblend/curation/CurationSectionList.tsx`
- When rendering Organization tab (line 126-133): pass `challengeExtendedBrief` to `OrgContextPanel`

#### 12. Update CreatorApprovalStatusBanner
**File:** `src/components/cogniblend/curation/CreatorApprovalStatusBanner.tsx`
- Add `communityCreationAllowed` and `isAnonymous` props
- Show additional info lines for community creation and anonymity status

#### 13. CurationRightRail — Pass new props
**File:** `src/components/cogniblend/curation/CurationRightRail.tsx`
- Parse `community_creation_allowed` and `is_anonymous` from extended_brief
- Pass to `CreatorApprovalStatusBanner`

#### 14. CurationReviewPage — Parse and pass
**File:** `src/pages/cogniblend/CurationReviewPage.tsx`
- Extract `community_creation_allowed` and `is_anonymous` from `extended_brief` alongside existing `creator_approval_required`
- Pass down through right rail props

### No DB Migration Needed
All 3 fields are stored in the existing `extended_brief` JSONB column — no schema change required.

### Files Summary

| # | File | Change |
|---|------|--------|
| 1 | `challengeFormSchema.ts` (wizard) | Add 2 new boolean fields + defaults |
| 2 | `creatorFormSchema.ts` (simple) | Add 2 new boolean fields + type |
| 3 | `StepModeSelection.tsx` | Slim down, delegate to new component |
| 4 | `ChallengePreferenceToggles.tsx` | NEW — 3 toggle cards |
| 5 | `ChallengeWizardPage.tsx` | Persist 3 fields in buildFieldsFromForm |
| 6 | `useCreatorDraftSave.ts` | Add 3 fields to draft payload |
| 7 | `useChallengeSubmit.ts` | Add 3 fields to extended_brief + snapshot |
| 8 | `challengePayloads.ts` | Add 3 fields to interfaces + builder |
| 9 | `OrgContextPanel.tsx` | Accept + render challenge preferences |
| 10 | `ChallengePreferencesInfo.tsx` | NEW — read-only info display |
| 11 | `CurationSectionList.tsx` | Pass extended_brief to OrgContextPanel |
| 12 | `CreatorApprovalStatusBanner.tsx` | Add community + anonymous info |
| 13 | `CurationRightRail.tsx` | Parse + pass new fields |
| 14 | `CurationReviewPage.tsx` | Extract + pass new fields |

