
Goal: make PDF preview reliable across Chrome/Edge/Firefox/Safari (including embedded iframe contexts) by removing dependency on native browser PDF plugins (`iframe/object/embed`) and rendering PDFs in-app.

Implementation steps:

1) Replace native PDF embed with PDF.js canvas renderer
- Add `pdfjs-dist` dependency.
- In `DocumentPreviewDialog.tsx`, remove `<object>/<embed>` PDF block.
- Add a dedicated React PDF preview section that:
  - loads the PDF from blob data using PDF.js,
  - renders page(s) to `<canvas>`,
  - shows loading spinner + explicit error state.
- Keep image preview path unchanged (`<img src={blobUrl}>`).

2) Update preview data flow to support PDF.js input
- In `useSeekerOrgApprovals.ts`, add helper returning `Blob` (or `ArrayBuffer`) from signed URL, not only `blob:` URL.
- In `DocumentReviewCard.tsx`, fetch blob once on eye click and pass:
  - `blob` (for PDF.js render),
  - `blobUrl` (for image preview + download).
- Keep existing signed URL flow private and unchanged at storage/API layer.

3) Harden dialog states + fallbacks
- `DocumentPreviewDialog.tsx`:
  - If PDF render fails, show user-facing error + “Download” action.
  - Keep “Open in new tab” as optional fallback (secondary).
  - Disable Accept/Reject while preview is still loading only if needed; otherwise preserve current behavior.
- Ensure no blank gray area: always show one of {loading, rendered preview, error fallback}.

4) Memory and lifecycle cleanup
- Revoke `blobUrl` on dialog close and when switching documents (already partially present; keep and tighten).
- Clear PDF.js loading task/page state on unmount and document switch to avoid stale renders/leaks.

5) Validate end-to-end on real flows
- Test with at least:
  - small PDF,
  - larger PDF,
  - image file,
  - unsupported mime type.
- Verify sequence:
  - click eye → preview renders,
  - click Download → file saves correctly,
  - Accept/Reject from dialog still mutates status and closes dialog.
- Verify in both Lovable preview iframe and published app URL.

Technical details (for implementation):
- Preferred files to touch:
  - `src/pages/admin/seeker-org-approvals/DocumentPreviewDialog.tsx`
  - `src/pages/admin/seeker-org-approvals/DocumentReviewCard.tsx`
  - `src/hooks/queries/useSeekerOrgApprovals.ts`
- Suggested new helper/component:
  - `PdfPreviewCanvas` (can be local in `DocumentPreviewDialog.tsx` or extracted to `src/components/...`).
- PDF.js setup:
  - configure worker via `pdfjsLib.GlobalWorkerOptions.workerSrc` using bundler-safe import URL.
  - render with devicePixelRatio scaling for crisp text.
- Keep existing mutation hooks (`useApproveDocument`, reject dialog path) unchanged.
- No database/RLS/API contract changes required.
