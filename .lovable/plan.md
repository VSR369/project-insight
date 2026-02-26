

## Plan: Fill the Terms/NDA UI Gaps

### Gap Analysis (Corrected)

After inspecting the actual codebase, the gap summary from the user's message is partially outdated. Here is the corrected status:

| Feature | Database | Backend | UI | Actual Gap |
|---------|----------|---------|-----|-----------|
| Multi-tenant isolation | Done | Done | Done | No gap |
| Platform Terms versioning | Done | Done | Admin: Done, Registration: Done | No gap |
| Terms scrollable viewer | N/A | N/A | **Already built** (BillingForm Dialog with ScrollArea, lines 662-680) | No gap |
| Terms acceptance hash (SHA-256) | DB function exists | Client-side hash generated and stored | Hash is wired in BillingForm | **Minor gap**: uses client-side `crypto.subtle.digest` instead of the DB function `generate_terms_acceptance_hash()` |
| NDA preference (Standard/Custom) | Columns on `seeker_organizations` table | Enums exist | **Not built anywhere** | **Real gap** |
| Custom NDA upload + review | `custom_nda_document_id` on `seeker_organizations`, `seeker_org_documents` table exists | Schema exists | **Not built** | **Real gap** |

### What Needs to Be Built (2 real gaps)

---

### Gap 1: NDA Preference Selector in Compliance Form (Step 3)

**File to modify:** `src/components/registration/ComplianceForm.tsx`

Add a new section after the "Compliance Certifications" grid and before "Additional Notes":

```text
┌─────────────────────────────────────────────────────────┐
│  📋 NDA Preference                                      │
│                                                         │
│  How would you like to handle your Non-Disclosure        │
│  Agreement with the platform?                            │
│                                                         │
│  (●) Standard Platform NDA (Recommended)                │
│      Use our pre-approved mutual NDA. No review needed. │
│                                                         │
│  ( ) Custom NDA                                         │
│      Upload your own NDA for platform review.           │
│      Review typically takes 3-5 business days.           │
│                                                         │
│  [If Custom NDA selected:]                              │
│  ┌────────────────────────────────────────────┐         │
│  │  Upload Custom NDA (PDF, max 10MB)         │         │
│  │  [ Choose File ]                           │         │
│  │  Status: ⏳ Pending Review                  │         │
│  └────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

**Data flow:**
- Add `nda_preference` and `custom_nda_file` fields to the Zod schema (`src/lib/validations/compliance.ts`)
- On submit, update `seeker_organizations` with `nda_preference` and `nda_review_status`
- If custom NDA: upload file to Supabase Storage (`{tenant_id}/nda/{uuid}_{filename}`), create a record in `seeker_org_documents`, and set `custom_nda_document_id` on the organization
- If standard NDA: set `nda_review_status = 'not_applicable'`

**Validation schema updates (`src/lib/validations/compliance.ts`):**
- Add `nda_preference: z.enum(['standard_platform_nda', 'custom_nda']).default('standard_platform_nda')`
- Add conditional: if `custom_nda`, file upload is recommended but not required (user may not have it ready)

**Hook updates (`src/hooks/queries/useComplianceData.ts`):**
- Extend `useUpsertCompliance` to also update `seeker_organizations.nda_preference`, `nda_review_status`
- Add a new `useUploadNdaDocument` mutation for file upload + `seeker_org_documents` insert + organization update

**Registration context updates (`src/types/registration.ts`):**
- Add `nda_preference` to `Step3ComplianceData`

---

### Gap 2: Use Server-Side Terms Hash Function

**File to modify:** `src/components/registration/BillingForm.tsx`

Currently the `generateTermsHash` function (lines 829-836) computes SHA-256 client-side using `crypto.subtle.digest`. The database has a `generate_terms_acceptance_hash(p_org_id, p_terms_version, p_accepted_at, p_accepted_by)` function that should be used instead for immutable server-side proof.

**Change:** Replace the client-side hash generation with an RPC call:

```typescript
const { data: termsHash } = await supabase.rpc('generate_terms_acceptance_hash', {
  p_org_id: state.organizationId,
  p_terms_version: platformTerms.version,
  p_accepted_at: new Date().toISOString(),
  p_accepted_by: state.organizationId, // pre-auth, no user ID yet
});
```

Remove the local `generateTermsHash` utility function.

---

### Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/lib/validations/compliance.ts` | Modify | Add `nda_preference` enum field to schema |
| `src/components/registration/ComplianceForm.tsx` | Modify | Add NDA preference radio group + conditional file upload section |
| `src/hooks/queries/useComplianceData.ts` | Modify | Extend upsert to update org NDA fields; add `useUploadNdaDocument` mutation |
| `src/types/registration.ts` | Modify | Add `nda_preference` to `Step3ComplianceData` |
| `src/components/registration/BillingForm.tsx` | Modify | Replace client-side hash with `supabase.rpc('generate_terms_acceptance_hash')` call |

### No Database Changes Required

All columns, enums, and functions already exist. This is purely a UI wiring task.

