

# Implement: Acceptance Tracking Panel + Preview Refresh

## Three deliverables

### 1. Acceptance Record Persistence (`waveExecutionHistory.ts`)
Add new types and helpers for tracking "Accept All" outcomes per section:

```typescript
interface AcceptanceSectionResult {
  sectionId: SectionKey;
  status: 'updated' | 'failed';
  errorMessage?: string;
}

interface AcceptanceRecord {
  challengeId: string;
  overallStatus: 'completed' | 'partial' | 'failed';
  sections: AcceptanceSectionResult[];
  acceptedAt: string;
  totalUpdated: number;
  totalFailed: number;
}
```

Functions: `saveAcceptanceRecord`, `loadAcceptanceRecord` — localStorage keyed as `wave-accept-${challengeId}`.

### 2. Track per-section success/failure during bulk accept (`useCurationPageOrchestrator.ts`)

Wrap each section save in try/catch to track individual outcomes instead of failing the entire batch:

- For each regular section: try `handleAcceptRefinement` → record "updated" or "failed"
- For extended brief batch: if the batch write succeeds, mark all as "updated"; if it fails, mark all as "failed"
- After the loop, persist an `AcceptanceRecord` via `saveAcceptanceRecord`
- **Also invalidate `['challenge-preview', challengeId]`** before navigating to preview — this is the preview staleness fix

### 3. New Diagnostics Panel (`DiagnosticsAcceptancePanel.tsx`)

A collapsible panel showing per-section acceptance status:

| Section | Status |
|---------|--------|
| Problem Statement | ✓ Updated |
| Scope | ✗ Failed |
| Expected Outcomes | ✓ Updated |

- Header: "Acceptance Status" with badge (completed/partial/failed)
- Timestamp of when acceptance ran
- Summary counts: `{n} Updated · {n} Failed`
- When no acceptance record exists: "Accept All has not been run yet."

Integrate into `DiagnosticsSheet.tsx` and `CurationDiagnosticsPage.tsx` as a fourth panel after Pass 2.

## Files

| File | Change |
|------|--------|
| `src/services/cogniblend/waveExecutionHistory.ts` | Add `AcceptanceRecord` type, `saveAcceptanceRecord`, `loadAcceptanceRecord` |
| `src/hooks/cogniblend/useCurationPageOrchestrator.ts` | Track per-section outcomes, persist record, invalidate `challenge-preview` query |
| `src/components/cogniblend/diagnostics/DiagnosticsAcceptancePanel.tsx` | **New** — Collapsible panel rendering acceptance results |
| `src/components/cogniblend/diagnostics/DiagnosticsSheet.tsx` | Load acceptance record, render new panel |
| `src/pages/cogniblend/CurationDiagnosticsPage.tsx` | Load acceptance record, render new panel |

## No database changes

All persistence via localStorage. Preview refresh via React Query cache invalidation.

