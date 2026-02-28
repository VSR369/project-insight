

## Fix: Document Preview & Download Blocked by Browser

### Root Cause
The Supabase signed URL (`izwimkvabbvnqcrrubpf.supabase.co/storage/...`) is being blocked by the browser (ad blocker or cross-origin iframe restriction — `ERR_BLOCKED_BY_CLIENT`). Both the `<iframe src={signedUrl}>` for PDF preview and the `<a href={signedUrl}>` download link fail because the browser blocks navigation to the Supabase domain.

### Fix
Fetch the file as a **blob** via `fetch()`, create a local `blob:` URL using `URL.createObjectURL()`, and use that for both preview and download. Blob URLs are same-origin and bypass browser blocking.

### Changes

**1. `DocumentPreviewDialog.tsx`**
- Accept a `blobUrl` prop instead of (or alongside) `signedUrl`
- Use `blobUrl` for `<iframe src>`, `<img src>`, and download `<a href>`
- Clean up blob URL on unmount via `URL.revokeObjectURL()`

**2. `DocumentReviewCard.tsx`**
- In `handlePreview`, after getting the signed URL, fetch it as a blob:
  ```ts
  const response = await fetch(signedUrl);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  ```
- Pass `blobUrl` to `DocumentPreviewDialog`
- Revoke old blob URLs when creating new ones

**3. `useSeekerOrgApprovals.ts`**
- Add a helper `fetchDocumentBlob(storagePath)` that gets the signed URL and fetches the blob in one step, returning a blob URL. This keeps the logic centralized.

### No changes to business logic, navigation, APIs, or data integrity. Only the rendering transport (signed URL to blob URL) changes.

