
# Fix My Challenges View — Governance-Aware UI

## Problems

1. **CurationProgressTracker shows for QUICK mode** — Line 117-120 of `CreatorChallengeDetailView.tsx` renders the tracker for any phase 2-3 challenge without checking governance mode. QUICK has no Curator role.

2. **Status messages wrong for QUICK** — "In Curation" appears for QUICK challenges at phase >1 in both the detail view (line 53) and the list page (`getStatusConfig` line 46-48).

3. **Dashboard routes to wrong URL** — `MyChallengesSection.tsx` line 297 navigates to `/cogni/challenges/${id}` (old manage screen) instead of `/cogni/challenges/${id}/view`.

4. **ProgressDetailCard fabricates curator status** — When no `curation_progress` row exists, it still renders "Submitted — waiting for Curator to begin" (fallback on line 57-63 of `ProgressDetailCard.tsx`).

## Changes

### File 1: `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx`

**A) Gate CurationProgressTracker on non-QUICK + actual curation phase:**
```
// Line 117-120: Add isQuickMode check
{!isQuickMode && data.current_phase != null && data.current_phase >= 2
  && data.current_phase <= 3 && data.phase_status !== 'CR_APPROVAL_PENDING' && (
  <CurationProgressTracker challengeId={challengeId} />
)}
```

**B) Governance-aware status messages (line 49-57):**
```
const statusMessage = useMemo(() => {
  const phase = data.current_phase ?? 1;
  if (phase === 1) return 'Draft — complete your challenge and submit';
  if (isQuickMode) {
    if (phase >= 4) return 'Published — waiting for solver submissions';
    return 'Processing — your challenge is being prepared for publication';
  }
  if (phase === 2) return 'In Curation — Curator is reviewing and enriching your challenge';
  if (phase === 3) return 'Compliance Review — Legal and financial review in progress';
  if (phase >= 4) return 'Published — your challenge is live!';
  return '';
}, [data.current_phase, isQuickMode]);
```

### File 2: `src/pages/cogniblend/MyChallengesPage.tsx`

**Update `getStatusConfig` to accept governance mode and produce correct labels:**

Add `governanceMode` parameter. For QUICK mode + IN_PREPARATION + phase > 1, show "Processing" instead of "In Curation":

```typescript
function getStatusConfig(
  masterStatus: string,
  phase: number,
  phaseStatus?: string | null,
  governanceMode?: string,
): StatusConfig {
  if (phaseStatus === 'CR_APPROVAL_PENDING') {
    return { label: 'Awaiting Your Approval', icon: AlertCircle, badgeClass: '...' };
  }
  if (masterStatus === 'IN_PREPARATION' && phase === 1) {
    return { label: 'Draft', icon: Pencil, badgeClass: '...' };
  }
  if (masterStatus === 'IN_PREPARATION') {
    if (governanceMode === 'QUICK') {
      return { label: 'Processing', icon: Clock, badgeClass: 'bg-blue-50 text-blue-700 border-blue-300' };
    }
    return { label: 'In Curation', icon: Clock, badgeClass: '...' };
  }
  // ... rest unchanged
}
```

Pass governance mode from `ChallengeCard`:
```typescript
const governanceMode = ch.governance_mode_override ?? ch.governance_profile;
const statusConfig = getStatusConfig(ch.master_status, ch.current_phase, ch.phase_status, governanceMode?.toUpperCase());
```

### File 3: `src/components/cogniblend/dashboard/MyChallengesSection.tsx`

**Fix routing** — Line 297, change:
```
onClick={() => navigate(`/cogni/challenges/${item.challenge_id}`)}
```
to:
```
onClick={() => navigate(`/cogni/challenges/${item.challenge_id}/view`)}
```

**Add governance-aware status label** — Update the status label span (line 264-265) to show "Processing" for QUICK mode instead of "In Preparation":
```typescript
const isQuick = (item.governance_mode_override ?? item.governance_profile)?.toUpperCase() === 'QUICK';
const statusLabel = isQuick && item.master_status === 'IN_PREPARATION' && item.current_phase > 1
  ? 'Processing'
  : (STATUS_LABEL[item.master_status] ?? item.master_status);
```

### File 4: `src/components/cogniblend/progress/CurationProgressTracker.tsx`

**Don't render when no progress data exists:**
```typescript
// After isLoading check, add:
if (!isLoading && !progress) {
  return null; // No curation_progress row — don't fabricate status
}
```

## Files touched: 4
## Lines per file: all remain under 200
## No new files needed
