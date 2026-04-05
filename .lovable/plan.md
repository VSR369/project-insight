

# Fix Creator Module — Seed Data + List View + Detail Badges

## Summary
Three coordinated changes to make the Creator module work end-to-end with realistic Tech Mahindra seed data, enriched list cards, and governance field badges.

---

## Change 1: Seed Data Rewrite
**File: `supabase/functions/setup-test-scenario/index.ts`**

**Org (lines 73-74, 203-218):** Change `orgName` from `"Mahindra & Mahindra Ltd"` to `"Tech Mahindra Limited"`. Replace org INSERT with enriched profile:
- `trade_brand_name`: "Tech Mahindra"
- `legal_entity_name`: "Tech Mahindra Limited"
- `tagline`: "Connected World. Connected Experiences."
- `organization_description`: "Tech Mahindra is a leading provider of digital transformation, consulting, and business re-engineering services and solutions. Part of the Mahindra Group, the company is a USD 6.5 billion organization with 150,000+ professionals across 90+ countries, helping 1,350+ global customers including Fortune 500 companies..."
- `website_url`: "https://www.techmahindra.com"
- `linkedin_url`: "https://www.linkedin.com/company/tech-mahindra"

**Challenge 1 CONTROLLED (lines 316-394):** Replace entirely with "AI-Driven Clinical Trial Patient Matching & Recruitment Platform":
- `problem_statement`: $41K per patient, manual chart review, 3-5% screen ratio, 18-24 month enrollment, EHR parsing across Epic/Cerner/Meditech, >85% sensitivity/>90% specificity (~250 words)
- `scope`: HL7 FHIR R4, 47 hospital networks, 12M records, 200+ protocols, HIPAA cloud, 30sec/1000 records (~120 words)
- `hook`: "Reduce clinical trial recruitment time by 60% using AI/NLP on 12M+ electronic health records across 47 hospital networks"
- `context_background`: Tech Mahindra HLS division serves 15 of top 20 pharma, IRB approval at Mount Sinai/Cleveland Clinic/Mayo (~100 words)
- `evaluation_criteria`: 6 weighted criteria (30/20/15/15/10/10)
- `platinum_award`: 500000, `currency_code`: "USD", `ip_model`: "IP-EL", `maturity_level`: "SOLUTION_GROWTH", `expected_timeline`: "6-12"
- `extended_brief`: root_causes (5 items), affected_stakeholders (4 roles with counts/impacts), current_deficiencies (5 items)
- `creator_snapshot`: mirrors all 12 fields above exactly

**Challenge 2 STRUCTURED (lines 396-439):** Replace with "Predictive Quality Analytics for Automotive Component Manufacturing":
- `problem_statement`: 8 OEM clients, 23 plants, 4.2% defect rate, $18M scrap costs, Siemens MindSphere + SAP QM integration (~120 words)
- `scope`: 1200+ machines, 50TB/month, CNC+injection+assembly, Azure, pilot 3 plants Pune (~80 words)
- `domain_tags`: ["manufacturing", "predictive-analytics", "IoT", "quality-assurance"]
- `evaluation_criteria`: 5 weighted criteria (30/25/20/15/10)
- `platinum_award`: 120000, `maturity_level`: "POC"
- `creator_snapshot`: mirrors all 8 fields

**Challenge 3 QUICK (lines 441-473):** Replace with "Internal Carbon Footprint Tracker — Employee Dashboard Prototype":
- `problem_statement`: Net-zero by 2035, employee dashboard for office energy/travel/data center/commute, SAP SuccessFactors + Concur APIs, GHG Protocol (~100 words)
- `domain_tags`: ["sustainability", "dashboard", "ESG", "carbon-tracking"]
- `platinum_award`: 10000
- `creator_snapshot`: mirrors all 5 fields

All exact content provided in user's prompt above — use verbatim.

---

## Change 2: My Challenges List View Enhancements
**File: `src/hooks/cogniblend/useMyChallenges.ts`**

**Interface (line 10-21):** Add 4 new fields to `MyChallengeItem`:
```typescript
problem_statement: string | null;
reward_structure: Record<string, unknown> | null;
currency_code: string | null;
domain_tags: string[] | null;
```

**Query (line 36-42):** Add to SELECT: `problem_statement, reward_structure, currency_code, domain_tags`

**Map builder (line 68-79):** Add to challengeMap.set:
```typescript
problem_statement: (ch.problem_statement as string) ?? null,
reward_structure: (ch.reward_structure as Record<string, unknown>) ?? null,
currency_code: (ch.currency_code as string) ?? null,
domain_tags: (ch.domain_tags as string[]) ?? null,
```

**File: `src/pages/cogniblend/MyChallengesPage.tsx`**

In `ChallengeCard` (after line 268, before the `formattedDate` block), add problem excerpt + prize/tags row:

```tsx
{/* Problem excerpt */}
{ch.problem_statement && (
  <p className="text-xs text-muted-foreground ml-6 line-clamp-1">
    {ch.problem_statement.replace(/<[^>]*>/g, '').substring(0, 140)}
  </p>
)}
{/* Prize + domain tags */}
<div className="flex flex-wrap items-center gap-2 ml-6 mt-1">
  {(() => {
    const rs = ch.reward_structure;
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

---

## Change 3: Detail View — "Your input" Badge
**File: `src/components/cogniblend/challenges/CreatorSectionRenderers.tsx`**

Update `FilteredSections` (line 185) to accept optional `creatorFieldKeys?: string[]` prop. Change the render at line 201 to wrap each section in a relative container and show a "Your input" badge when the section's fieldKey is in creatorFieldKeys:

```tsx
return <>{filtered.map((s) => (
  <div key={s.title} className="relative">
    {s.content}
    {creatorFieldKeys?.includes(s.fieldKey ?? '') && (
      <Badge variant="outline" className="text-[9px] text-muted-foreground absolute top-3 right-3 z-10">
        Your input
      </Badge>
    )}
  </div>
))}</>;
```

**File: `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx`**

Import `CREATOR_SECTION_KEYS` is not directly exported. Instead, derive from effectiveGovernance in the component:

```typescript
const creatorKeys = useMemo(() => {
  const keys: Record<string, string[]> = {
    QUICK: ['problem_statement', 'domain_tags', 'platinum_award'],
    STRUCTURED: ['problem_statement', 'scope', 'domain_tags', 'maturity_level', 'platinum_award', 'weighted_criteria'],
    CONTROLLED: ['problem_statement', 'scope', 'domain_tags', 'maturity_level', 'platinum_award', 'weighted_criteria', 'hook', 'context_background', 'ip_model', 'expected_timeline'],
  };
  return keys[effectiveGovernance] ?? keys.STRUCTURED;
}, [effectiveGovernance]);
```

Pass `creatorFieldKeys={creatorKeys}` to all `FilteredSections` calls (lines 138, 140, 163, 177).

---

## Deploy
Deploy `setup-test-scenario` edge function after code changes.

## Verification
1. Click "Seed Demo Scenario" to re-seed
2. Chris (CONTROLLED): 10 section cards with "Your input" badges, $500K prize
3. Chris (STRUCTURED): 6 section cards, $120K prize
4. Sam Solo (QUICK): 3 section cards, $10K prize
5. List view shows problem excerpts, prize badges, domain tags on each card

