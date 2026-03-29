

# Phase 2 — Revised: Rate Card + Prize Tiers + Non-Monetary Incentives

## Key Design Decision: Org Types ARE the Segments

No `segment_category` column needed. The `organization_types` table itself will contain entries that directly map to rate card rows. The `rate_cards` table FKs to `organization_type_id` — one rate card row per org type × maturity level.

---

## Part 1: Update Organization Types Seed Data

Replace MSME with granular enterprise sizes. Keep other types. New set:

| Code | Name | Description | Order |
|------|------|-------------|-------|
| `LARGE_ENTERPRISE` | Large Enterprise | 250+ employees | 1 |
| `MEDIUM_ENTERPRISE` | Medium Enterprise | 50–249 employees | 2 |
| `SMALL_ENTERPRISE` | Small Enterprise | 10–49 employees | 3 |
| `MICRO_ENTERPRISE` | Micro Enterprise | Fewer than 10 employees | 4 |
| `STARTUP` | Start-up | Funded early-stage company | 5 |
| `ACADEMIC` | Academic Institution | Universities, colleges, schools | 6 |
| `NGO` | NGO / Non-Profit | Non-governmental and non-profit organizations | 7 |
| `GOVT` | Government Entity | Government departments and public sector | 8 |
| `INTDEPT` | Internal Department | Internal organizational department | 9 |

**Migration approach:**
- Rename CORPORATE → LARGE_ENTERPRISE (update code, name, description)
- Replace MSME with three new rows: MEDIUM_ENTERPRISE, SMALL_ENTERPRISE, MICRO_ENTERPRISE
- Merge COLLEGE + SCHOOL into existing ACADEMIC (deactivate COLLEGE, SCHOOL, UNI if separate)
- Keep STARTUP, NGO, GOVT, INTDEPT as-is (update descriptions)
- Update `org_type_seeker_rules` for new/changed org type IDs
- Update any `solution_provider_organizations` rows that reference old org_type_ids

**Files modified:**
- New SQL migration (data update via insert tool, not schema migration)
- `src/hooks/queries/useOrganizationTypes.ts` — no changes needed (already dynamic)

---

## Part 2: Rate Cards Table + Admin

### Migration — `rate_cards` table

```text
rate_cards
├── id UUID PK
├── organization_type_id UUID FK → organization_types
├── maturity_level TEXT CHECK ('blueprint','poc','pilot')
├── effort_rate_floor NUMERIC (>0)
├── reward_floor_amount NUMERIC (>0)
├── reward_ceiling NUMERIC (nullable, >floor if set)
├── big4_benchmark_multiplier NUMERIC (0.01–1.0)
├── non_monetary_weight NUMERIC (0.0–1.0)
├── is_active BOOLEAN DEFAULT true
├── tenant_id UUID (nullable = platform default)
├── created_at, updated_at, created_by, updated_by
└── UNIQUE(organization_type_id, maturity_level) WHERE is_active
```

Seed: 9 org types × 3 maturity levels = 27 default rows. Values based on the spec defaults mapped by org type:
- LARGE_ENTERPRISE → large_enterprise rates
- MEDIUM_ENTERPRISE → medium_enterprise rates
- SMALL_ENTERPRISE → small_enterprise rates
- MICRO_ENTERPRISE → micro_enterprise rates
- STARTUP → startup rates
- ACADEMIC, NGO → academic_ngo rates
- GOVT → medium_enterprise rates (reasonable default)
- INTDEPT → large_enterprise rates (internal dept of large org)

### Admin Page — `/admin/seeker-config/rate-cards`

- Matrix table following existing admin patterns (DataTable + MasterDataForm)
- Inline editing, validation, "Reset to Defaults", CSV import/export
- Route in `App.tsx`, sidebar entry in `AdminSidebar.tsx`

### Utility — `lookupRateCard(orgTypeId, maturityLevel)`

### Hook — `useRateCards.ts` (standard CRUD)

---

## Part 3: Flexible Prize Tiers

### Migration — `challenge_prize_tiers` table

Standard schema: `challenge_id`, `tier_name`, `rank`, `percentage_of_pool`, `fixed_amount`, `max_winners`, `description`, `created_by_role`, `is_default`. Auto-seed trigger for 4 defaults (Platinum 55%, Gold 23%, Silver 13%, Honorable Mention 9%).

### Component — `PrizeTierEditor.tsx`

Inline-editable table inside Reward Structure section. Add/delete/reorder. Running total footer. Validation (total ≤ 100%, warning if Platinum < 40%).

---

## Part 4: Non-Monetary Incentive Registry

### Migrations

- `non_monetary_incentives` table + seed 6 defaults
- `challenge_incentive_selections` join table

### Admin — `/admin/seeker-config/incentives`

Standard CRUD page.

### Component — `IncentiveSelector.tsx`

Card selector filtered by maturity + complexity. Seeker commitment input. Effective solver value summary.

---

## Files Created/Modified

### New Files (~12)
| File | Purpose |
|------|---------|
| `src/pages/admin/rate-cards/RateCardsPage.tsx` | Rate card admin |
| `src/pages/admin/incentives/IncentivesPage.tsx` | Incentive admin |
| `src/hooks/queries/useRateCards.ts` | Rate card CRUD |
| `src/hooks/queries/useChallengePrizeTiers.ts` | Prize tier CRUD |
| `src/hooks/queries/useNonMonetaryIncentives.ts` | Incentive hooks |
| `src/hooks/queries/useChallengeIncentiveSelections.ts` | Join table hooks |
| `src/components/cogniblend/curation/rewards/PrizeTierEditor.tsx` | Prize tier editor |
| `src/components/cogniblend/curation/rewards/IncentiveSelector.tsx` | Incentive selector |
| `src/lib/lookupRateCard.ts` | Rate card lookup |

### Modified Files
| File | Change |
|------|--------|
| `src/App.tsx` | Routes for rate-cards, incentives admin |
| `src/components/admin/AdminSidebar.tsx` | Sidebar entries |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Org type badge, PrizeTierEditor + IncentiveSelector in Reward Structure |

### Migrations (4)
1. Update org types seed data (deactivate old, insert new, update rules)
2. Create `rate_cards` table + seed 27 rows
3. Create `challenge_prize_tiers` table + auto-seed trigger
4. Create `non_monetary_incentives` + `challenge_incentive_selections` + seed 6 defaults

### Implementation Order
1. Org types data update
2. Rate cards table + seed + admin page
3. Prize tiers table + editor component
4. Incentive tables + admin + selector component

