

# Fix: Legal Trigger Table UI Gaps

## Current State
- **Data: 15/15 triggers correct** — no changes needed
- **Form: Complete** — all fields present (code, section, event with descriptions, roles multi-select, mode, mandatory, active, display order)
- **Table: 3 minor gaps** in display

## Changes

### 1. Add `is_active` column to trigger table
Show an active/inactive badge so admins can see status at a glance without opening the edit form.

**File:** `src/components/admin/legal/LegalDocTriggerTable.tsx`

### 2. Show full document name in table
Use `DOCUMENT_CODE_LABELS[t.document_code]` to display "Platform Master Agreement" with the code badge, instead of just the raw code.

**File:** `src/components/admin/legal/LegalDocTriggerTable.tsx`

### 3. Add delete confirmation dialog
Wrap the delete action in an `AlertDialog` requiring confirmation before deleting a trigger rule.

**File:** `src/components/admin/legal/LegalDocTriggerTable.tsx`

---

All changes are in one file. No data or schema changes needed.

