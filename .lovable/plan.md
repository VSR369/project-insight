

# Plan: Add "Seed Test Data" Button to Creator Form

## What

Add a dev/test-only button on the Challenge Creator page that pre-fills the form with realistic, curator-quality content — the **original human-authored content** (not AI-modified). This lets testers skip manual data entry and immediately submit a fully-populated challenge.

## Approach

### 1. Create seed content constants file
**New file:** `src/components/cogniblend/creator/creatorSeedContent.ts`

Define two seed data objects (one MP-oriented, one AGG-oriented) containing realistic content for every Creator form field:

- `title`, `problem_statement` (200+ chars), `scope`, `maturity_level`, `domain_tags` (will use first available segment IDs at runtime), `currency`, `budget_min`, `budget_max`, `ip_model`, `expected_outcomes`
- Tab 2 context fields: `context_background`, `preferred_approach`, `approaches_not_of_interest`, `affected_stakeholders`, `current_deficiencies`, `root_causes`, `expected_timeline`

Content will be plain curator-style text — not AI-polished prose. Think business stakeholder language with specifics (dollar amounts, team sizes, system names).

### 2. Add seed button to ChallengeCreatorForm
**Edit:** `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`

- Import seed content
- Add a "🧪 Fill Test Data" button (visible only in dev/demo context — check for `import.meta.env.DEV` or a `testsetup.dev` email domain)
- On click, call `form.reset(seedContent)` where `seedContent` is chosen based on the current `engagementModel` (MP vs AGG)
- For `domain_tags`, query the available industry segments and pick the first 2 matching ones at runtime

### 3. Domain tag resolution
Since `domain_tags` expects actual segment IDs (UUIDs), the seed button handler will:
- Use the already-loaded `industrySegments` array from `useIndustrySegmentOptions()`
- Pick the first 2 segments from the list as defaults
- This avoids hardcoding UUIDs

## Technical Details

- **No database changes** — purely client-side form pre-fill
- **No new dependencies**
- Button placement: in the form footer, left-aligned, before Save Draft / Submit
- Button styling: `variant="ghost"` with a test tube icon, muted color
- The seed content will match what a curator would see as "original creator content" — realistic business language, specific numbers, named stakeholders
- Two content sets: one manufacturing/IoT (MP) and one healthcare/automation (AGG) — matching the existing demo scenario themes

