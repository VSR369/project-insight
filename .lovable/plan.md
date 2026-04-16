

# Verification & Remaining Fixes

## Current State — What IS Already Implemented

After reviewing all files, the three planned fixes **are in the codebase**:

1. **Pass 2 `refreshKey`** — `DiagnosticsSheet.tsx` has `refreshKey` state that increments when `open` changes (line 37), and all `useMemo` calls depend on `[open, challengeId, refreshKey]`. `CurationDiagnosticsPage.tsx` has a manual Refresh button that increments `refreshKey`.

2. **Source filter breakdown** — `useDiagnosticsData.ts` calculates `extractionNotReady`, `lowQualityFiltered`, `insufficientContent`, and `usableForDigest`. `DiagnosticsDiscoveryPanel.tsx` displays "Total Accepted" vs "Usable for Digest" with an itemized breakdown.

3. **Acceptance panel** — `DiagnosticsAcceptancePanel.tsx` exists and is rendered. `saveAcceptanceRecord` is called in the orchestrator after Accept All runs.

## Why It May Still Appear Broken

### A. Pass 2 still shows "Not Run" in the sheet
The `refreshKey` only increments when `open` transitions to `true`. If the diagnostics sheet is **already open** while Pass 2 runs, there is no trigger to re-read localStorage — the data stays stale until the sheet is closed and reopened.

**Fix:** Add a `storage` event listener so the sheet auto-refreshes when `wave-exec-*-generate` is written by the executor. This covers the "sheet open during execution" case.

### B. Console ref warning is NOT from DiagnosticsAcceptancePanel
The actual warning in console logs is from **`WaveStatusIcon`** in `WaveProgressPanel.tsx` (line 43), not from the acceptance panel. The `<div>` wrapper on the acceptance panel is correct but irrelevant — the real culprit needs fixing too.

**Fix:** Wrap `WaveStatusIcon` with `React.forwardRef` in `WaveProgressPanel.tsx`.

## Plan

| File | Change |
|------|--------|
| `DiagnosticsSheet.tsx` | Add `useEffect` with `window.addEventListener('storage', ...)` that increments `refreshKey` when relevant keys change — covers real-time updates while sheet is open |
| `WaveProgressPanel.tsx` | Wrap `WaveStatusIcon` with `React.forwardRef` to eliminate the console warning |

No changes needed to the other files — the discovery panel, acceptance panel, and orchestrator logic are all correctly implemented.

