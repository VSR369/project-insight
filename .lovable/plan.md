

# Fix Seed Data — Realistic Content + Verify Section Display

## Current State

The code (governance resolution, section builders, snapshot key reads) was fixed in the previous iteration. The sections correctly read both old and new key formats. However:

1. **Old seed data still in DB** — User must re-seed to get new snapshots with correct keys
2. **Seed content is superficial** — Short, generic descriptions lacking industry realism
3. **Org is fictional** — "New Horizon Company" should be a recognizable test company like Mahindra

## Changes — 1 file

### `supabase/functions/setup-test-scenario/index.ts`

**Org: Replace "New Horizon Company" with "Mahindra & Mahindra Ltd"** (line 74-88)

Enrich org INSERT (line 203-216) with realistic fields:
- `organization_description`: Real description of Mahindra's automotive/tech business
- `website_url`: `https://www.mahindra.com`
- `trade_brand_name`: "Mahindra"
- `founding_year`: 1945
- `employee_count_range`: "50000+"
- `annual_revenue_range`: "$10B+"
- `hq_city`: "Mumbai"
- `tagline`: "Rise."
- `linkedin_url`: `https://www.linkedin.com/company/mahindra`

**Challenge 1 (CONTROLLED) — "AI-Powered Predictive Maintenance for Mahindra Auto Plants"**

Elaborate all 12 Creator fields with 3-5 sentence realistic content:
- `problem_statement`: Detailed description of unplanned downtime across Nashik, Chakan, Haridwar plants with specific production line counts, cost figures, failure modes (hydraulic presses, robotic welders, CNC machines)
- `scope`: Integration with Siemens SCADA, Allen-Bradley PLCs, 847 sensor nodes, SAP PM module; deployment across 3 plants in phases
- `hook`: Compelling one-liner with specific ROI target
- `context_background`: Mahindra's manufacturing footprint, current maintenance maturity, union considerations, IT/OT convergence status
- `evaluation_criteria`: 5 weighted criteria with realistic manufacturing focus
- `domain_tags`: ["automotive-manufacturing", "predictive-maintenance", "industrial-IoT", "machine-learning"]
- `maturity_level`: "PROTOTYPE"
- `platinum_award`: 75000, `currency_code`: "USD"
- `ip_model`: "IP-EL"
- `expected_timeline`: "6-12 months"
- `extended_brief`: Detailed root causes (5 items), affected stakeholders (6 roles with headcounts), current deficiencies (5 items)

**Challenge 2 (STRUCTURED) — "Intelligent Claims Adjudication for Mahindra Insurance"**

Elaborate all 8 Creator fields:
- `problem_statement`: Mahindra Insurance Brokers processes 12,000+ motor/health claims monthly; manual adjudication takes 8.5 days avg; 18% first-pass rejection rate from coding errors
- `scope`: NLP-based document extraction from scanned claim forms, ICD-10/CPT code validation, integration with TCS BaNCS core platform, fraud pattern detection
- `domain_tags`: ["insurance-claims", "document-AI", "NLP", "fraud-detection"]
- `maturity_level`: "POC"
- `evaluation_criteria`: 4 weighted criteria (Accuracy 35%, Integration 25%, Scalability 20%, Cost 20%)
- `platinum_award`: 40000

**Challenge 3 (QUICK) — "EV Fleet Telematics Dashboard for Last-Mile Delivery"**

Elaborate all 5 Creator fields:
- `problem_statement`: Mahindra Electric's Treo and e-Alfa fleet of 2,400+ last-mile EVs lack unified telematics. Fleet operators manage battery health, route optimization, and charging schedules across 3 disconnected systems. Need a single-pane dashboard prototype.
- `domain_tags`: ["electric-vehicles", "fleet-telematics", "dashboard", "IoT"]
- `platinum_award`: 15000

**Update all `creator_snapshot` objects** to mirror the enriched content exactly (same text in snapshot as in challenge columns).

## Expected Result After Re-Seed

| Mode | Section Cards | Content Quality |
|------|--------------|-----------------|
| QUICK | 3 (Problem, Tags, Prize) | 3-5 sentence problem, 4 domain tags |
| STRUCTURED | 6 (Problem, Scope, Tags, Maturity, Prize, Criteria) | Elaborate per-section content |
| CONTROLLED | 10 (+ Hook, Context, IP, Timeline) | Full enterprise-grade descriptions |

## Verification
1. Click "Seed Demo Scenario" button
2. Login as Chris (nh-cr@testsetup.dev) — see CONTROLLED with 10 cards, STRUCTURED with 6 cards
3. Login as Sam Solo (nh-solo@testsetup.dev) — see QUICK with 3 cards
4. Org badge shows "Mahindra" with realistic context

