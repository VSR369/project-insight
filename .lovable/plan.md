

## Fix: Chrome Blocking PDF Preview in Iframe

### Root Cause
Chrome blocks `blob:` URLs rendered inside `<iframe>` elements in certain security contexts (especially when the app itself runs inside an iframe, as in the Lovable preview). The `<iframe>` triggers Chrome's built-in "blocked page" warning even though the blob was fetched successfully.

### Solution
Replace `<iframe>` with `<embed>` for PDF rendering and add `<object>` as a layered fallback. The `<embed>` element with `type="application/pdf"` uses the browser's native PDF viewer without the iframe security restrictions. Additionally, add a manual "Open in new tab" fallback button for browsers that don't support embedded PDF viewing at all.

### Changes

**`DocumentPreviewDialog.tsx`** — Single file change:
- Replace the `<iframe src={blobUrl}>` block (line 79-84) with:
  ```tsx
  <embed
    src={blobUrl}
    type="application/pdf"
    className="flex-1 min-h-0 w-full rounded"
  />
  ```
- Add a small fallback message below the embed in case the browser still can't render it, with a button that opens the blob URL in a new tab via `window.open(blobUrl, '_blank')`

No other files need changes. The blob fetching logic in `useSeekerOrgApprovals.ts` and `DocumentReviewCard.tsx` is correct and working (confirmed by network logs showing successful 200 responses).

