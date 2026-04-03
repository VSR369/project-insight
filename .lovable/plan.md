

# Legal Document Templates Admin Page

## Summary
Build a Supervisor admin page at `/admin/seeker-config/legal-templates` for managing the master `legal_document_templates` table. Supervisors can view, create, edit, and deactivate legal document templates with rich text content and optional file uploads.

## Current State
- `legal_document_templates` table exists with columns: `template_id`, `document_type`, `document_name`, `tier`, `required_for_maturity` (JSONB), `description`, `default_template_url`, `is_active`, `trigger_phase`, `created_at`, `updated_at`
- 17 seed records (8 Tier 1, 9 Tier 2), all with short descriptions and no uploaded files
- Only a SELECT RLS policy exists — no INSERT/UPDATE/DELETE policies for admins
- The `description` column is a plain TEXT field — too small for full legal clauses

## What We Need

### Database Changes (1 migration)
1. **Add `template_content` TEXT column** — stores the full legal clause text (rich text / markdown), separate from the short `description`
2. **Add admin RLS policies** — INSERT/UPDATE/DELETE restricted to authenticated users with `supervisor` or `senior_admin` tier (using `has_role` or tier check pattern from other admin tables)

### New Files (4 files, each under 200 lines)

**1. `src/hooks/queries/useLegalDocumentTemplates.ts`** (~90 lines)
- React Query hook following the `useBlockedDomains` pattern
- `useLegalDocumentTemplates(includeInactive)` — fetches all templates
- `useCreateLegalDocumentTemplate` — insert with `withCreatedBy`
- `useUpdateLegalDocumentTemplate` — update with `withUpdatedBy`
- `useDeleteLegalDocumentTemplate` — soft delete (set `is_active: false`)
- `useRestoreLegalDocumentTemplate` — restore
- Query key: `["legal_document_templates", {includeInactive}]`
- staleTime: 5 minutes (reference data)

**2. `src/pages/admin/seeker-config/LegalDocumentTemplatesPage.tsx`** (~150 lines)
- Page component following `BlockedDomainsPage` pattern
- DataTable with columns: Document Name, Type, Tier, Trigger Phase, Status
- Actions: View, Edit, Activate/Deactivate
- MasterDataForm dialog with fields:
  - `document_name` (text, required)
  - `document_type` (text, required, snake_case identifier)
  - `tier` (select: TIER_1, TIER_2)
  - `description` (textarea, short summary)
  - `trigger_phase` (number, optional, for Tier 2 docs)
  - `is_active` (switch)
- View dialog shows all fields including `template_content` preview

**3. `src/components/admin/legal/LegalTemplateContentEditor.tsx`** (~180 lines)
- Standalone dialog for editing the full legal clause content
- Opens from a "Edit Content" button in the View dialog or table action
- Uses a large textarea (min 20 rows) with character count display
- Minimum 500 characters required for legal clauses
- Markdown-aware (renders preview using `AiContentRenderer`)
- Integrates `RichTextToolbar` for formatting assistance
- Save button calls `useUpdateLegalDocumentTemplate` to persist `template_content`

**4. `src/components/admin/legal/LegalTemplateFileUpload.tsx`** (~120 lines)
- Section within the content editor or view dialog
- Uses existing `FileUploadZone` component
- Accepts PDF, DOCX uploads (max 10MB)
- Uploads to Supabase Storage: `legal-templates/{document_type}/{uuid}.{ext}`
- Updates `default_template_url` on the template record
- Shows current uploaded file with download link if `default_template_url` is set

### Wiring Changes (2 existing files)

**5. `src/components/admin/AdminSidebar.tsx`** — Add sidebar entry after "Governance Modes":
```
{ title: 'Legal Templates', icon: FileText, path: '/admin/seeker-config/legal-templates' }
```

**6. `src/App.tsx`** — Add lazy route:
```
const LegalDocumentTemplatesPage = lazy(() => import("..."));
<Route path="seeker-config/legal-templates" element={<PermissionGuard permissionKey="seeker_config.view">...} />
```

## Technical Details

- **MasterDataForm limitation**: The existing `MasterDataForm` supports `textarea` but not rich text with character counting. The full legal content editing will use a separate dedicated dialog (`LegalTemplateContentEditor`) with `RichTextToolbar` + large textarea + live char count + markdown preview toggle. This keeps the main create/edit form simple.
- **Storage bucket**: Reuses existing `challenge-assets` bucket with path `legal-templates/{type}/{uuid}.{ext}`
- **RLS**: Migration adds policies gated on `has_role(auth.uid(), 'admin')` or checks `user_roles` for supervisor-level access, consistent with other admin tables.
- The `template_content` column is nullable — existing records will have NULL until edited.

