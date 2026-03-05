

# Implementation Plan: 2 Remaining Gaps

## Gap 1: Admin Transfer Protocol in AdminDetailsTab

**Problem**: `AdminDetailsTab.tsx` uses the legacy `org_admin_change_requests` table. The BRD requires a formal "Transfer Primary Admin" button that creates records in `admin_transfer_requests` (referencing `seeking_org_admins`).

**Approach**: Add a "Transfer Primary Admin" section to `AdminDetailsTab.tsx` alongside the existing admin change form. Since `seeking_org_admins` records may not yet exist for all orgs (populated on approval), the transfer form will create the transfer request with the org ID and admin email/name directly, and a new hook will handle the mutation.

### Changes

**New hook**: `src/hooks/queries/useAdminTransferHooks.ts`
- `usePendingTransferRequest(organizationId)` — queries `admin_transfer_requests` for pending status
- `useRequestAdminTransfer()` — mutation to insert into `admin_transfer_requests` with `organization_id`, `to_admin_email`, `to_admin_name`, `from_admin_id` (nullable UUID if no `seeking_org_admins` record yet)
- `useCancelTransferRequest()` — mutation to update status to `cancelled`

**Modified file**: `src/components/org-settings/AdminDetailsTab.tsx`
- Add a new Card section: "Transfer Primary Admin" below the existing "Change Organization Admin" card
- Contains a button "Request Admin Transfer" that opens inline form with:
  - New Admin Email (required)
  - New Admin Name (optional)
- Shows pending transfer banner if one exists (similar to pending change request banner)
- Submit creates record in `admin_transfer_requests`
- Disable button if a pending transfer already exists

---

## Gap 2: Contact Sales CTA Enhancement (Qualification Dialog)

**Problem**: `handleEnterpriseContact` auto-submits with hardcoded message. Plan calls for a dialog with qualification fields.

**Approach**: Replace the direct `handleEnterpriseContact` call with a dialog that collects qualification info before submitting.

### Changes

**Modified file**: `src/components/registration/PlanSelectionForm.tsx`
- Add `useState` for `showEnterpriseDialog` (boolean)
- Add `useState` for `enterpriseFormData` with fields: `expected_challenge_volume` (select: 1-5, 6-20, 21-50, 50+), `specific_requirements` (textarea)
- Change the "Contact Sales" button `onClick` to open the dialog instead of calling `handleEnterpriseContact`
- Update `handleEnterpriseContact` to accept the qualification data and include it in the `message` field
- Map `expected_challenge_volume` to `company_size` column (or append to `message`)

**New Dialog in same file** (inline, not separate component — keeps it simple):
- `Dialog` with title "Contact Our Enterprise Team"
- Fields:
  - Company Size (pre-filled from `state.step1?.company_size_range`, read-only)
  - Expected Challenge Volume per Month (Select: "1-5", "6-20", "21-50", "50+")
  - Specific Requirements (Textarea, optional, max 500 chars)
- Submit button calls `handleEnterpriseContact` with enriched `message`
- Loading state while submitting, auto-close on success

---

## Summary

| Gap | Files Modified | Files Created |
|-----|---------------|---------------|
| Admin Transfer | `AdminDetailsTab.tsx` | `useAdminTransferHooks.ts` |
| Contact Sales CTA | `PlanSelectionForm.tsx` | — |

No DB migrations needed — both tables (`admin_transfer_requests`, `enterprise_contact_requests`) already exist.

