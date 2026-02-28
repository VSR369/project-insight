

## Missing Data on Registration Preview Page

### Current State
The `RegistrationPreviewPage.tsx` shows partial data from each step. Here's what's **missing**:

**Step 1 — Organization Identity:**
- Operating Geographies (country names)
- Uploaded documents: Logo, Profile Document, Verification Documents

**Step 2 — Primary Contact:**
- Preferred Language (needs `useLanguages` hook)
- Admin Designation (`self` / `separate`)
- Separate Admin details (name, email, phone) if applicable

**Step 3 — Compliance:**
- Export Control Status (needs `useExportControlStatuses` hook to resolve ID)
- Data Residency (needs `useDataResidencyOptions` hook to resolve ID)
- NDA Preference (`standard_platform_nda` / `custom_nda`)

**Step 5 — Billing:**
- Internal Department flag (`is_internal_department`)

**Documents Section (new):**
- No query exists to fetch uploaded documents from `seeker_org_documents` table
- Need a new section showing all uploaded files with their verification status

### Plan

#### 1. Add a `useOrgDocuments` query hook in `useRegistrationData.ts`
Query `seeker_org_documents` by `organization_id` to fetch uploaded document metadata (file_name, document_type, verification_status, file_size).

#### 2. Expand `RegistrationPreviewPage.tsx` with missing fields and documents

- **Step 1**: Add `Operating Geographies` field (resolve country IDs to names)
- **Step 2**: Add `Preferred Language` (via `useLanguages`), `Admin Designation`, separate admin details
- **Step 3**: Add `Export Control Status` (via `useExportControlStatuses`), `Data Residency` (via `useDataResidencyOptions`), `NDA Preference`
- **Step 5**: Add `Internal Department` flag
- **New "Uploaded Documents" card**: List all documents from `seeker_org_documents` with file name, type badge, size, and verification status badge

#### 3. Additional hooks to import
- `useLanguages` from `usePrimaryContactData`
- `useExportControlStatuses`, `useDataResidencyOptions` from `useComplianceData`
- New `useOrgDocuments` hook

