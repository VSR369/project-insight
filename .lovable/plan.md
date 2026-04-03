

# Fix: QUICK Mode Submission Blocked by Compliance Gate

## Root Cause

In `complete_phase` RPC (line 164), the compliance flag auto-set logic only triggers when the **next phase** has `phase_type = 'parallel_compliance'`. But QUICK mode's Phase 3 (Compliance) uses `phase_type = 'seeker_auto'` — so the `lc_compliance_complete` and `fc_compliance_complete` flags are **never set**. When the recursive auto-complete then tries to complete Phase 3, the gate check (line 139) finds `lc_compliance_complete = false` and raises an exception.

```text
Phase 1 → complete → advance to Phase 2
  Phase 2 (auto_complete=true) → recurse
    Phase 2 → complete → advance to Phase 3
      Step 8: phase_type='seeker_auto' ≠ 'parallel_compliance' → FLAGS NOT SET
      Phase 3 (auto_complete=true) → recurse  
        Step 4: gate_flags check → lc_compliance_complete = false → EXCEPTION ❌
```

## Fix

**Single migration** — change the condition in `complete_phase` step 8 from checking `phase_type = 'parallel_compliance'` to checking whether the next phase **has compliance gate_flags**. This is more correct semantically: auto-set compliance flags whenever a phase gates on them, regardless of phase_type.

### Migration SQL

Replace line 164's condition:
```sql
-- OLD: IF v_next_config.phase_type = 'parallel_compliance' THEN
-- NEW: check if next phase has compliance gate_flags
IF v_next_config.gate_flags IS NOT NULL AND array_length(v_next_config.gate_flags, 1) > 0 THEN
```

This makes the auto-set logic fire for **any** phase that has compliance gate_flags (both QUICK's `seeker_auto` Phase 3 and STRUCTURED/CONTROLLED's `parallel_compliance` Phase 3).

## Files Changed

| # | File | Change |
|---|------|--------|
| 1 | New migration | `CREATE OR REPLACE FUNCTION complete_phase` — change step 8 condition from `phase_type = 'parallel_compliance'` to `gate_flags IS NOT NULL` |

No frontend changes needed — the RPC fix resolves the submission error for all governance modes.

## Verification

After fix, QUICK mode flow:
```text
Phase 1 → complete → Phase 2 (auto) → Phase 3
  Step 8: gate_flags has compliance flags → read governance config
    QUICK: legal_doc_mode='auto_apply' → lc=TRUE
    QUICK: escrow_mode='not_applicable' → fc=TRUE
  Phase 3 (auto) → Step 4: both flags TRUE → passes gate ✅
  Phase 4 (Publication, auto) → Published ✅
```

