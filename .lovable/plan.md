

# Fix: Update Seed Org from "Tech Mahindra" to "Mahindra & Mahindra"

## What's Already Done (No Action Needed)
- **Governance Mode Config**: All 3 modes (QUICK, STRUCTURED, CONTROLLED) exist and active
- **Tier Governance Access**: basic=QUICK, standard=QUICK+STRUCTURED, premium=all 3, enterprise=all 3 -- correctly configured
- **Legal Document Templates**: All 5 docs (PMA, CA, PSA, IPAA, EPIA) active with content and version_status=ACTIVE
- **Legal Doc Trigger Config**: 15 triggers properly mapped (PMA->USER_REGISTRATION, CA->CHALLENGE_SUBMIT, PSA->CHALLENGE_JOIN, IPAA->WINNER_SELECTED, EPIA->ESCROW_DEPOSIT, etc.)

## What Needs Fixing

### Single file change: `supabase/functions/setup-test-scenario/index.ts`

**1. Update scenario config (line 20):**
```
orgName: "Mahindra & Mahindra Limited"
```

**2. Update org insert block (lines 118-124):**
```
trade_brand_name: "Mahindra"
legal_entity_name: "Mahindra & Mahindra Limited"
tagline: "Rise."
organization_description: "Mahindra & Mahindra Limited is a USD 21 billion multinational conglomerate headquartered in Mumbai, India. The Group operates across 20+ key industries including automotive, farm equipment, information technology, financial services, and real estate. With over 260,000 employees across 100+ countries, Mahindra is one of the largest vehicle manufacturers by production in India and the world's largest tractor company by volume."
website_url: "https://www.mahindra.com"
founding_year: 1945
employee_count_range: "250000+"
annual_revenue_range: "$15B-$25B"
hq_city: "Mumbai"
```

**3. Update C5 problem statement (line 287):** Replace "Tech Mahindra" reference with "Mahindra Group" in the carbon footprint challenge text.

**4. Deploy edge function** after changes.

### Files Changed
- `supabase/functions/setup-test-scenario/index.ts` -- org data update only

### Post-Fix
User re-runs "Seed Demo Scenario" from `/cogni/demo-login` to get clean M&M-branded data across all 6 challenges.

