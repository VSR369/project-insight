

# Plan — Fix LC Legal Workspace UX

## What's broken right now

1. **Upload throws "Invalid status: uploaded"** — the DB trigger on `challenge_legal_docs` only allows `ATTACHED / TRIGGERED / SIGNED / EXPIRED / ai_suggested`. The hook inserts `status: 'uploaded'`, which gets rejected immediately.
2. **No visible "Organize & Merge" or "Run AI Pass 3" button at the decision point** — both buttons exist inside the `LcPass3ReviewPanel`'s "idle" empty-state card, but it's hidden under several other cards and most users never scroll there. The screenshot confirms the user only sees the upload card and the footer.
3. **Three competing footer actions** (`Return to Curator`, `Approve Legal Compliance`, `Submit to Curation`) — `Approve Legal Compliance` is a legacy direct-DB button from the old multi-doc flow. In the unified Pass-3 flow, *acceptance* of the unified SPA inside the editor IS the approval; the footer button duplicates it and writes a stale `is_assembled=true` filter that no longer matches any rows.
4. **No automatic hand-back to the Curator on completion** — `Submit to Curation` calls `complete_legal_review` RPC which does advance the phase, but the user is just navigated to `/cogni/dashboard` without a clear "returned to Curator" message.

## Fixes

### A · DB migration (additive only, no destructive change)
Update the `enforce_legal_doc_status` trigger to also allow the source-document lifecycle values:
```
ATTACHED, TRIGGERED, SIGNED, EXPIRED, ai_suggested,
uploaded, organized, accepted, APPROVED
```
Also explicitly allow `NULL`. No data backfill needed. Existing migration `20260321121359` is the latest version of this trigger — write a new migration that supersedes it.

### B · Hook fix — `useSourceDocs.ts`
Already inserts `status: 'uploaded'` which the new CHECK now permits. No code change required after migration A — but add a defensive comment pointing to the migration so future devs don't trip on it.

### C · Lift the two buttons to the Step 1 card
The decision point belongs **next to the upload count**, not buried inside the Pass 3 panel. Restructure as follows:

- **`LcSourceDocUpload`** receives two new optional props: `onRunPass3`, `onOrganizeOnly`, `pass3Busy`, `hasGenerated`. When `onRunPass3` is provided, render a divider + two-button row at the bottom of the card:
  - `⚡ Run AI Pass 3 (Merge + Enhance)` — primary
  - `📄 Organize & Merge (No AI)` — outline, **always visible** (also valid with zero source docs to clear/regenerate)
  - Helper text: "AI Pass 3 merges all uploaded source documents from Creator, Curator, and you with the curated challenge context, then drafts a single seamless agreement for the Solution Provider to sign."
  - When `hasGenerated`, both buttons re-label to `Re-run AI Pass 3` / `Re-organize`.
- **`LcLegalWorkspacePage`** wires the `useLcPass3Review` mutations into those props.
- **`LcPass3ReviewPanel`** removes its own duplicate "idle" two-button card — the panel now only renders once a draft exists (`pass3Status !== 'idle'`). Keeps its `running / error / showBody` branches.

### D · Footer cleanup — `LcLegalSubmitFooter`
- **Remove `LcApproveAction`** (`Approve Legal Compliance`) entirely. Acceptance happens inside the editor via `Accept Pass 3` and that already sets `ai_review_status='accepted'` + writes to `lc_reviewed_*`.
- **Keep `LcReturnToCurator`** (the dialog with reason) — that's a deliberate "send back" action.
- **Keep `Submit to Curation`** — this is the canonical phase-advance via `complete_legal_review` RPC.
- Update the helper text under the doc count to reflect the new two-step flow: "Generate the unified agreement above, accept it, then submit to advance the challenge."
- Delete `src/components/cogniblend/lc/LcApproveAction.tsx` (orphan after this change).

### E · Auto-hand-back messaging
In `useLcLegalSubmit.ts`, after `complete_legal_review` succeeds with `phase_advanced=true`, change the toast to: *"Legal review complete — challenge handed back to the Curator for finalisation."* Keep the redirect to `/cogni/dashboard`. No backend change needed — `complete_legal_review` already advances Phase 3 → Phase 4 (Curation Finalisation), which is the "hand back to Curator" step.

### F · Mirror the same lifted buttons in `CuratorComplianceTab.tsx`
The Curator tab already mounts `LcSourceDocUpload sourceOrigin="curator"`. Pass the same `onRunPass3` / `onOrganizeOnly` props from its existing `useLcPass3Review` instance so the Curator gets the identical decision point. Remove the now-orphaned standalone two-button row that was added in the previous sprint above `LcPass3ReviewPanel`.

## Files touched

| File | Action | Δ |
|---|---|---|
| `supabase/migrations/<new>.sql` | new | +25 (trigger update) |
| `src/components/cogniblend/lc/LcSourceDocUpload.tsx` | edit | +50 (button row + props) |
| `src/components/cogniblend/lc/LcPass3ReviewPanel.tsx` | edit | −35 (drop idle card) |
| `src/pages/cogniblend/LcLegalWorkspacePage.tsx` | edit | +5 (wire props) |
| `src/components/cogniblend/lc/LcLegalSubmitFooter.tsx` | edit | −5 (drop Approve) |
| `src/components/cogniblend/lc/LcApproveAction.tsx` | delete | −96 |
| `src/components/cogniblend/curation/CuratorComplianceTab.tsx` | edit | ~0 (move row into upload card) |
| `src/hooks/cogniblend/useLcLegalSubmit.ts` | edit | +1 (toast wording) |

**Net:** ~−55 lines. All files stay ≤ 250.

## Verification

1. Upload a `.docx` source document on `/cogni/challenges/:id/lc-legal` → success toast, row appears in the list. (Confirms migration A.)
2. With ≥1 source doc, two buttons visible **in the upload card itself** (not buried). Click `Organize & Merge` → status strip blue, `ai_review_status='organized'`, no AI tokens spent.
3. Click `Run AI Pass 3` → status strip green, source clauses preserved + AI fills empty sections.
4. Click `Accept` inside the editor → green "Final Agreement" badge in Attached Docs card, footer's `Submit to Curation` becomes the only enabled action.
5. Click `Submit to Curation` → toast: "Legal review complete — challenge handed back to the Curator for finalisation." → redirect to `/cogni/dashboard`.
6. `Return to Curator` dialog still works (with required reason ≥ 10 chars).
7. STRUCTURED Curator Legal tab — same two buttons appear in its upload card, identical behaviour.
8. `Approve Legal Compliance` button is **gone** everywhere.

## Out of scope

- Pass 1 / Pass 2 logic
- `complete_legal_review` RPC behaviour (already correct)
- QUICK auto-accept path
- Renaming `document_type` enum values
- Adding new persistent columns

