

# Add Configuration Summary Card + QUICK Solver Explanation

## Summary
Add a Configuration Summary card, engagement model badge, and governance-mode-specific explanation banners to the Creator Challenge Detail View. Extract the new card into a separate component to keep files under 250 lines.

---

## Change 1: New Component — `ChallengeConfigSummary.tsx`
**File: `src/components/cogniblend/challenges/ChallengeConfigSummary.tsx`** (new, ~90 lines)

A self-contained component that renders:

1. **Configuration Summary Card** — 4-column grid showing Governance, Engagement Model, Top Prize, and Industry/Domain Tags
2. **QUICK mode banner** — Green "Express Mode — Direct to Solvers" with explanation text (AGG vs MP variant)
3. **STRUCTURED/CONTROLLED banner** — "Professional Review" or "Enterprise Review Pipeline" with pipeline steps

Props:
```typescript
interface ChallengeConfigSummaryProps {
  effectiveGovernance: GovernanceMode;
  operatingModel: string | null;
  rewardStructure: Record<string, unknown> | null;
  currencyCode: string | null;
  industryName: string | null;
  domainTags: unknown[] | null;
}
```

Uses `Zap` icon for QUICK banner, `Info` icon for STRUCTURED/CONTROLLED banner. Prize extracted from `reward_structure.platinum_award ?? reward_structure.budget_max`. Governance label from existing `governanceLabel()` helper.

## Change 2: Update `CreatorChallengeDetailView.tsx`
**File: `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx`**

Two additions:

1. **Import and render `ChallengeConfigSummary`** — placed between the status badges row (line 121) and the status message (line 123). Passes `effectiveGovernance`, `data.operating_model`, `data.reward_structure`, `data.currency_code`, `data.industry_name`, `data.domain_tags`.

2. **Engagement model badge** — add to the existing badge row (after line 119):
```tsx
{data.operating_model && (
  <Badge variant="outline" className="text-xs font-semibold">
    {data.operating_model === 'MP' ? 'Marketplace' : 'Aggregator'}
  </Badge>
)}
```

3. **Remove the generic `statusMessage` info banner** (lines 123-128) since the new config summary banners replace it with richer, governance-specific messaging.

No other files changed. The existing `FilteredSections` "Your input" badges and section builders remain untouched.

---

## Verification
- QUICK detail: Config card (QUICK | Aggregator | USD 10,000 | Technology) + green "Express Mode" banner + 3 section cards
- STRUCTURED detail: Config card (STRUCTURED | Aggregator | USD 120,000 | Manufacturing) + "Professional Review" banner + 6 section cards
- CONTROLLED detail: Config card (CONTROLLED | Aggregator | USD 500,000 | Healthcare) + "Enterprise Review Pipeline" banner + 10 section cards
- Engagement model badge visible in header badge row for all modes

