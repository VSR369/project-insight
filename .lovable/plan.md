

# Fix: Fill Test Data — Solution Maturity & 5IR Business Challenge Content

## Problems Identified

### Bug: Solution maturity not selected
The `handleFillTestData` function sets `maturity_level: 'PILOT'` (from seed), but the radio group uses `option.code` from `md_solution_maturity` (e.g., `SOLUTION_PILOT`). These don't match → radio stays unselected. Additionally, `solution_maturity_id` is hardcoded to `''`.

**Fix**: In `handleFillTestData`, look up the matching `md_solution_maturity` record by matching the seed's maturity code to the DB code (e.g., `PILOT` → find record where `code` contains `PILOT`), then set both `maturity_level = record.code` and `solution_maturity_id = record.id`.

### Content: Upgrade seed data to 5IR business transformation challenges

Replace the current app/ERP-level scenarios with high-end strategic business transformation challenges involving Digital Workers (AI Agents), ecosystem redesign, policy transformation, and cultural change.

**MP Seed → Supply Chain Digital Workforce Transformation**
A manufacturing conglomerate wants to redesign its supply chain by deploying autonomous AI agents that replace manual workflows, redefine roles and responsibilities, restructure policies, and transform the organizational ecosystem. This is a systemic business transformation, not a software project.

**AGG Seed → Autonomous Enterprise Operations Platform**
A financial services group wants to deploy AI-powered digital workers across compliance, risk assessment, and client advisory — fundamentally changing how the organization operates, governs, and delivers value.

## Changes

| File | Change |
|---|---|
| `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` | Update `handleFillTestData` to look up maturity record from `maturityOptions` and set both `maturity_level` (code) and `solution_maturity_id` (uuid) |
| `src/components/cogniblend/creator/creatorSeedContent.ts` | Replace both MP and AGG seed content with 5IR business transformation challenges; add `solution_maturity_id` field (empty string default, populated at runtime) |

## Technical Detail

```typescript
// ChallengeCreatorForm.tsx — handleFillTestData fix
const handleFillTestData = useCallback(() => {
  const seed = engagementModel === 'AGG' ? AGG_SEED : MP_SEED;
  const domainIds = industrySegments.slice(0, 2).map((s) => s.id);
  
  // Match seed maturity code to actual md_solution_maturity record
  const maturityMatch = maturityOptions?.find((m) => 
    m.code.replace('SOLUTION_', '') === seed.maturity_level
  );
  
  form.reset({
    ...seed,
    maturity_level: maturityMatch?.code ?? seed.maturity_level,
    solution_maturity_id: maturityMatch?.id ?? '',
    industry_segment_id: industrySegments[0]?.id ?? '',
    domain_tags: domainIds,
  } as CreatorFormValues);
}, [engagementModel, industrySegments, maturityOptions, form]);
```

This requires passing `maturityOptions` (from `useSolutionMaturityList`) into the `handleFillTestData` scope — it's already fetched in the component via `useSolutionMaturityList`.

