

## Document Preview with Accept/Reject Actions

### Current Behavior
Clicking the download button opens the document in a new browser tab via a signed URL. Accept/Reject buttons sit inline next to each document row.

### Proposed Change
Replace the "open in new tab" behavior with an **in-page document preview dialog**. When the admin clicks the download/view button on a document row:

1. **Fetch the signed URL** from Supabase Storage.
2. **Open a full-screen Dialog** containing:
   - An `<iframe>` rendering the document (PDF files render natively in browsers; images via `<img>` tag based on `mime_type`).
   - Document metadata header (file name, type, size, current status).
   - A footer with **Accept** and **Reject** buttons (only shown when `verification_status === 'pending'`).
   - A separate **Download** icon button to still allow saving the file locally.
3. Clicking **Reject** opens the existing `RejectDocumentDialog` on top.
4. After Accept/Reject, the preview dialog closes automatically.

### New File
- `src/pages/admin/seeker-org-approvals/DocumentPreviewDialog.tsx` — The preview dialog component.

### Modified File
- `src/pages/admin/seeker-org-approvals/DocumentReviewCard.tsx` — Replace `window.open` with opening the preview dialog. Keep inline Accept/Reject buttons as-is for quick actions without previewing.

### Implementation Details

**DocumentPreviewDialog props:**
```ts
interface DocumentPreviewDialogProps {
  doc: SeekerDocument | null;
  signedUrl: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**Rendering logic:**
- If `mime_type` starts with `image/` → render `<img>` tag
- If `mime_type` is `application/pdf` → render `<iframe>` with full height
- Fallback → show "Preview not available" message with download link

**Dialog layout:**
- `max-h-[90vh]` with `flex flex-col overflow-hidden` per project standards
- Header: file name + status badge (shrink-0)
- Body: iframe/img preview (flex-1 min-h-0 overflow-hidden)
- Footer: Download, Accept, Reject buttons (shrink-0)

