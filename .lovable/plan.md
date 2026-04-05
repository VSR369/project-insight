
## 3 Changes to Complete Creator Module

### Change 1: Seed Data — Tech Mahindra + Realistic Content
**File: `supabase/functions/setup-test-scenario/index.ts`**

Replace the `new_horizon_demo` scenario org name from "Mahindra & Mahindra Ltd" to "Tech Mahindra Limited". Update org INSERT fields:
- `trade_brand_name`: "Tech Mahindra"
- `legal_entity_name`: "Tech Mahindra Limited"  
- `tagline`: "Connected World. Connected Experiences."
- `organization_description`: Full paragraph about Tech Mahindra's $6.5B business, 150K+ professionals, 90+ countries, Fortune 500 clients, 5G/blockchain/AI/cybersecurity focus
- `website_url`: "https://www.techmahindra.com"
- `linkedin_url`: "https://www.linkedin.com/company/tech-mahindra"

**Challenge 1 (CONTROLLED) — "AI-Driven Clinical Trial Patient Matching & Recruitment Platform"**
Replace entirely with the user's pharma/healthcare challenge content:
- `problem_statement`: $41K per patient, manual chart review, 3-5% screen ratio, 18-24 months enrollment, need AI platform for EHR parsing across Epic/Cerner/Meditech, >85% sensitivity/>90% specificity
- `scope`: HL7 FHIR R4, 47 hospital networks, 12M records, 200+ protocols, HIPAA cloud, 30sec/1000 records
- `hook`: "Reduce clinical trial recruitment time by 60%..."
- `context_background`: Tech Mahindra HLS division, 15 of top 20 pharma, IRB approval at Mount Sinai/Cleveland Clinic/Mayo
- `evaluation_criteria`: 6 weighted criteria (30/20/15/15/10/10)
- `platinum_award`: 500000, `currency_code`: "USD", `ip_model`: "IP-EL"
- `maturity_level`: "SOLUTION_GROWTH", `expected_timeline`: "6-12"
- `extended_brief`: root_causes (5), affected_stakeholders (4 with counts), current_deficiencies (5)
- `creator_snapshot`: mirrors all 12 fields above

**Challenge 2 (STRUCTURED) — "Predictive Quality Analytics for Automotive Component Manufacturing"**
- `problem_statement`: 8 OEM clients, 23 plants, 4.2% defect rate, $18M scrap costs, predictive quality from sensor data
- `scope`: 1200+ machines, 50TB/month, CNC+injection+assembly, Siemens MindSphere + SAP QM, Azure
- `evaluation_criteria`: 5 weighted criteria (30/25/20/15/10)
- `platinum_award`: 120000, `domain_tags`: ["manufacturing", "predictive-analytics", "IoT", "quality-assurance"]
- `maturity_level`: "POC"
- `creator_snapshot`: mirrors all 8 fields

**Challenge 3 (QUICK) — "Internal Carbon Footprint Tracker — Employee Dashboard Prototype"**
- `problem_statement`: Net-zero by 2035, employee dashboard for office energy/travel/data center/commute, SAP SuccessFactors + Concur APIs, GHG Protocol
- `platinum_award`: 10000, `domain_tags`: ["sustainability", "dashboard", "ESG", "carbon-tracking"]
- `creator_snapshot`: mirrors all 5 fields

### Change 2: My Challenges List — Add Prize + Problem + Tags
**File: `src/hooks/cogniblend/useMyChallenges.ts`**

Add to SELECT query: `problem_statement, reward_structure, currency_code, domain_tags`

Add to `MyChallengeItem` interface:
```typescript
problem_statement: string | null;
reward_structure: Record<string, unknown> | null;
currency_code: string | null;
domain_tags: string[] | null;
```

Add to challengeMap builder in the loop:
```typescript
problem_statement: (ch.problem_statement as string) ?? null,
reward_structure: (ch.reward_structure as Record<string, unknown>) ?? null,
currency_code: (ch.currency_code as string) ?? null,
domain_tags: (ch.domain_tags as string[]) ?? null,
```

**File: `src/pages/cogniblend/MyChallengesPage.tsx`**

In `ChallengeCard`, after the title `<h3>` and badges row, add:

1. Problem excerpt (1-line truncated):
```tsx
{ch.problem_statement && (
  <p className="text-xs text-muted-foreground ml-6 line-clamp-1">
    {ch.problem_statement.replace(/<[^>]*>/g, '').substring(0, 140)}…
  </p>
)}
```

2. Prize + domain tags row:
```tsx
<div className="flex flex-wrap items-center gap-2 ml-6 mt-1">
  {(() => {
    const rs = ch.reward_structure as Record<string, unknown> | null;
    const prize = Number(rs?.platinum_award ?? rs?.budget_max ?? 0);
    const curr = ch.currency_code || (rs?.currency as string) || 'USD';
    return prize > 0 ? (
      <Badge variant="secondary" className="text-[10px] font-bold">
        {curr} {prize.toLocaleString()}
      </Badge>
    ) : null;
  })()}
  {ch.domain_tags?.slice(0, 3).map((tag, i) => (
    <Badge key={i} variant="outline" className="text-[10px]">{String(tag)}</Badge>
  ))}
</div>
```

### Change 3: Detail View — "Your input" Badge on Creator Sections
**File: `src/components/cogniblend/challenges/CreatorSectionRenderers.tsx`**

In `FilteredSections`, accept optional `creatorFieldKeys?: string[]` prop. When provided, render a subtle "Your input" badge on each section card whose `fieldKey` is in the list. For the Curator Version tab, show "Will be enriched by Curator" placeholder for empty non-creator sections.

Update the rendering in FilteredSections:
```tsx
{filtered.map((s) => (
  <div key={s.title} className="relative">
    {s.content}
    {creatorFieldKeys?.includes(s.fieldKey ?? '') && (
      <Badge variant="outline" className="text-[9px] text-muted-foreground absolute top-3 right-3">
        Your input
      </Badge>
    )}
  </div>
))}
```

**File: `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx`**

Pass `creatorFieldKeys` from `CREATOR_SECTION_KEYS[effectiveGovernance]` to `FilteredSections` for My Version tab.

### Deploy
Deploy the `setup-test-scenario` edge function after file changes.
