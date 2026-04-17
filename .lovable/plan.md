
Current behavior in your screenshot is not the intended design. On Re-analyse, Diagnostics should clear stale Pass 1, Pass 2, Acceptance, and temporary QA/Discovery outputs first, then refill live from the new run. Only the historical telemetry trend should remain.

Why it is still showing old data
1. `CurationRightRail.tsx` passes Diagnostics a frozen section snapshot (`store.getState()` inside `useMemo`). That snapshot does not update when Re-analyse clears and rebuilds section review state, so old “Analysed / comments / principal” rows stay visible.
2. `DiagnosticsSheet.tsx` refreshes localStorage records only on open or browser `storage` events. Same-tab `localStorage.setItem/removeItem` does not fire `storage`, so Pass 1 / Pass 2 / Acceptance records do not refresh live while the drawer is already open.
3. DB-backed diagnostics panels (quality findings, discovery summary) are not gated during a fresh run, so cached prior-run data can remain visible until later waves finish.

Implementation plan
1. Make Diagnostics read live section state
- Replace the one-time `diagSections` snapshot with a subscribed store selector/helper so the drawer re-renders immediately when review status, comments, suggestions, and addressed flags are cleared or repopulated.
- Apply the same fix to the standalone diagnostics page if it is still used.

2. Make execution history refresh in the same tab
- Add a shared custom event in `waveExecutionHistory.ts`.
- Dispatch it from `saveExecutionRecord`, `saveAcceptanceRecord`, `clearAllExecutionRecords`, and `clearPass2ExecutionRecord`.
- Update `DiagnosticsSheet.tsx` and `CurationDiagnosticsPage.tsx` to listen to that event and bump `refreshKey` immediately, alongside the existing `storage` listener.

3. Blank stale “other data” during the new run
- Pass current wave/run status into Diagnostics.
- While a fresh Analyse run is active:
  - blank Pass 2 + Acceptance until new records exist
  - blank Discovery until the discovery wave completes
  - blank QA summary / consistency / ambiguity until the QA wave completes
- Show explicit waiting states like “Waiting for current run…” instead of prior cached data.
- Keep `ChallengeTelemetryPanel` unchanged because that history is intentionally preserved.

4. Keep the already-shipped fix
- `AICurationQualityPanel` reset is already wired via `cogni-quality-reset`; that is not the blocker shown in your attachment.

Files likely touched
- `src/components/cogniblend/curation/CurationRightRail.tsx`
- `src/components/cogniblend/diagnostics/DiagnosticsSheet.tsx`
- `src/pages/cogniblend/CurationDiagnosticsPage.tsx`
- `src/services/cogniblend/waveExecutionHistory.ts`
- small shared helper/hook if needed to keep file sizes under control

Verification
1. Keep Diagnostics open.
2. Click Re-analyse.
3. Confirm Pass 1 / Pass 2 / Acceptance old rows disappear immediately.
4. Confirm Pass 1 repopulates live wave-by-wave without closing the drawer.
5. Confirm Discovery and QA panels stay blank until their new-wave data is ready.
6. Confirm Telemetry still shows historical trend.
