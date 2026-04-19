

## Sprint 4 — LC Refactor + Pass 3 Wiring

Decompose the 1,358-line `LcLegalWorkspacePage.tsx` into 7 small files plus a thin orchestrator, and add the Pass 3 unified-SPA panel for the LC role.

### Files

| # | File | Type | Lines | Purpose |
|---|---|---|---|---|
| 1 | `src/lib/cogniblend/lcLegalHelpers.ts` | CREATE | ~110 | `IP_MODEL_LABELS`, `DOCUMENT_TYPES`, `FILE_UPLOAD_CONFIG`, types `SuggestedDoc`/`DocEditState`/`AttachedDoc`, `renderJsonList`, `renderEvalCriteria`, `parseRewardStructure` |
| 2 | `src/hooks/cogniblend/useLcLegalData.ts` | CREATE | ~100 | `useChallengeForLC`, `useAttachedLegalDocs`, `usePersistedSuggestions` (typed return — no `any`) |
| 3 | `src/hooks/cogniblend/useLcPass3Review.ts` | CREATE | ~150 | Mirror of `useCuratorLegalReview` for LC: query, `runPass3`, `saveEdits`, `acceptPass3`. Same `pass3-legal-review` query key so cache is shared. |
| 4 | `src/components/cogniblend/lc/LcChallengeDetailsCard.tsx` | CREATE | ~230 | Read-only Accordion (Overview, Deliverables, Evaluation, IP/Governance/Reward, Solver) |
| 5 | `src/components/cogniblend/lc/LcAttachedDocsCard.tsx` | CREATE | ~120 | Attached docs list with delete `AlertDialog` |
| 6 | `src/components/cogniblend/lc/LcAiSuggestionsSection.tsx` | CREATE | ~240 | Generate CTA + loading/error + collapsible suggestion cards (Textarea + FileUploadZone + Accept/Save/Dismiss) |
| 7 | `src/components/cogniblend/lc/LcPass3ReviewPanel.tsx` | CREATE | ~220 | TipTap-based unified SPA panel (idle/running/completed/error) |
| 8 | `src/components/cogniblend/lc/LcAddDocumentForm.tsx` | CREATE | ~180 | Manual add-doc form (extracted to keep page <300 lines) |
| 9 | `src/pages/cogniblend/LcLegalWorkspacePage.tsx` | REWRITE | ~240 | Thin orchestrator: hooks at top, conditional returns, JSX composition |

### Hook design (`useLcPass3Review`)

Identical contract to `useCuratorLegalReview` (Sprint 3) — same `['pass3-legal-review', challengeId]` key, same mutations (`runPass3`, `saveEdits`, `acceptPass3`), same derived `pass3Status` / `isPass3Complete`. Reusing the same key means if both Curator and LC view the same challenge in different sessions, cache stays consistent.

### Panel design (`LcPass3ReviewPanel`)

Same four-state pattern as `CuratorLegalReviewPanel`:
- **Idle** → Shield card + "Run Pass 3 AI Review" CTA + explainer
- **Running** → Loader2 + status text
- **Completed** → AI summary Alert + confidence Badge + regulatory flags + `LegalDocEditorToolbar` + `LegalDocQuickInserts` + `LegalDocUploadHandler` + `LegalDocEditorPanel` + Save Draft / Re-run / Accept buttons; after accept → green "Approved ✓" badge with read-only editor
- **Error** → destructive Alert + Retry

### Page composition order (LcLegalWorkspacePage)

```
Header (inline, ~20 lines)
WorkflowProgressBanner step={3}
<LcChallengeDetailsCard challenge={…} />
<AssembledCpaSection challengeId={…} />        ← unchanged
<LcAttachedDocsCard … />
{isLC && <LcPass3ReviewPanel challengeId={…} />}  ← NEW
<LcAiSuggestionsSection … />                    ← existing flow, untouched
{isLC && <LcAddDocumentForm … />}
GATE-02 banners + pending warning + submit Card with <LcReturnToCurator/>, <LcApproveAction/>, Submit button
```

### What stays in the page (orchestrator only)

- All `useState` for generate / docEdits / openCards / submit / addDoc form state
- All mutations (`acceptDocMutation`, `deleteDocMutation`, `dismissSuggestionMutation`, `handleGenerate`, `handleSaveContent`, `handleAddNewDoc`, `handleSubmitToCuration`)
- Conditional returns for `challengeLoading`, PWA gate, access denied
- Final submit Card with `gateFailures` + pending suggestions Alert + `LcReturnToCurator` + `LcApproveAction` + Submit button

State and handlers passed down as props. No business logic moves into components.

### Backward-compatibility guarantees

- "Generate Legal Documents" button still calls edge function with `{ challenge_id }` (no `pass3_mode`) → legacy flow unchanged.
- Individual doc Accept/Save/Dismiss/file upload preserved verbatim inside `LcAiSuggestionsSection`.
- `complete_legal_review` RPC submit path untouched.
- `AssembledCpaSection`, `LcReturnToCurator`, `LcApproveAction`, `WorkflowProgressBanner`, `PwaAcceptanceGate`, `FileUploadZone` imports preserved.
- Pass 3 panel is purely additive — placed between AttachedDocs and AI Suggestions.

### Constraints met

- Every new file < 250 lines (largest: `LcAiSuggestionsSection` at ~240, `LcChallengeDetailsCard` at ~230).
- Page rewrite ~240 lines (target <300).
- Layer separation: components receive data via props; hooks own queries/mutations; no `supabase.from` in components 4/5/6/8.
- Zero `any` in new code — `Record<string, unknown>` + narrowed types; existing `any` usages confined to legacy mutation payloads inside the page orchestrator (cannot eliminate without schema changes — out of scope).
- TipTap components from Sprint 1 reused as-is.
- `useCuratorLegalReview` pattern from Sprint 3 mirrored exactly.

### Out of scope

- Visibility gating of Pass 3 panel by governance mode — the prompt specifies "shown for CONTROLLED mode" but also says `{isLC && <LcPass3ReviewPanel/>}`. Will follow the explicit JSX directive (`isLC` only). LC role assignment is itself governance-gated (LC only assigned in STRUCTURED/CONTROLLED), so this naturally restricts visibility without an extra check.
- Refactoring legacy `as any` casts in existing mutations.
- Section-level diff/version history for Pass 3 (single unified doc view).

