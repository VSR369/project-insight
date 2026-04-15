

# Fix: Diagnostics Close Button + Navigation Killing Wave Execution

## Two Issues

### Issue 1: No Close Button on Diagnostics
The diagnostics page has a back arrow but no explicit "Close" button. Simple addition.

### Issue 2: Navigating Away Kills Active Wave Execution
The wave executor's async loop lives inside `CurationReviewPage`'s component tree. Navigating to the diagnostics page (or using browser back) unmounts the component, killing Pass 2 mid-execution. When the user returns, the executor state is reset to idle — Pass 2 is abandoned and the wave progress panel disappears.

**Pass 1 data is NOT lost** — it's persisted in Zustand → localStorage. But the wave progress UI state (which wave completed, which errored) is ephemeral React state that disappears on unmount.

## Fix Strategy

### 1. Add Close Button to Diagnostics Page
Add an explicit "Close" button next to the back arrow in the diagnostics header bar.

### 2. Open Diagnostics in New Tab Instead of Same-Page Navigation
Change the "Diagnostics" link in `CurationRightRail` to open in a **new browser tab** (`window.open`). This prevents unmounting the curation page entirely — the wave executor keeps running undisturbed.

### 3. Warn Before Navigation During Active Waves
Add a `beforeunload` event listener and a React Router navigation blocker when `isWaveRunning` is true. This catches browser back button and any in-app navigation attempts, warning the user that leaving will abort the AI pipeline.

### 4. Persist Wave Progress Summary to localStorage
After each wave completes, write a lightweight summary (`{ waveNumber, status, sectionsCompleted, errors }`) to localStorage keyed by challenge ID. The diagnostics page and the curation page can read this on mount to restore the last known wave progress state — so even if the page was accidentally unmounted, the user sees what happened.

## Files to Change

| File | Change |
|------|--------|
| `src/pages/cogniblend/CurationDiagnosticsPage.tsx` | Add explicit "Close" button in header |
| `src/components/cogniblend/curation/CurationRightRail.tsx` | Change diagnostics link to open in new tab |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Add `beforeunload` listener when `isWaveRunning` is true |
| `src/hooks/cogniblend/useCurationWaveSetup.ts` | Persist wave progress summary to localStorage on wave completion |
| `src/hooks/cogniblend/useWaveExecutor.ts` | Write per-wave status to localStorage as each wave finishes |

## No Database Changes

All changes are client-side navigation and state persistence.

