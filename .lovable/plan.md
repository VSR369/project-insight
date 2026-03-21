

## Plan: Remove Maturity Level from GATE-02 and LC Workspace

### Problem
Maturity level is being enforced as mandatory at GATE-02 (LC submission), but:
- LC should not be responsible for setting maturity level
- Missing maturity should not block LC from advancing to curation
- Maturity is set by Creator, optionally modified by Curator — not LC/FC concern

### Changes

**1. Database migration: Remove maturity check from `validate_gate_02`**

Create a new migration that replaces the `validate_gate_02` function, removing lines 42-45 (Check 2: maturity level). The `get_required_legal_docs` call on line 48 already handles `NULL` maturity gracefully with a fallback.

**2. `src/pages/cogniblend/LcLegalWorkspacePage.tsx`: Remove maturity fix UI**

- Remove the `maturityValue` state variable and `handleSetMaturityLevel` callback
- Remove the maturity-specific gate failure banner (the `Select` dropdown + "Fix" button rendered when `isMaturity` is true)
- Keep the maturity badge in the challenge summary section as read-only info (line 780) — LC can see it but not edit it
- Remove `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue` imports if no longer used elsewhere in the file

### What This Fixes
- LC can submit to curation even if Creator left maturity level blank
- Maturity level responsibility stays with Creator (set) and Curator (modify)
- LC workspace is simplified — no field-editing outside their domain

### Files Modified
- New Supabase migration (updated `validate_gate_02` function)
- `src/pages/cogniblend/LcLegalWorkspacePage.tsx`

