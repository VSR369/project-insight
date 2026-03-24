

# Audit: Current System vs Claude Input Requirements

## Architecture Alignment Summary

The user's Claude input describes requirements that are **already largely implemented** in our architecture. Below is a point-by-point confirmation with gaps identified.

---

## What Is Already Implemented (Confirmed)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| ~20 sections across 5 menu groups | ✅ Done | `SECTIONS` array has 20 entries; `GROUPS` has Content (7), Evaluation (4), Legal & Finance (4), Publication (7), Extended Brief (7 subsections) |
| Supervisor AI prompt configuration per section | ✅ Done | `ai_review_section_config` table with `(role_context, section_key)` composite key; Admin page at `/admin/seeker-config/ai-review-config` |
| DB-driven prompt loading at review time | ✅ Done | Edge function fetches from `ai_review_section_config` with `is_active` filter |
| Fallback to hardcoded defaults when no DB config | ✅ Done | `getFallbackSections()` returns `CURATION_SECTIONS` when `dbConfigs.length === 0` |
| Batch-split AI review (max 12 per LLM call) | ✅ Done | `MAX_BATCH_SIZE = 12` with loop in edge function |
| Master data injection into prompts | ✅ Done | `fetchMasterDataOptions()` injects allowed codes for eligibility, complexity, IP, maturity, visibility |
| Accept/Edit/Reject per section | ✅ Done | `AIReviewInline` with accept/dismiss per comment |
| All sections reviewed in one click | ✅ Done | "Review Sections by AI" button sends all section keys |
| Sections collapsed by default | ✅ Done | `CuratorSectionPanel` defaults `isExpanded` to `false` unless `defaultExpanded` is set |
| Role separation (Supervisor configures, User triggers, Admin manages master data) | ✅ Done | Tier-based permissions via `useAdminTier` |

---

## Gaps / Deviations Found

### 1. `payment_schedule` key referenced but never defined
The Evaluation group includes `"payment_schedule"` in its `sectionKeys` but there is **no matching entry** in the `SECTIONS` array. This causes that key to silently not render.

**Fix**: Either add a `payment_schedule` section definition to `SECTIONS` (if it should exist), or remove it from the Evaluation group's `sectionKeys`. Given the existing `reward_structure` section, this is likely a stale reference — remove it.

### 2. No "Supervisor prompt configured" / "No supervisor prompt" indicator on sections
The Claude input asks for a visible indicator per section showing whether a supervisor prompt exists. Currently, the frontend does not fetch or display this information.

**Fix**: After AI review runs, the edge function already knows which sections had DB config vs fallback. Add a `prompt_source` field (`"supervisor"` or `"default"`) to each review result. Display a small badge/indicator on each section panel:
- ✅ "Supervisor prompt" (green) — when DB config was used
- ⚠️ "Default AI reasoning" (amber) — when fallback was used

### 3. Sections without supervisor config get generic fallback, not "best-effort contextual"
The Claude input says: "For each section that does NOT have a supervisor prompt, AI must still attempt a best-effort review using contextual intelligence — and clearly flag it."

Currently, the fallback uses `buildFallbackSystemPrompt()` which produces a reasonable but generic prompt. This already works as "best-effort" — the only gap is the **flagging** (covered in gap #2).

---

## Implementation Plan

### File: `src/pages/cogniblend/CurationReviewPage.tsx`
1. Remove `"payment_schedule"` from Evaluation group's `sectionKeys`
2. After AI review results load, check each section's `prompt_source` and display indicator badge in `CuratorSectionPanel` header

### File: `supabase/functions/review-challenge-sections/index.ts`
1. Add `prompt_source: "supervisor" | "default"` to each section result object
2. When using DB config: set `prompt_source: "supervisor"`
3. When using fallback: set `prompt_source: "default"`

### File: `src/components/cogniblend/curation/CuratorSectionPanel.tsx`
1. Accept optional `promptSource` prop
2. Render small badge next to section label: green checkmark for supervisor, amber warning for default

---

## No Changes Needed (Confirmed Aligned)

- Fixed-format form layouts per section — already enforced by format-native renderers
- Master data awareness — already implemented with code/label injection
- Batch splitting — already at max 12 per call
- Default collapsed state — already the default behavior
- Dynamic prompt retrieval — already fetches from `ai_review_section_config` at review time

