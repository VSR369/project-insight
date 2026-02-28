

## Fix: Sanitize Filenames in Storage Upload Paths

### Root Cause
Supabase Storage rejects keys containing special characters like `[`, `]`, `(`, `)`, etc. The filename `Entrepreneurship[1].pdf` triggers "Invalid key" because `[1]` is passed directly into the storage path.

### Solution
Create a shared `sanitizeFileName` utility and apply it in both upload hooks. The function strips unsafe characters while preserving the file extension and original name for the DB record.

### Changes

#### 1. Create `src/lib/sanitizeFileName.ts`
A utility function that replaces non-alphanumeric characters (except `-`, `_`, `.`) with underscores:
```ts
export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
```

#### 2. `src/hooks/queries/useComplianceData.ts` (line 140)
Change storage path construction to sanitize the filename:
```ts
// Before
const storagePath = `${payload.tenant_id}/nda/${crypto.randomUUID()}_${payload.file.name}`;
// After
const storagePath = `${payload.tenant_id}/nda/${crypto.randomUUID()}_${sanitizeFileName(payload.file.name)}`;
```
The `file_name` field in the DB record keeps the original name for display.

#### 3. `src/hooks/queries/useRegistrationData.ts` (line 248)
Same fix for org document uploads:
```ts
// Before
const storagePath = `${tenantId}/${documentType}/${fileId}_${file.name}`;
// After
const storagePath = `${tenantId}/${documentType}/${fileId}_${sanitizeFileName(file.name)}`;
```

Both hooks already store the original `file.name` in the `seeker_org_documents.file_name` column, so display names are unaffected.

