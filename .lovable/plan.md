

# Organization Context Panel for Curation Review

## Summary

Add an "Organization Details" section at the top of the Curation Review page that:
1. Auto-populates org name, website, social media, and description from `seeker_organizations` (set by AM/CA/CR during challenge creation)
2. Allows the Curator to fill in missing fields (website, LinkedIn, Twitter, description) if AM/CA/CR didn't provide them
3. Supports uploading organization profile documents (using existing `challenge_attachments` table with `section_key = 'org_profile'`)
4. Saves curator-entered org context back to `seeker_organizations` and triggers text extraction for uploaded docs

## Architecture

```text
┌─────────────────────────────────────────────────────┐
│  CurationReviewPage.tsx                             │
│  ┌───────────────────────────────────────────────┐  │
│  │  OrgContextPanel (new component)              │  │
│  │  - Auto-loaded from seeker_organizations      │  │
│  │  - Editable fields: website, LinkedIn,        │  │
│  │    Twitter, description, tagline              │  │
│  │  - File upload for org profile docs           │  │
│  │  - Saves back to seeker_organizations         │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  Original Brief accordion (existing)          │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  Progress Strip + Sections (existing)         │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Files to Create/Modify

### 1. New Component: `src/components/cogniblend/curation/OrgContextPanel.tsx`

A collapsible accordion panel showing organization details with inline editing capability:

- **Read-only fields** (always shown): Organization Name, Org Type
- **Editable fields** (pre-populated if AM/CA/CR provided, otherwise empty for curator to fill): Website URL, LinkedIn URL, Twitter URL, Organization Description, Tagline
- **File upload zone**: Uses existing `FileUploadZone` component for org profile documents (PDF, DOCX, images). Uploads to `challenge-attachments` storage bucket with `section_key = 'org_profile'`. Triggers `extract-attachment-text` edge function after upload.
- **Visual cue**: Shows a small amber indicator "AI uses this context" to convey importance
- Fetches org data via a dedicated query on `seeker_organizations` using `challenge.organization_id`
- Saves edits back to `seeker_organizations` via mutation
- Lists existing org profile attachments with delete capability

**Key props**: `challengeId`, `organizationId`, `isReadOnly`

### 2. Modify: `src/pages/cogniblend/CurationReviewPage.tsx`

- Add a new query to fetch org details (website, LinkedIn, Twitter, description, tagline, org type name) — expand the existing `curation-org-type` query to return all needed fields in one call
- Render `OrgContextPanel` between the header and the "Original Brief" accordion
- Pass `challengeId` and `challenge.organization_id` to the panel

### 3. Storage Bucket Migration

Create a migration to ensure the `challenge-attachments` storage bucket exists (the edge function already references it but the bucket may not be created yet):

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('challenge-attachments', 'challenge-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload/read
CREATE POLICY "Authenticated users can upload challenge attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'challenge-attachments');

CREATE POLICY "Authenticated users can read challenge attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'challenge-attachments');

CREATE POLICY "Authenticated users can delete own challenge attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'challenge-attachments');
```

### 4. Modify Edge Function Context

The `review-challenge-sections/index.ts` already fetches org context (website, LinkedIn, description, etc.) and passes it to `buildContextIntelligence`. It also already fetches `challenge_attachments` with `extraction_status = 'completed'` and injects them into prompts. No changes needed to the edge function -- org profile docs uploaded with `section_key = 'org_profile'` will automatically be included in the `ATTACHED DOCUMENTS` block sent to the AI.

## Component Design: OrgContextPanel

```text
┌─────────────────────────────────────────────────────────┐
│ 🏢 Organization Context          ⚡ AI uses this context│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Organization: Acme Corp         Type: Enterprise       │
│                                                         │
│  Website:    [https://acme.com        ] ← editable     │
│  LinkedIn:   [https://linkedin.com/... ] ← editable     │
│  Twitter:    [https://twitter.com/...  ] ← editable     │
│  Description: [Multi-line textarea...  ] ← editable     │
│                                                         │
│  ┌─ Organization Profile Documents ─────────────────┐  │
│  │  📄 Company_Profile.pdf   120 KB  [✓ Extracted] ✕ │  │
│  │                                                   │  │
│  │  [Drag & drop or click to upload]                 │  │
│  │  PDF, DOCX, PNG, JPG · Max 10 MB                  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│                              [Save Organization Details] │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

1. AM/CA/CR selects org → `challenges.organization_id` is set
2. When curator opens curation page, `OrgContextPanel` fetches org from `seeker_organizations` (website, LinkedIn, etc.)
3. If fields are populated → shown as pre-filled, curator can verify
4. If fields are empty → curator can enter them (important for AI quality)
5. Curator uploads org profile docs → stored in `challenge-attachments` bucket with `section_key = 'org_profile'`
6. Upload triggers `extract-attachment-text` → text extracted and stored in `challenge_attachments.extracted_text`
7. When AI review runs → `buildContextIntelligence` uses org fields, and attachment text is injected into prompts

## Implementation Order

1. Create storage bucket migration for `challenge-attachments`
2. Create `OrgContextPanel` component
3. Integrate into `CurationReviewPage` (expand org query + render panel)

