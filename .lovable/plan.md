

# Plan: Fix Document Creation Flow + Trigger Config Review

## Problems Identified

### Problem 1: "Add Document" has no document code selector
When clicking "Add Document" (without a code), the editor defaults to `PMA`. There is no UI to choose the document code. The config sidebar is also missing a `document_code` field for new documents.

### Problem 2: Document codes are hardcoded — no way to add new ones
The 5 codes (PMA, CA, PSA, IPAA, EPIA) are locked by:
- A DB CHECK constraint: `document_code IN ('PMA','CA','PSA','IPAA','EPIA')`
- A TypeScript type: `type DocumentCode = 'PMA' | 'CA' | ...`
- Hardcoded arrays in `LegalDocumentListPage`, `LegalDocTriggerForm`, etc.

To support new codes, the CHECK constraint must be dropped (or widened), and the code should read available codes dynamically or allow extending the list.

### Problem 3: Trigger form missing key fields
The `LegalDocTriggerForm` has these gaps vs spec:
- **`required_roles`**: Hardcoded to `['{ALL}']` — no multi-select UI
- **`is_active`**: No toggle (the table shows it, but the form doesn't set it)
- **Trigger event descriptions**: Spec says show descriptions in the dropdown (e.g., "When any user first registers"), but currently only labels are shown

### Problem 4: Trigger data is correct
All 15 seed rows match the spec exactly. No data changes needed.

---

## Implementation

### Step 1: Add Document Code selector to Config Sidebar
Add a `document_code` select field in `LegalDocConfigSidebar.tsx` that appears when creating a new document (not when editing an existing one). For existing documents, show it as read-only badge.

**File:** `src/components/admin/legal/LegalDocConfigSidebar.tsx`

### Step 2: Wire document_code from sidebar into the create flow
Pass `document_code` from config state into the `handleSave` create path in `useLegalDocEditor.ts`. Currently it uses `defaultCode` — it should use `config.document_code ?? defaultCode`.

**File:** `src/hooks/admin/useLegalDocEditor.ts`

### Step 3: Add description field to editor page
The sidebar should also include a `description` textarea for the document's purpose text (e.g., "Platform-wide terms of use, liability limitations..."). Currently `description` exists in the DB but is not editable in the sidebar.

**File:** `src/components/admin/legal/LegalDocConfigSidebar.tsx`

### Step 4: Fix "Add Document" button navigation
The main list page "Add Document" button navigates to `/admin/legal-documents/new` without a code. This is fine — the user will select the code in the sidebar. No change needed here.

### Step 5: Fix LegalDocTriggerForm — add missing fields
- Add `required_roles` multi-select (CR, CU, ER, LC, FC, SOLVER, ALL)
- Add `is_active` toggle
- Add descriptions to trigger event dropdown items

**File:** `src/components/admin/legal/LegalDocTriggerForm.tsx`

### Step 6: Add trigger event descriptions to types
Add a `TRIGGER_EVENT_DESCRIPTIONS` record to `legal.types.ts` with the spec descriptions.

**File:** `src/types/legal.types.ts`

---

## Regarding Adding New Document Codes

The DB CHECK constraint restricts `document_code` to the 5 values. Two options:

**Option A (Recommended):** Keep the constraint for data integrity. When a new code is needed, a DB migration adds it to the CHECK constraint + update the TypeScript type. This is a deliberate, controlled process.

**Option B:** Drop the CHECK constraint and make it free-text. More flexible but loses data validation.

I will implement **Option A** — keep the constraint, but make the UI code-list driven from a single constant so adding a new code only requires updating one TypeScript constant + one migration.

---

## Files Modified

| File | Change |
|---|---|
| `src/types/legal.types.ts` | Add `TRIGGER_EVENT_DESCRIPTIONS` |
| `src/components/admin/legal/LegalDocConfigSidebar.tsx` | Add document_code select + description textarea |
| `src/hooks/admin/useLegalDocEditor.ts` | Use config.document_code in create path |
| `src/components/admin/legal/LegalDocTriggerForm.tsx` | Add required_roles multi-select, is_active toggle, event descriptions |

4 files, no migrations needed (trigger data already correct, DB schema already supports all fields).

