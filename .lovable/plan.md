

## Add Wave 7 — Discover Contextual Sources to Progress Panel

### Problem
When "Analyse Challenge" runs, the progress panel shows waves 1-6 completing, then jumps to "complete" — but the context discovery step that follows is invisible. The user has no feedback that discovery is running, and the progress bar shows 100% prematurely.

### Approach
Add Wave 7 as a virtual "discovery" wave that only appears during the Analyse flow (Pass 1). It is not part of the AI review executor — instead, `handleAnalyse` manually injects it into the progress state around the `discover-context-resources` call.

### Changes

**1. `src/lib/cogniblend/waveConfig.ts`**
- Add `DISCOVERY_WAVE_NUMBER = 7` constant
- Add `createInitialWaveProgressWithDiscovery()` that returns 7 waves (the 6 review waves + a Wave 7 entry with name "Discover Contextual Sources", empty sections array)
- Export the constant so other files can reference it

**2. `src/hooks/useWaveExecutor.ts`**
- Expose `setWaveProgress` in the return type (rename to `updateWaveProgress`) so the caller can inject Wave 7 state changes externally
- Add it to `UseWaveExecutorReturn` interface

**3. `src/hooks/cogniblend/useCurationWaveSetup.ts`**
- Expose `pass1SetWaveProgress` from `pass1Executor.updateWaveProgress` in the return object
- Pass it through to `useCurationAIActions`

**4. `src/hooks/cogniblend/useCurationAIActions.ts` — `handleAnalyse`**
- Before calling `executeWavesPass1()`, override the initial progress to use the 7-wave variant via `pass1SetWaveProgress`
- After `executeWavesPass1()` completes (waves 1-6 done), set Wave 7 to `running`
- After `discover-context-resources` succeeds/fails, set Wave 7 to `completed` or `error`
- Only then set `overallStatus: 'completed'`

**5. `src/hooks/cogniblend/useCurationPageOrchestrator.ts`**
- Thread `pass1SetWaveProgress` from `waveSetup` into `useCurationAIActions` options

### No changes needed
- `WaveProgressPanel.tsx` — already renders dynamically from whatever waves are in the progress object
- `createInitialWaveProgress()` — untouched (used by Pass 2 and Full executors which don't need Wave 7)

### Technical Detail
Wave 7 has an empty `sections` array since discovery isn't section-based. The `WaveProgressPanel` already handles this gracefully — it shows the wave name and status icon without section counts when there are no sections.

