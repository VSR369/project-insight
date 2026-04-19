

## Sprint 5 — Creator Approval Enhancement

Build a Creator review/approve workflow with new DB columns + table, a new page, supporting hook/components, and minimal edits to MyChallengesPage and the two Pass 3 panels.

### Files

| # | File | Type | Lines |
|---|---|---|---|
| 1 | New migration | CREATE | SQL |
| 2 | `src/hooks/cogniblend/useCreatorReview.ts` | CREATE | ~220 |
| 3 | `src/pages/cogniblend/CreatorChallengeReviewPage.tsx` | CREATE | ~240 |
| 4 | `src/components/cogniblend/creator/RequestRecurationModal.tsx` | CREATE | ~120 |
| 5 | `src/components/cogniblend/creator/Pass3StaleAlert.tsx` | CREATE | ~60 |
| 6 | `src/components/cogniblend/creator/CreatorApprovalStatusBanner.tsx` | CREATE | ~80 |
| 7 | `src/pages/cogniblend/MyChallengesPage.tsx` | MODIFY | +6 (route branch) |
| 8 | `src/components/cogniblend/legal/CuratorLegalReviewPanel.tsx` | MODIFY | +stale alert + clear-stale on re-run |
| 9 | `src/hooks/cogniblend/useCuratorLegalReview.ts` | MODIFY | read+clear `pass3_stale` |
| 10 | `src/components/cogniblend/lc/LcPass3ReviewPanel.tsx` | MODIFY | +stale alert |
| 11 | `src/hooks/cogniblend/useLcPass3Review.ts` | MODIFY | read+clear `pass3_stale` |
| 12 | `src/App.tsx` | MODIFY | +1 route |

> Naming note: a file already exists at `src/components/cogniblend/curation/CreatorApprovalStatusBanner.tsx` (different concern — preferences banner). To avoid confusion I'll place the new one under `creator/` (matches Part D path). Both can coexist.

### Migration (Part A)

- New table `challenge_edit_history` with columns/indexes/RLS exactly per spec. RLS uses existing `user_challenge_roles` (verified — same pattern as other tables).
- `ALTER challenges ADD COLUMN IF NOT EXISTS` × 5: `creator_approval_status` (CHECK), `creator_approval_requested_at`, `creator_approved_at`, `creator_approval_notes`, `pass3_stale BOOLEAN DEFAULT false`. All nullable / safely defaulted — zero impact on existing rows.

### Hook design (`useCreatorReview`)

- Single React Query `['creator-review', challengeId]` fetching challenge (preview field set, similar to `usePreviewData`), org, legal docs (UNIFIED_SPA accepted only), digest, attachments. Reuses `usePreviewData`'s sub-queries via direct composition rather than re-implementing — calls existing `usePreviewData(challengeId)` and additionally fetches the approval/stale columns + roles.
- Verify CR role via existing `useUserChallengeRoles`.
- Constants: `CREATOR_EDITABLE_SECTIONS`, `AGG_RESTRICTED_SECTIONS` exported for use by the page's `canEditSection` callback.
- Local state: `editedSections` (Record<string, unknown>) accumulating Creator edits, `showLegalToggle` for AGG opt-in.
- Mutations:
  - `acceptAll()` → update `creator_approval_status='approved'`, `creator_approved_at=now()`; invalidate; toast.
  - `submitEdits()` → for each entry in `editedSections`, insert `challenge_edit_history` row with `before_value`/`after_value`; update challenge columns; set `creator_approval_status='changes_submitted'`, `pass3_stale=true`; invalidate.
  - `requestRecuration(reason)` → update `creator_approval_status='changes_requested'`, `creator_approval_notes=reason`; invalidate.
- Computed: `isApproved`, `canEdit`, `legalDocHtml`, `showLegalDocs`, `timeoutDate`, `isTimedOut`, `isAGG`.
- All mutations use `withUpdatedBy`, errors via `handleMutationError`.

### Page (`CreatorChallengeReviewPage`)

- Route guard: redirect to `/cogni/my-challenges` if not authenticated; show "Access Denied" if no CR role; show "not awaiting approval" message if `creator_approval_status !== 'pending'` AND not approved.
- Header: back link, title, status badge from `getStatusConfig`, 7-day countdown using `timeoutDate`.
- `Pass3StaleAlert` shown when `pass3_stale === true`.
- `CreatorApprovalStatusBanner` reflecting current status.
- Sticky action row (top) and footer row (bottom): Accept All / Submit with Edits (enabled only when `Object.keys(editedSections).length > 0`) / Request Re-curation.
- `<PreviewDocument />` reused with `canEditSection={(k) => CREATOR_EDITABLE_SECTIONS.has(k) && !(isAGG && AGG_RESTRICTED_SECTIONS.has(k))}`. Inline edits already write to DB via `PreviewDocument`'s built-in editor; the page additionally tracks edited keys to enable the "Submit with Edits" branch and to write history rows on submit.
- Legal section: MP → always render Card with `LegalDocEditorPanel readOnly`; AGG → Switch toggle; if no `UNIFIED_SPA accepted` row → muted "being prepared by the Curator" message.
- After approval: green banner "You approved this challenge on [date]"; all action buttons disabled.

### Pass 3 panel modifications

- Both `useCuratorLegalReview` and `useLcPass3Review`: extend query to also fetch `pass3_stale` from `challenges` (separate small query keyed on `['pass3-stale', challengeId]` to keep doc query tight). Add `isStale` to return value. Modify `runPass3` mutation `onSuccess` to clear `challenges.pass3_stale = false` (best-effort, ignore error to not block).
- Both panels: when `isStale && pass3Status === 'completed'`, render `Pass3StaleAlert` above the AI Summary with the "Click 'Re-run Pass 3'" copy.

### MyChallengesPage edit

Update `onView` to branch on `phase_status === 'CR_APPROVAL_PENDING'` → `/cogni/challenges/:id/creator-review`. The "Review & Approve" button already exists in the card (line 341); just change its destination by routing through the new `onView`. QUICK challenges never get `CR_APPROVAL_PENDING`, so behavior is unchanged for them.

### App.tsx edit

Add one route inside the existing cogni block:
```tsx
<Route path="/cogni/challenges/:id/creator-review" element={<LazyRoute><CreatorChallengeReviewPage /></LazyRoute>} />
```
Plus the lazy import at the top.

### Safety guarantees

- QUICK mode: Creator approval is never triggered server-side (no `CR_APPROVAL_PENDING`), so route is unreachable; if directly visited, the "not awaiting approval" guard renders.
- ChallengeManagePage / ChallengePreviewPage / Pass 1 / Pass 2 / Accept All flows: zero touch.
- `PreviewDocument` already supports `canEditSection` (verified line 32, 149) — no changes needed.
- `LegalDocEditorPanel` (the cogniblend one, verified) supports `readOnly` and uses `legal-document.css`.
- All new files < 250 lines via hook/component decomposition.
- Audit trail logging deferred (RPC `log_audit_event` not verified present); mutations use `created_by` via `withCreatedBy` for `challenge_edit_history` instead. If `audit_trail` insert is required, will add as a best-effort call.

### Out of scope

- 7-day timeout enforcement automation (a `pg_cron` job to flip `timeout_override`) — UI shows the countdown only.
- Curator-side "override timeout" action — separate sprint.
- Notification dispatch on approval state changes.

