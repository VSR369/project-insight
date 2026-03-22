

# Plan: Redesign RQ (Challenge Requestor) Intake Form

## What the User Wants

- **RQ (Aggregator)**: Replace the current 3-field form with a simpler design — "What kind of challenge?" template cards + a rich problem/idea description editor. No budget, timeline, or solution expectations needed.
- **AM (Marketplace)**: Keep as-is (6 mandatory fields). No changes.
- **CR/CA**: No changes.

## Changes

### 1. Split SimpleIntakeForm into role-specific rendering

**File: `src/components/cogniblend/SimpleIntakeForm.tsx`**

When `isMP` is false (RQ/Aggregator), render a completely different layout:

**RQ Layout:**
1. **Header**: "Share Your Idea" with subtitle "Pick a challenge type and describe your problem or opportunity — a Challenge Architect will build the full specification."
2. **Template Selector cards** (reuse existing `TemplateSelector` component) — the 8 challenge type cards (Product Innovation, Process Improvement, etc.) so the RQ can indicate "what kind of challenge is required"
3. **Problem / Possibility Idea** — a single large textarea (or rich text area), max 1000 chars, with prompt: "Describe the problem or opportunity you've identified. Even a rough idea is fine."
4. **Submit Idea / Save Draft** buttons

**Remove from RQ path:** Title field, Sector dropdown (template selection replaces sector categorization), Solution Expectations, Budget, Timeline, Architect picker.

**Schema for RQ:** Only `selected_template` (string, required) + `problem_summary` (string, min 10 chars, max 1000 chars).

**AM path stays exactly as-is** — all 6 fields, same layout, same schema.

### 2. Update payload builder for RQ

Derive `title` automatically from the selected template name (e.g., "Product Innovation Idea") so downstream systems still have a title. Pass `problem_summary` as the business problem. Store selected template ID in the payload.

## Files Modified

| File | Changes |
|------|---------|
| `src/components/cogniblend/SimpleIntakeForm.tsx` | Add TemplateSelector import, new RQ-specific schema (template + problem), split render into RQ vs AM paths, auto-derive title from template |

## What is NOT Changed

- AM (Marketplace) form — stays as-is with 6 fields
- CR/CA ConversationalIntakePage — no changes
- ChallengeCreatePage routing — no changes
- TemplateSelector component — reused as-is

