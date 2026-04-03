
# Plan: Three Fixes — Seed Snapshot, Curator Version Visibility, Context Digest

## Issues Identified

### Issue 1: Creator Snapshot Missing in Seed Data
**Root cause**: The `setup-test-scenario` edge function creates challenges via direct INSERT without setting `creator_snapshot`. The "My Version" tab reads from this field and shows a fallback when NULL.

**Fix**: Add `creator_snapshot` JSONB to both challenge INSERTs in `supabase/functions/setup-test-scenario/index.ts` (lines 319-352 for MP, lines 359-394 for AGG), built from the same data already in the INSERT. Redeploy edge function.

### Issue 2: Curator Version Tab Shown Too Early
**Root cause**: In `CreatorChallengeDetailView.tsx` line 127, the Curator Version content is shown when `current_phase > 3` OR `(current_phase === 3 && phase_status === 'COMPLETED')` OR `isPendingApproval`. Since the phase numbering is now corrected (Phase 2 = Curation), the condition needs updating.

**Business rules**:
- If `creator_approval_required` toggle is YES → Curator Version shown only when `phase_status === 'CR_APPROVAL_PENDING'` (curator explicitly sends for approval)
- If toggle is NO → Curator Version shown when curator submits to next phase (i.e., `current_phase >= 3`)
- The toggle already exists in `StepModeSelection.tsx` as `creator_approval_required` field in `extended_brief`
- The toggle is forced ON for CONTROLLED, optional for MP/STRUCTURED, shown only for MP model currently

**Fix**: Update `CreatorChallengeDetailView.tsx` to:
1. Read `extended_brief.creator_approval_required` from challenge data
2. Show Curator Version content when: `isPendingApproval` OR `current_phase >= 4` (published) OR (`current_phase >= 3 && !crApprovalRequired`) — i.e., curator has submitted to compliance and approval wasn't required
3. Show the "Under Review" placeholder otherwise

Also: The toggle is currently MP-only (`selectedModel === 'MP'`). Per governance rules, CONTROLLED should always require it (already forced), and STRUCTURED should also offer it. Expand visibility to all models.

### Issue 3: Context Digest Says "Not Generated Yet" After Accepting Sources
**Root cause**: Accepting sources does NOT auto-trigger digest generation. The user must click "Regenerate" in the DigestPanel after accepting sources. The UX is confusing — the digest should auto-generate when sources are first accepted.

**Fix**: In `useContextLibrary.ts`, after `useAcceptSuggestion` and `useAcceptMultipleSuggestions` succeed, auto-trigger the `generate-context-digest` edge function if no digest exists yet. This avoids the user needing to manually click "Regenerate" the first time.

---

## Files Changed

| # | File | Change |
|---|------|--------|
| 1 | `supabase/functions/setup-test-scenario/index.ts` | Add `creator_snapshot` to both challenge INSERTs |
| 2 | `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx` | Update Curator Version visibility logic to respect `creator_approval_required` toggle and corrected phase numbers |
| 3 | `src/hooks/cogniblend/useContextLibrary.ts` | Auto-trigger digest generation after accepting sources |
| 4 | `src/components/cogniblend/challenge-wizard/StepModeSelection.tsx` | Show Creator Approval toggle for all engagement models (not just MP) |

## Technical Details

### Seed Snapshot (File 1)
Add to MP challenge INSERT (~line 340):
```typescript
creator_snapshot: {
  title: "Predictive Maintenance for Smart Manufacturing",
  problem_statement: "Our manufacturing floor experiences unplanned equipment failures...",
  scope: "The solution should: (1) integrate with existing SCADA...",
  budget_min: 25000, budget_max: 75000, currency: "USD",
  reward_structure: { currency: "USD", budget_min: 25000, budget_max: 75000 },
  expected_timeline: "3-6",
},
```
Same pattern for AGG challenge with its own data.

### Curator Version Gate (File 2)
Replace line 127 condition:
```typescript
const crApprovalRequired = (data as any).extended_brief?.creator_approval_required !== false;
const showCuratorContent = isPendingApproval
  || (data.current_phase ?? 1) >= 4
  || ((data.current_phase ?? 1) >= 3 && !crApprovalRequired);
```
Then use `showCuratorContent` instead of the inline ternary.

### Auto-Digest (File 3)
In `useAcceptSuggestion` and `useAcceptMultipleSuggestions` `onSuccess`, add:
```typescript
// Auto-generate digest if none exists
const existing = qc.getQueryData(KEYS.digest(challengeId));
if (!existing) {
  supabase.functions.invoke('generate-context-digest', {
    body: { challenge_id: challengeId },
  }).then(() => invalidateAll(qc, challengeId));
}
```
