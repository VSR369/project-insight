

## Root Cause Analysis: Documents Not Persisted to DB

### Findings

**Three document types in Step 1 are captured in UI state but NEVER uploaded to storage or saved to `seeker_org_documents`:**

| Document | UI State Variable | Upload to Storage | Saved to DB |
|----------|------------------|-------------------|-------------|
| Organization Logo | `logoFile` | **NO** | **NO** |
| Profile Document | `profileDocument` | **NO** | **NO** |
| Verification Docs (NGO/Academic) | `verificationFiles[]` | **NO** | **NO** |
| Custom NDA (Step 3) | `ndaFile` | **YES** (via `useUploadNdaDocument`) | **YES** |

**Root causes:**
1. `OrganizationIdentityForm.tsx` `handleSubmit` (lines 175-250) creates/updates the org record but **never uploads files** — `logoFile`, `profileDocument`, and `verificationFiles` are only held in `useState` and lost on navigation.
2. The storage RLS policy only allows anon uploads to `{tenant_id}/nda/` path. Logo, profile, and verification paths are **blocked**.
3. No upload hook exists for these three document types — only `useUploadNdaDocument` exists (in `useComplianceData.ts`).

### Authorization Model Confirmation

**The Platform Admin (`platform_admin` role) authorizes/verifies all uploaded documents.** The `seeker_org_documents` table has:
- `verification_status` enum: `pending` → `verified` / `rejected`
- `verified_by` (UUID — the platform admin who reviewed)
- `verified_at` (timestamp)
- `rejection_reason` (text — if rejected)

All documents upload with `verification_status = 'pending'` and await Platform Admin review.

### Plan (3 changes)

#### 1. Database Migration — Expand storage RLS for all document types

```sql
DROP POLICY IF EXISTS "Pre-auth NDA upload during registration" ON storage.objects;

CREATE POLICY "Pre-auth document upload during registration"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-documents'
    AND (storage.foldername(name))[2] IN ('logo', 'profile', 'verification', 'nda')
  );
```

#### 2. New hook: `useUploadOrgDocument` in `src/hooks/queries/useRegistrationData.ts`

A generic mutation hook that:
- Uploads a file to `org-documents` bucket at `{tenantId}/{docType}/{uuid}_{filename}`
- Inserts a record into `seeker_org_documents` with the matching `document_type` enum value (`logo`, `profile`, `verification`)
- Returns the created record

#### 3. Wire uploads in `OrganizationIdentityForm.tsx` `handleSubmit`

After org creation/update succeeds (and `organizationId`/`tenantId` are available):
- Upload `logoFile` → storage + DB record (`document_type = 'logo'`)
- Upload `profileDocument` → storage + DB record (`document_type = 'profile'`)
- Upload each `verificationFiles[i]` → storage + DB record (`document_type = 'verification'`)
- Update `seeker_organizations.logo_url` with the logo storage path
- File upload failures show a toast warning but do not block navigation (org data is already saved)

