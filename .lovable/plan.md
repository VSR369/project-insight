

# Fix Plan: Legal Document System Remaining Defects

## Critical Bug (Newly Found)

**Property name mismatch between RPC and frontend — CU auto-assignment broken**

The `complete_legal_review` RPC returns `{ "phase_advanced": true, ... }` but both `LcLegalWorkspacePage.tsx` and `LegalDocumentAttachmentPage.tsx` read `result.advanced`. This means CU auto-assignment after legal review **never fires** — the condition is always falsy.

---

## Defects to Fix (Scoped to actionable items)

| # | Defect | Severity | Effort |
|---|--------|----------|--------|
| NEW | `phase_advanced` vs `advanced` mismatch | Showstopper | 2 files |
| D5 | CHALLENGE_JOIN gate not wired to solver join flow | Medium | 1 file |
| D10 | Archive old NULL document_code templates | Info | 1 migration |

D6 (WINNER_SELECTED) already has a placeholder page with the gate wired. D7 (as any casts) requires Supabase type regeneration which is outside scope. D8 (IP capture) and D9 (PDF upload) are future enhancements.

---

## Step 1: Fix property name mismatch (Showstopper)

**Files:** `LcLegalWorkspacePage.tsx`, `LegalDocumentAttachmentPage.tsx`

Both files cast the RPC result to `{ advanced: boolean }` but the RPC returns `{ phase_advanced: boolean }`. Fix the type cast and all references:

- Change `result.advanced` → `result.phase_advanced` in both files
- Update the type cast from `{ advanced: boolean }` to `{ phase_advanced: boolean }`
- Affects: the CU auto-assign condition, the toast message, and the navigate-on-advance check

**LcLegalWorkspacePage.tsx** — 3 occurrences (lines 567, 571, 590, 594)
**LegalDocumentAttachmentPage.tsx** — 3 occurrences (lines 676, 680, 697, 701)

---

## Step 2: Wire CHALLENGE_JOIN legal gate to solver join flow

**File:** Identify the solver join/enroll component and wrap with `LegalGateModal` using `triggerEvent="CHALLENGE_JOIN"`, `userRole="SOLVER"`.

Need to locate the join button component first — likely in a challenge detail or enrollment page.

---

## Step 3: Archive old templates (cleanup)

**Migration:** `UPDATE legal_document_templates SET is_active = false WHERE document_code IS NULL AND is_active = true;`

Removes clutter from template lists without losing data.

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/cogniblend/LcLegalWorkspacePage.tsx` | Fix `advanced` → `phase_advanced` |
| `src/pages/cogniblend/LegalDocumentAttachmentPage.tsx` | Fix `advanced` → `phase_advanced` |
| Solver join component (TBD) | Add CHALLENGE_JOIN legal gate |
| New migration SQL | Archive old NULL document_code templates |

