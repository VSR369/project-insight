

# Dual-Mode Wave Progress Panel — Pass 1 (Analyse) + Pass 2 (Generate Suggestions)

## Problem

The `WaveProgressPanel` currently shows identical status labels for both Pass 1 and Pass 2. When "Generate Suggestions" runs, sections still show "Reviewed" / "Drafted" — but the user expects Pass 2-specific labels like "Suggestions Generated". There's no visual distinction between the two passes.

## Architecture Finding

Both passes share the same `WaveProgress` type and the same panel. The `waveProgress` prop in `CurationRightRail` switches between executors based on which is running (line 180-184 of `useCurationWaveSetup.ts`), but no `passType` metadata is passed to the panel.

## Changes

### 1. Add `passType` to WaveProgressPanel

**File:** `src/components/cogniblend/curation/WaveProgressPanel.tsx`

Add a `passType?: 'analyse' | 'generate'` prop. Use it to change:

- **Header**: "AI Review" → "AI Analysis" (Pass 1) or "Generating Suggestions" (Pass 2)
- **Section action labels**:

| Pass 1 (Analyse) | Pass 2 (Generate) |
|---|---|
| Reviewed · 3 comments | Suggestions Generated · 3 |
| Drafted · 2 comments | Content Drafted · 2 suggestions |
| Skipped | Skipped |
| Error | Error |

- **Summary badges**: "Reviewed" → "Analysed" (Pass 1), "Suggestions" (Pass 2)

The `SectionActionLabel` component will branch on `passType` to show contextually correct labels. The `SectionStatusIcon` stays the same (icons are universal).

### 2. Thread `passType` from executor to panel

**File:** `src/hooks/cogniblend/useCurationWaveSetup.ts`

Expose a derived `currentPassType` value:
- If `pass1Executor.isRunning` → `'analyse'`
- If `pass2Executor.isRunning` → `'generate'`
- If completed, remember which ran last (via a `useRef`)

**File:** `src/hooks/cogniblend/useCurationPageOrchestrator.ts`

Pass `currentPassType` through to CurationReviewPage.

**File:** `src/components/cogniblend/curation/CurationRightRail.tsx`

Accept `passType` prop, forward to `WaveProgressPanel`.

### 3. Add suggestion counts alongside comment counts

**File:** `src/components/cogniblend/curation/CurationRightRail.tsx`

Compute `suggestionCounts` from the curation store — count sections where `aiSuggestion` is non-null. Pass to `WaveProgressPanel` as `suggestionCounts` prop.

**File:** `src/components/cogniblend/curation/WaveProgressPanel.tsx`

Accept optional `suggestionCounts` prop. In Pass 2 mode, display suggestion count per section instead of comment count.

```text
Pass 1 expanded section row:
  ✅ Problem Statement — Analysed · 💬 3 comments

Pass 2 expanded section row:
  ✅ Problem Statement — Suggestions Generated · ✨ 3
  ✅ Scope — Content Drafted · ✨ 2 suggestions
  ⏭  Organization Context — Skipped
  ❌ Deliverables — Error
```

## Files to Change

| File | Change |
|------|--------|
| `src/components/cogniblend/curation/WaveProgressPanel.tsx` | Add `passType` + `suggestionCounts` props; branch labels/header by pass |
| `src/hooks/cogniblend/useCurationWaveSetup.ts` | Expose `currentPassType` derived from active executor |
| `src/hooks/cogniblend/useCurationPageOrchestrator.ts` | Thread `currentPassType` |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Pass `passType` to right rail |
| `src/components/cogniblend/curation/CurationRightRail.tsx` | Accept `passType`, compute `suggestionCounts`, forward both |

## No Database Changes

All data already exists in the curation store (`aiComments`, `aiSuggestion`). This is purely a UI labeling enhancement.

