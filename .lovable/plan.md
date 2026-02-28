
Goal: eliminate the persistent PDF spinner by fixing all underlying causes (not just build target).

1) 5 WHYs Analysis (Root-Cause Chain)
1. Why is the preview stuck on spinner?
   - `PdfPreviewCanvas` stays in `status === 'loading'` and never transitions to `rendered` or `error`.
2. Why does it never transition?
   - In `loadPdf()`, it exits early at `if (!canvas || !container) return;` before `setStatus('rendered')`.
3. Why are `canvas` and `container` null?
   - The component renders only a loading spinner while status is loading, so `<canvas ref>` and `<div ref={containerRef}>` are not mounted yet.
4. Why doesn’t timeout switch to error?
   - `loadPdf().finally(() => clearTimeout(timeout))` clears timeout even on early return, so fallback never fires.
5. Why was this missed by previous fixes?
   - Prior fixes focused on bundler/pdfjs compatibility (`esnext`) but not on lifecycle/render-state logic in `PdfPreviewCanvas`.

2) Secondary Root Causes to Fix
- Ref warning in console (`Function components cannot be given refs`) indicates a composition issue around dialog content tree during preview render; clean this while refactoring preview container to avoid unstable child structure.
- Worker URL is currently CDN `.mjs`; keep a robust worker setup and explicit import path fallback strategy to avoid environment-specific worker failures.

3) Implementation Plan (Targeted Fixes)
A. Refactor `PdfPreviewCanvas` rendering model
- Always render the preview container and canvas node (even in loading state).
- Overlay loading/error UI instead of conditionally replacing the entire DOM subtree.
- Remove the early-return path that skips rendering state transition.
- Ensure `setStatus('rendered')` runs after successful page render.

B. Make timeout/fallback reliable
- Keep timeout active until either:
  - render succeeds (`setStatus('rendered')`), or
  - explicit error path (`setStatus('error')`).
- Do not clear timeout in `finally` unless a terminal status is reached.
- Cancel in-flight render/load tasks on unmount/doc change.

C. Stabilize PDF render task lifecycle
- Track `loadingTask` and `renderTask` refs; cancel previous tasks before new page/document render.
- Prevent race conditions between page navigation and initial document load.
- Ensure page navigation reuses loaded doc and sets status transitions consistently.

D. Fix dialog integration/ref warning
- Keep preview child tree stable inside `DocumentPreviewDialog` (single mounted preview container).
- Avoid swapping incompatible child component roots during dialog transitions.
- Validate no `ref` is indirectly passed to a non-forwardRef function component in this path.

E. Harden worker configuration
- Use version-matched worker source with explicit, stable configuration.
- Add fallback handling when worker fails to load (surface error state + download action immediately).

4) Files to Update
- `src/components/PdfPreviewCanvas.tsx` (primary lifecycle/state/task fix)
- `src/pages/admin/seeker-org-approvals/DocumentPreviewDialog.tsx` (stable preview mount structure)
- Optional only if needed after validation: `vite.config.ts` (leave as-is unless worker/load diagnostics require stricter target like `es2022`)

5) Validation Checklist (must pass)
- PDF (small): eye click → first page renders, spinner disappears.
- PDF (large): eventually renders or cleanly falls back to error with download/open actions.
- Multi-page nav: next/previous updates canvas without hanging.
- Image preview path unchanged.
- Unsupported mime shows fallback card.
- Console free of:
  - infinite loading behavior,
  - `Function components cannot be given refs` warning in this flow.
- Download button works in preview dialog for all file types.

6) Technical Details
- Replace conditional return blocks:
  - from `if (status==='loading') return <Spinner/>`
  - to persistent container + conditional overlay.
- Sequence:
  - mount container/canvas → start load task → render page → set `rendered`.
- Timeout control:
  - start timer at load begin,
  - clear only on success/error/cancel,
  - never clear on non-terminal early return.
