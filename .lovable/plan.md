

# Fix: Diagnostics Opening Login Screen in New Tab

## Problem

The diagnostics button uses `window.open(..., '_blank')` to open in a new browser tab. The new tab triggers the auth guard before the Supabase session is restored from localStorage, causing a redirect to the login page.

## Fix

Replace the new-tab approach with a **Sheet (slide-over panel)** that renders the diagnostics content inline on the curation page. This avoids navigation entirely — no auth issues, no unmounting the wave executor, and the user gets a close button built into the Sheet.

### Changes

| File | Change |
|------|--------|
| `src/components/cogniblend/curation/CurationRightRail.tsx` | Replace `window.open` with state toggle to open a Sheet. Import and render `DiagnosticsSheet`. |
| `src/components/cogniblend/diagnostics/DiagnosticsSheet.tsx` | **Create** — A `Sheet` wrapper that renders all three diagnostics panels (`DiagnosticsReviewPanel`, `DiagnosticsSuggestionsPanel`, `DiagnosticsDiscoveryPanel`) inside a `SheetContent`. Includes a close button in the header. Uses `useDiagnosticsData` hook. |

### How It Works

1. User clicks "Diagnostics" button in the right rail
2. A full-height Sheet slides in from the right with the diagnostics content
3. Sheet header shows "AI Diagnostics" title + Close button
4. Clicking Close or clicking outside dismisses the sheet
5. The curation page stays fully mounted — wave executor keeps running

### What Gets Removed

The `CurationDiagnosticsPage.tsx` route remains available but the primary access point switches from new-tab to the inline Sheet. The `beforeunload` guard from the previous fix remains intact for browser refresh/close scenarios.

