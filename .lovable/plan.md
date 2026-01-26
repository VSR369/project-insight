

# Fix: Expertise Tab Data Model Alignment

## Problem Understanding (Corrected)

### What Provider Selects
| Step | Selection | Storage |
|------|-----------|---------|
| 1 | Industry Segment | `provider_industry_enrollments.industry_segment_id` |
| 2 | Expertise Level | `provider_industry_enrollments.expertise_level_id` |
| 3 | Proficiency Areas | `provider_proficiency_areas` table |

### What Is NOT Selected (Fixed/Derived)
| Data | Source | Logic |
|------|--------|-------|
| Sub-domains | `sub_domains` table | All sub-domains under selected proficiency areas |
| Specialities | `specialities` table | Filtered by `level_speciality_map` to only show specialities mapped to the expertise level |

The `provider_specialities` table is NOT used for displaying expertise - it may be used elsewhere (like proof point tagging) but is NOT part of the expertise selection flow.

---

## Root Cause

The `useCandidateExpertise` hook incorrectly tries to build sub-domains and specialities from `provider_specialities` table:

```typescript
// WRONG - This table is empty!
const { data: providerSpecialities } = await supabase
  .from("provider_specialities")
  .select(`speciality_id, specialities (...)`)
  .eq("enrollment_id", enrollmentId);
```

Result: Empty tree because `provider_specialities` has 0 rows.

---

## Solution: Align with useProviderSelectedTaxonomy Pattern

Rewrite `useCandidateExpertise` to use the same data fetching logic as `useProviderSelectedTaxonomy`:

### Updated Data Flow

```text
1. Fetch enrollment → get industry_segment_id + expertise_level_id
2. Fetch industry_segments → get industry name
3. Fetch expertise_levels → get level details
4. Fetch provider_proficiency_areas → get selected area IDs
5. Fetch proficiency_areas → get area names for selected IDs
6. Fetch sub_domains → ALL under selected proficiency areas
7. Fetch level_speciality_map → get speciality IDs for this expertise level
8. Fetch specialities → filter by sub_domain_id AND level_speciality_map
9. Build tree structure
```

### Key Changes

**1. Add Industry Segment to Interface**
```typescript
export interface CandidateExpertise {
  // NEW: Industry segment info
  industrySegmentId: string | null;
  industrySegmentName: string | null;
  industrySegmentCode: string | null;
  
  // Existing fields...
}
```

**2. Fetch Industry Segment in Query**
```typescript
const { data: enrollment } = await supabase
  .from("provider_industry_enrollments")
  .select(`
    expertise_level_id,
    industry_segment_id,
    industry_segments (id, name, code),
    expertise_levels (id, name, description, level_number, min_years, max_years)
  `)
  .eq("id", enrollmentId)
  .single();
```

**3. Fix Tree Building Logic**
```typescript
// Fetch selected proficiency areas
const { data: providerAreas } = await supabase
  .from("provider_proficiency_areas")
  .select("proficiency_area_id")
  .eq("enrollment_id", enrollmentId);

const selectedAreaIds = providerAreas?.map(pa => pa.proficiency_area_id) || [];

// Fetch area details
const { data: areas } = await supabase
  .from("proficiency_areas")
  .select("id, name, description")
  .in("id", selectedAreaIds)
  .eq("is_active", true)
  .order("display_order");

// Fetch ALL sub-domains under selected areas
const { data: subDomains } = await supabase
  .from("sub_domains")
  .select("id, name, description, proficiency_area_id")
  .in("proficiency_area_id", selectedAreaIds)
  .eq("is_active", true)
  .order("display_order");

// Fetch level_speciality_map for filtering
const { data: levelMappings } = await supabase
  .from("level_speciality_map")
  .select("speciality_id")
  .eq("expertise_level_id", enrollment.expertise_level_id);

const mappedSpecialityIds = new Set(levelMappings?.map(m => m.speciality_id) || []);

// Fetch specialities, filtered by level mapping
const subDomainIds = subDomains?.map(sd => sd.id) || [];
const { data: allSpecialities } = await supabase
  .from("specialities")
  .select("id, name, description, sub_domain_id")
  .in("sub_domain_id", subDomainIds)
  .eq("is_active", true)
  .order("display_order");

// Filter specialities by level mapping (or show all if no mappings)
const specialities = mappedSpecialityIds.size > 0
  ? (allSpecialities || []).filter(sp => mappedSpecialityIds.has(sp.id))
  : allSpecialities || [];

// Build tree
const proficiencyTree = (areas || []).map(area => ({
  id: area.id,
  name: area.name,
  subDomains: (subDomains || [])
    .filter(sd => sd.proficiency_area_id === area.id)
    .map(sd => ({
      id: sd.id,
      name: sd.name,
      specialities: specialities.filter(sp => sp.sub_domain_id === sd.id),
    })),
}));
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/queries/useCandidateExpertise.ts` | Complete rewrite of data fetching logic to match correct data model |
| `src/components/reviewer/candidates/ExpertiseLevelHeader.tsx` | Add industry segment display above expertise level |

---

## Expected Result

### Before (Broken)
```
Expertise Level: Associate Consultant - Level 1
Experience: 0-2 years
0 Proficiency Areas | 0 Sub-domains | 0 Specialities
```

### After (Fixed)
```
Industry: Manufacturing (Auto Components)
Expertise Level: Associate Consultant - Level 1
Experience: 0-2 years

2 Proficiency Areas | 6 Sub-domains | 18 Specialities

Proficiency Areas tree with:
- Future & Business Blueprint
  - Strategic Basics (3 specialities)
  - Business Understanding (3 specialities)
  - Outcome Framing (3 specialities)
- Product & Service Innovation
  - Product Understanding (3 specialities)
  - Customer Touchpoints (3 specialities)
  - Value Basics (3 specialities)
```

---

## Technical Notes

### Why `provider_specialities` is Empty

The `provider_specialities` table appears to be for a different purpose - likely allowing providers to tag their proof points with specific specialities. It is NOT used for declaring expertise coverage.

When a provider selects a Proficiency Area, they claim coverage of:
- ALL sub-domains under that area
- ALL specialities under those sub-domains (filtered by level_speciality_map)

### Consistency with Provider View

This fix ensures the reviewer sees exactly what the provider claimed during Expertise Selection - using the same data sources and logic as `useProviderSelectedTaxonomy`.

