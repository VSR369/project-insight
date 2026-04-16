

# Fix: Pass 2 Data Lost + 33 vs 22 Source Discrepancy + Console Ref Warning

## Issue 1: Pass 2 Execution Record Shows "Not Run"

**Root cause found:** The Pass 2 executor correctly saves to `wave-exec-{challengeId}-generate` localStorage key. The persistence code in `useWaveExecutor.ts` is sound — it saves at record creation (line 112), after each wave start/complete (149, 198), and at finalization (212/228).

The problem is in `DiagnosticsSheet.tsx` line 35:
```ts
const generateRecord = open ? loadExecutionRecord(challengeId, 'generate') : null;
```
This reads localStorage synchronously on render. However, there are two scenarios where this breaks:

1. **Sheet already open during Pass 2 run:** The value is computed once per render. Since `open` doesn't change during the run, there's no trigger to re-read localStorage after Pass 2 completes. The sheet shows stale data.

2. **Stale closure / no re-render trigger:** Even when the sheet is re-opened, if React doesn't detect any prop/state change, it may skip re-rendering the sheet internals.

**Fix:** Wrap the record reads in `useMemo` with a re-render trigger. Add a `refreshKey` state that increments when the sheet opens (or use `open` as a dep in `useMemo`) so localStorage is always re-read on open. Both `DiagnosticsSheet.tsx` and `CurationDiagnosticsPage.tsx` need this fix.

Specifically:
- In `DiagnosticsSheet.tsx`: wrap the three `load*Record` calls in `useMemo` with `[open, challengeId]` deps so they re-execute every time the sheet opens.
- In `CurationDiagnosticsPage.tsx`: add a manual refresh counter or rely on existing `useMemo` deps — currently it uses `[challengeId]` which only changes if the route changes, never on re-visit. Add a timestamp-based key.

## Issue 2: 33 Accepted Sources but Digest Shows 22

**Root cause found:** The digest generation edge function (`generate-context-digest/index.ts`) applies THREE filters that reduce the accepted source count:

1. **Line 91:** `.in("extraction_status", ["completed", "partial"])` — Sources with `extraction_status = 'pending'` or `'failed'` are excluded.
2. **Line 92:** `.not("extraction_quality", "in", '("low","seed")')` — Low-quality and seed sources are excluded.
3. **Line 102:** `attachments.filter(hasRealContent)` — Sources without 200+ chars of text or 50+ chars of summary are excluded.

So the flow is: 33 accepted → some filtered by extraction status/quality → further filtered by `hasRealContent` → 22 usable.

**Fix:** The diagnostics panel should show this breakdown explicitly. The edge function already returns `total_accepted` and `skipped_empty` in the response (lines 319-320), but those values aren't persisted or displayed.

Add to the Discovery panel:
- Show "Accepted: 33" alongside "Usable for Digest: 22" with a note explaining the gap (extraction not completed, low quality, or insufficient content).
- Query the actual breakdown from `challenge_attachments` to show how many were filtered at each stage.

## Issue 3: Console Ref Warning on DiagnosticsAcceptancePanel

**Root cause:** `Collapsible` or `Sheet` tries to pass a ref to `DiagnosticsAcceptancePanel`, but it's a plain function component without `forwardRef`. Not a crash, but clutters logs.

**Fix:** Either wrap the component export with `React.forwardRef` or wrap the panel in a `<div>` inside the sheet to absorb the ref.

## Files to Change

| File | Change |
|------|--------|
| `DiagnosticsSheet.tsx` | Wrap `load*Record` calls in `useMemo` keyed on `[open, challengeId]` for reactivity |
| `CurationDiagnosticsPage.tsx` | Add refresh mechanism for `useMemo` deps on execution/acceptance records |
| `DiagnosticsDiscoveryPanel.tsx` | Add "Usable for Digest" count alongside accepted count, show filter breakdown |
| `useDiagnosticsData.ts` | Query additional attachment filter breakdown (pending extraction, low quality, no content) |
| `DiagnosticsAcceptancePanel.tsx` | Fix ref warning — wrap component or add `forwardRef` |

## No database changes required

