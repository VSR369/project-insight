

## Fix: Allow Custom NDA Upload During Pre-Auth Registration

### Root Cause
The `org-documents` storage bucket has RLS policies requiring `auth.role() = 'authenticated'`. During registration, the user is unauthenticated (account is created at Step 5), so uploads fail.

### Solution
Add a permissive INSERT policy on `storage.objects` for the `org-documents` bucket that allows anonymous uploads to NDA paths only. This mirrors the same pattern already used for `seeker_org_documents`, `seeker_compliance`, and other registration tables that have permissive pre-auth INSERT policies.

### Changes

**1. Database Migration — Add anon storage policy**

```sql
-- Allow pre-auth NDA upload during registration (path-scoped)
CREATE POLICY "Pre-auth NDA upload during registration"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-documents'
    AND (storage.foldername(name))[2] = 'nda'
  );
```

This scopes anon uploads to only the `{tenant_id}/nda/` path within the bucket.

**2. No code changes needed**

The `ComplianceForm.tsx` already has the NDA preference radio group and conditional file upload UI. The `useUploadNdaDocument` hook already handles upload + document record creation + linking. The only blocker was the storage RLS policy.

### Post-Registration Custom NDA Upload
The user's second question — "what if they accept Standard NDA initially and later want to upload Custom NDA?" — is already handled by the existing architecture:
- `seeker_organizations.nda_preference` can be updated anytime
- The Organization Settings compliance tab (post-auth) can reuse the same `useUploadNdaDocument` hook
- Post-auth uploads already work since `auth.role() = 'authenticated'` policies are in place

No additional code is needed for the post-registration scenario — the org settings page just needs a compliance section (which can be a future task).

