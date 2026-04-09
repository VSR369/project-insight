

## Plan: Restore Domain Tags as Free-Form Editable Field on Creator Form

The `domain_tags` field was previously removed from the Creator form in favor of `industry_segment_id`. The user wants it back as a free-form, editable tag input — not a fixed dropdown — where tags are contextual to the challenge description. Both fields can coexist: `industry_segment_id` for broad classification, `domain_tags` for specific challenge-relevant tagging.

---

### What Changes

**1. Creator Form Schema (`src/components/cogniblend/creator/creatorFormSchema.ts`)**
- Add `domain_tags: z.array(z.string()).default([])` to the schema (required for all modes — min 1 tag)
- Add `domain_tags: string[]` to the `CreatorFormValues` type
- Remove the comment "domain_tags removed"

**2. Essential Details Tab — Add Domain Tags Input (`src/components/cogniblend/creator/EssentialDetailsTab.tsx`)**
- Import and render a `DomainTagsInput` component (new, see below) between the problem statement and maturity fields
- Wire it via `Controller` to `domain_tags`

**3. New Component: `DomainTagsInput` (`src/components/cogniblend/creator/DomainTagsInput.tsx`)**
- Free-form tag input: user types a tag and presses Enter or comma to add it
- Shows tags as removable badges (colored chips)
- No fixed list — any text is accepted
- Provides a few contextual suggestions based on common innovation domains (shown as subtle chips the user can click to add, similar to the wizard's `DomainTagSelect` but with emphasis on custom entry)
- Placeholder: "Type a domain tag and press Enter (e.g., AI/ML, Supply Chain, IoT)"
- Required label with asterisk for all governance modes

**4. Creator Form Wiring (`src/components/cogniblend/creator/ChallengeCreatorForm.tsx`)**
- Pass `domain_tags` from form values into the submit/draft payloads (`domainTags: data.domain_tags`)
- Remove the current fallback that derives `domainTags` from `industrySegmentId`
- Add `domain_tags: []` to default values

**5. Seed Content (`src/components/cogniblend/creator/creatorSeedContent.ts`)**
- Add relevant `domain_tags` to both `MP_SEED` and `AGG_SEED` (e.g., `['AI/ML', 'SAP Integration', 'Supply Chain Optimization']`)

**6. AI Review Fields (`src/constants/creatorReviewFields.ts`)**
- Keep `domain_tags` as-is (it's already there and correct)

**7. AI Review Mapper (`src/lib/creatorReviewMapper.ts`)**
- Keep `domain_tags` / `tags` aliases as-is (already correct)

**8. Edge Function Prompt (`supabase/functions/check-challenge-quality/promptBuilder.ts`)**
- Keep `domain_tags` in `CREATOR_FIELD_LISTS` (already correct)
- No changes needed

**9. Fill Test Data Guard (`src/components/cogniblend/creator/ChallengeCreatorForm.tsx`)**
- Add confirmation dialog when `form.formState.isDirty` before `form.reset(seed)` to prevent accidental overwrite of user edits

---

### Summary of Files Changed

| File | Change |
|------|--------|
| `creatorFormSchema.ts` | Add `domain_tags` field to schema + type |
| `EssentialDetailsTab.tsx` | Render `DomainTagsInput` |
| `DomainTagsInput.tsx` (new) | Free-form tag input component |
| `ChallengeCreatorForm.tsx` | Wire domain_tags to payloads, add fill-test-data guard |
| `creatorSeedContent.ts` | Add domain_tags to seed data |

No changes to `creatorReviewFields.ts`, `creatorReviewMapper.ts`, or `promptBuilder.ts` — they already reference `domain_tags` correctly.

