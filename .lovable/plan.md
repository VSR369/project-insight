

## Sprint 3 — Curator Pass 3 UX (STRUCTURED Mode)

Wires Sprint 1 components + Sprint 2 backend into the Curation Review page. Three new files, two minimal edits. QUICK mode untouched.

### Files

| # | File | Type | Lines | Purpose |
|---|---|---|---|---|
| 1 | `src/hooks/cogniblend/useCuratorLegalReview.ts` | CREATE | ~150 | Pass 3 query + 3 mutations (run/save/accept) |
| 2 | `src/components/cogniblend/legal/CuratorLegalReviewPanel.tsx` | CREATE | ~220 | Idle/Running/Completed/Error UI with TipTap editor |
| 3 | `src/pages/cogniblend/CurationReviewPage.tsx` | MODIFY | +12 | Add panel below CuratorCpaReviewPanel, gated by `govMode !== 'QUICK'` AND `current_phase === 2` |
| 4 | `src/pages/cogniblend/CurationChecklistPanel.tsx` | MODIFY | +25 | Add Pass 3 query, V-CR-6 submit gate, conditional 14th checklist item |

### Hook design (`useCuratorLegalReview`)

- Query `['pass3-legal-review', challengeId]` → `challenge_legal_docs` filtered by `document_type='UNIFIED_SPA'`, returns `{ai_review_status, content_html, ai_modified_content_html, ai_changes_summary, ai_confidence, ai_regulatory_flags}` or null.
- `pass3Status` derived: `null/pending` → `'idle'`, `'ai_suggested'/'accepted'` → `'completed'`, mutation pending → `'running'`, mutation error → `'error'`.
- `runPass3`: invokes edge function with `{ challenge_id, pass3_mode: true }`; invalidates query; sonner toast.
- `saveEdits(html)`: updates the row's `ai_modified_content_html` (preserves original `content_html`); invalidates.
- `acceptPass3`: updates `ai_review_status='accepted'`, `lc_status='approved'`, `lc_reviewed_by`, `lc_reviewed_at`; invalidates both `pass3-legal-review` and `pass3-complete-check` keys (so checklist gate clears immediately).
- All mutations use `withUpdatedBy` per project standards; errors via `handleMutationError` if available, else sonner.

### Panel design (`CuratorLegalReviewPanel`)

- Card with Shield icon + "Legal Review — Pass 3" title.
- Branches on `pass3Status`: idle (CTA), running (Loader2), completed (summary Alert + confidence Badge + flags + TipTap editor + action row), error (destructive Alert + Retry).
- Toolbar row: `LegalDocEditorToolbar` + `LegalDocQuickInserts` + `LegalDocUploadHandler` (hasExistingContent={true}).
- Editor: `LegalDocEditorPanel` controlled, readOnly when accepted. Local `editedHtml` state seeded from hook; "Save Draft" passes it to `saveEdits`.
- Section nav (`LegalDocSectionNav`) shown alongside as a left-rail when completed (single-doc view, navigates by anchor scroll within document).
- Stays under 250 lines by delegating all data work to the hook.

### CurationReviewPage edit

Insert AFTER closing `</div>` of the `lg:grid-cols-4` block (line 378), BEFORE `MODALS & OVERLAYS` comment (line 380):

```tsx
{/* Pass 3: Legal AI Review — STRUCTURED/CONTROLLED only */}
{((o.challenge as any)?.governance_mode_override ?? o.challenge?.governance_profile ?? 'QUICK')
  .toUpperCase() !== 'QUICK' &&
  (o.challenge?.current_phase ?? 0) === 2 && (
    <CuratorLegalReviewPanel challengeId={o.challengeId!} />
  )}
```

Plus one import. Zero changes to existing JSX.

### CurationChecklistPanel edit

1. Add Pass 3 query before `governanceMode` line:
   ```ts
   const { data: pass3Complete = false } = useQuery({
     queryKey: ['pass3-complete-check', challengeId],
     queryFn: async () => {
       const { data } = await supabase
         .from('challenge_legal_docs')
         .select('ai_review_status')
         .eq('challenge_id', challengeId)
         .eq('document_type', 'UNIFIED_SPA')
         .eq('ai_review_status', 'accepted')
         .maybeSingle();
       return !!data;
     },
     enabled: !!challengeId, staleTime: 10_000,
   });
   ```

2. Convert `CHECKLIST_LABELS` and `autoChecks` to `useMemo`-derived arrays that conditionally append the Pass 3 item when `governanceMode !== 'QUICK'`:
   - QUICK → 13 items (unchanged)
   - STRUCTURED/CONTROLLED → 14 items, last = "Legal AI review completed (Pass 3)" / `pass3Complete`

3. In `handleSubmitClick`, BEFORE the `!allComplete` check:
   ```ts
   if (governanceMode !== 'QUICK' && !pass3Complete) {
     toast.error('Legal AI Review (Pass 3) must be completed before submission. Please review the Legal Review panel below.');
     return;
   }
   ```

No other behavior touched. Modal/return/audit logic identical.

### Safety guarantees

- `govMode !== 'QUICK'` gate at every entry point — QUICK challenges never see panel, never get 14th item, never hit V-CR-6 gate.
- `current_phase === 2` gate ensures panel only renders during curation, not after.
- LC workspace's "Generate Legal Docs" call sends `{ challenge_id }` only — `pass3_mode` stays `undefined`, legacy edge function path runs byte-identically.
- Pass 1 / Pass 2 / Accept All / wave execution code: zero touch.
- All files < 250 lines; layer separation respected (component → hook → supabase).
- React Query cache invalidation links: panel acceptance → checklist gate clears within one render.

### Out of scope

- No edge function changes (already handled in Sprint 2).
- No CONTROLLED-mode LC handoff (Sprint 4).
- No section-level diff visualization (single unified doc).
- No PDF export of the unified SPA.

