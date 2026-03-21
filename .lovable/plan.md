## Plan: Remove Maturity Level from GATE-02 and LC Workspace

**Status: ✅ IMPLEMENTED**

### Changes Applied

1. **Database migration** — Updated `validate_gate_02` function to remove the maturity level check (Check 2). LC can now submit to curation even if Creator left maturity level blank.
2. **UI cleanup** — Removed `maturityValue` state, `handleSetMaturityLevel` callback, and the maturity-fix dropdown/banner from the GATE-02 failure alerts. Maturity badge remains read-only in challenge summary.

### Files Modified
- Supabase migration (updated `validate_gate_02` function)
- `src/pages/cogniblend/LcLegalWorkspacePage.tsx`
