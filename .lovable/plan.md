

## Status of Production-Readiness Plan

**Verified by re-reading code:**

| Phase | Status | Evidence |
|---|---|---|
| 0 — Audit `method='HUMAN'` migration | ✅ Done | Migration `20260420050859_…` exists; "Send to Legal" unblocked |
| 1 — Queue prefetch + N+1 SLA fix | ✅ Done | `CurationQueuePage.tsx` lines 270–274 batch `sla_timers`, lines 380–383 prefetch chunk + query, lines 533–534 `onMouseEnter`/`onFocus` |
| 2 — Master data → `CACHE_STATIC` | ✅ Done | `useCurationMasterData.ts` line 12 imports `CACHE_STATIC` and applies it to all 4 queries |
| 3 — Lazy modals/drawers | ✅ Done | `CurationReviewPage.tsx` lines 30–50 lazy-load `ContextLibraryDrawer`, `CuratorGuideModal`, `SendForModificationModal`, `PreFlightGateDialog` |
| 4 — PWA gate + freeze hook lazy-mount | ⚠️ **Partial** — PWA gate done (lines 120–135), but **freeze hooks still mounted at page level** (lines 54–55) |
| 5 — staleTime + idleCallback + skip legacy rewrite | ✅ Done | `useCurationPageData.ts` line 202 (`staleTime: 2*60_000`), `useCurationEffects.ts` lines 39–41 (modern shape skip), lines 87–92 (`requestIdleCallback`) |

**Outstanding work: Phase 4 part 2 only.**

---

## Plan — Complete Phase 4 (lazy-mount freeze hooks)

### Goal
Move `useFreezeForLegalReview` + `useAssembleCpa` out of `CurationReviewPage` (always mounted) into a small inner component that only mounts when the right rail's freeze panel actually renders. Eliminates 2 `useQueryClient()` subscriptions + 2 mutation observer registrations on every page mount.

### Single file: `src/pages/cogniblend/CurationReviewPage.tsx`

**Change 1** — Remove top-level mounts (lines 10, 54–55, 64–70):
- Delete `import { useFreezeForLegalReview, useAssembleCpa } from "@/hooks/cogniblend/useFreezeActions"`
- Delete `const freezeMut = useFreezeForLegalReview(...)`, `const assembleMut = useAssembleCpa(...)`
- Delete `handleFreezeForLegal` function

**Change 2** — Add a tiny inner wrapper component (~20 lines, same file, top-of-file before `CurationReviewPage`):
```tsx
function FreezeForLegalAction({
  challengeId, userId, children,
}: {
  challengeId: string;
  userId: string | undefined;
  children: (handler: () => Promise<void>) => React.ReactNode;
}) {
  const freezeMut = useFreezeForLegalReview(challengeId);
  const assembleMut = useAssembleCpa(challengeId);
  const handler = async () => {
    if (!userId) return;
    try {
      await freezeMut.mutateAsync(userId);
      await assembleMut.mutateAsync(userId);
    } catch { /* handled in onError */ }
  };
  return <>{children(handler)}</>;
}
```

**Change 3** — Wrap the right-rail call site (around line 363) using render-prop pattern so `onFreezeForLegal` continues to receive a stable callable:
```tsx
<FreezeForLegalAction challengeId={o.challengeId!} userId={o.user?.id}>
  {(handleFreezeForLegal) => (
    <CurationRightRail
      …existing props…
      onFreezeForLegal={handleFreezeForLegal}
    />
  )}
</FreezeForLegalAction>
```

### Impact
- `useFreezeForLegalReview` / `useAssembleCpa` only initialize **after** the page passes loading/PWA gates and the right-rail subtree commits → matches the original Phase 4 spec.
- "Send to Legal" button behavior identical: same RPC chain, same toast, same query invalidations.
- Zero changes to `CurationRightRail` props contract, AI hooks, autosave, RLS, or any RPC.

### Risk
Very low — mechanical refactor confined to one file. Render-prop preserves the exact handler signature `CurationRightRail` already consumes.

### Test gate (after Phase 4 closes)
1. Open `/cogni/curation/25ca71a0…` → page loads, right rail visible.
2. Click "Send to Legal" → toast `Challenge frozen for legal review` → DB `curation_lock_status='FROZEN'`.
3. AI Pass 1 + Pass 2 + autosave smoke test (regression check).

After this, **all 5 phases close** and the curation module is production-ready per the approved plan.

