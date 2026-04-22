

# Plan — FC per-challenge Finance Workspace (mirrors LC Legal Workspace)

Refactor the Finance Coordinator UX from a flat list at `/cogni/escrow` into a per-challenge workspace at `/cogni/challenges/:id/finance` that mirrors the LC Legal Workspace pattern (header + step indicator + tabs + footer). All escrow rules, the `complete_financial_review` RPC, the `EscrowDepositForm` validation, account masking, and proof upload remain untouched.

## What the user will see

```
FC Dashboard → "Manage Escrow" → /cogni/fc-queue (list)
  ↓ click challenge row
/cogni/challenges/:id/finance
┌──────────────────────────────────────────────────┐
│ ← Finance Workspace — [Challenge Title]          │
│ [1 Review Context] → [2 Confirm Escrow] → [3 ✓] │
├ Tab: Finance Review │ Curated Challenge ─────────┤
│  • Legal Agreement (Read Only) — UNIFIED_SPA HTML│
│  • Recommended Escrow (governance + reward ctx)  │
│  • Escrow Deposit Confirmation form              │
│    (or "Escrow Deposit Confirmed" summary)       │
├──────────────────────────────────────────────────┤
│ [Return to Curator]   [Submit Financial Review]  │
└──────────────────────────────────────────────────┘
```

After submission → green "Financial Review Complete — Read Only" alert, step 3 active, form replaced by confirmation summary, submit button shows "Already Submitted".

## Files

| File | Action | Approx. lines |
|---|---|---|
| `src/pages/cogniblend/FcFinanceWorkspacePage.tsx` | CREATE | ~230 |
| `src/components/cogniblend/fc/FcFinanceStepIndicator.tsx` | CREATE | ~60 |
| `src/components/cogniblend/fc/FcLegalDocsViewer.tsx` | CREATE | ~110 |
| `src/components/cogniblend/fc/FcReturnToCurator.tsx` | CREATE | ~110 |
| `src/components/cogniblend/fc/FcFinanceSubmitFooter.tsx` | CREATE | ~70 |
| `src/components/cogniblend/fc/FcEscrowConfirmedSummary.tsx` | CREATE | ~50 |
| `src/hooks/cogniblend/useFcFinanceData.ts` | CREATE | ~50 |
| `src/hooks/cogniblend/useFcFinanceSubmit.ts` | CREATE | ~80 |
| `src/hooks/cogniblend/useFcEscrowConfirm.ts` | CREATE | ~150 (split if needed) |
| `src/pages/cogniblend/FcChallengeQueuePage.tsx` | MODIFY (1 navigate call + label) | +1 / -1 |
| `src/pages/cogniblend/EscrowManagementPage.tsx` | MODIFY (simplify to lightweight queue → redirect) | ~120 |
| `src/App.tsx` | MODIFY (lazy import + 1 route) | +2 |

All files ≤ 250 lines. Zero changes to: `EscrowDepositForm.tsx`, `complete_financial_review` RPC, `escrow_records` schema, `escrow-proofs` bucket, `FcChallengeDetailView`, `RecommendedEscrowCard`, `WorkflowProgressBanner`, `PwaAcceptanceGate`, LC files, AI/Curator flows, QUICK mode.

## Component contracts

### `FcFinanceStepIndicator`
Visual clone of `LcLegalStepIndicator` with:
- Step 1: "Review Context"
- Step 2: "Confirm Escrow"
- Step 3: "Submitted"
Same chevrons, ring on active, check on completed.

### `FcLegalDocsViewer({ challengeId })`
- Query `challenge_legal_docs` for `challenge_id` AND `document_type='UNIFIED_SPA'` AND `ai_review_status='accepted'` — selects `id, content_html, ai_modified_content_html, lc_reviewed_at` (`maybeSingle`).
- Reuses **`<LegalDocumentViewer content={…} />`** (already imports `legal-document.css`) — no inline `dangerouslySetInnerHTML`.
- States: loading skeleton; if no row found → muted "Legal documents are being reviewed by the Legal Coordinator…"; if row found → green "Approved by Legal Coordinator on {date}" badge above the rendered HTML.
- Wrapped in a `Card` titled "Legal Agreement (Read Only)" with a `Scale` icon.

### `FcReturnToCurator({ challengeId, userId, disabled })`
- Mirrors `LcReturnToCurator` UI (button + AlertDialog + Textarea, min-10-char reason).
- Behaviour: inserts `audit_trail` row `action='FC_RETURNED_TO_CURATOR'`, then inserts `cogni_notifications` for active CU users (looked up via `getActiveRoleUsers(challengeId, ['CU'])`). Toast "Challenge returned to Curator". Invalidates `fc-challenge-queue` and `cogni-dashboard`.
- Not piggy-backing on `useUnfreezeForRecuration` — phase semantics differ for FC.

### `FcFinanceSubmitFooter`
Mirrors `LcLegalSubmitFooter`:
- Left: escrow status badge (`Escrow: {status ?? 'Pending'}`) + helper text mentioning current phase.
- Middle: `<FcReturnToCurator />`.
- Right: "Submit Financial Review" — disabled when `submitting`, `escrowStatus !== 'FUNDED'`, `currentPhase !== 3`, or `fcComplianceComplete`. If already complete → label "Already Submitted".

### `FcEscrowConfirmedSummary({ escrow })`
Small read-only success card with check icon, formatted amount + currency, bank name, deposit reference. Used after FUNDED.

## Hooks

### `useFcFinanceData.ts`
- `useChallengeForFC(challengeId)` — `useQuery` selecting `id, title, reward_structure, governance_profile, governance_mode_override, operating_model, current_phase, phase_status, fc_compliance_complete, lc_compliance_complete, currency_code, organization_id` from `challenges`. `staleTime: 60_000`.

### `useFcFinanceSubmit.ts`
Mirrors `useLcLegalSubmit`:
- Calls `complete_financial_review` RPC with `{ p_challenge_id, p_user_id }` (the existing RPC — unchanged).
- On success: invalidates `['fc-escrow-challenges']`, `['fc-challenge-queue']`, `['escrow-deposit', challengeId]`, `['publication-readiness', challengeId]`, `['cogni-dashboard']`, `['challenge-fc-detail', challengeId]`. Toast based on `awaiting`/`phase_advanced` (same shape EscrowManagementPage already handles). Navigates to `/cogni/fc-queue` on phase advance.
- Returns `{ submit, submitting, gateFailures }`.

### `useFcEscrowConfirm.ts`
Pure extraction of the existing escrow-confirm logic from `EscrowManagementPage` lines 52–267. No business-rule changes:
- Builds `useForm<EscrowFormValues>` + `useFormPersistence('cogni_escrow_<challengeId>')` (key scoped by challenge so two FC tabs do not stomp each other — important now that the page is per-challenge).
- Owns `proofFile`, `proofUploading` state.
- `confirmEscrow` mutation: same upload → insert/update sequence, same `account_number_masked` masking, same audit trail insert, same `logStatusTransition` + `notifyEscrowConfirmed` calls.
- Returns `{ form, proofFile, setProofFile, proofUploading, confirmEscrow, handleSubmit, clearForm }`.
- Crucially: **does not** call `complete_financial_review` itself anymore — that becomes the explicit "Submit Financial Review" action via `useFcFinanceSubmit`. Today the RPC fires automatically in `confirmEscrow.onSuccess`. New behaviour matches the LC pattern (Accept ≠ Submit). To preserve today's automation as a safety net, keep the RPC call in `useFcEscrowConfirm` but make it idempotent: log a warning instead of toasting on failure (the explicit Submit button is the canonical path). This way single-step deposits still complete, and the explicit Submit retries cleanly.

### Existing hook adjustments
- `useEscrowDeposit(challengeId, userId)` already returns `{ escrow, rewardTotal, canVerify }` — used as-is.
- `useUserChallengeRoles(userId, challengeId)` returns `string[]` of role codes — access check is `roles?.includes('FC')`.

## Page: `FcFinanceWorkspacePage.tsx`

Hooks order (R5 compliant — all hooks before any return):

1. `useParams`, `useNavigate`, `useAuth`
2. `useUserChallengeRoles(user?.id, challengeId)`
3. `useChallengeForFC(challengeId)`
4. `useEscrowDeposit(challengeId, user?.id)`
5. `usePwaStatus(user?.id)`
6. `useState` for `pwaAccepted`, default tab
7. `useFcEscrowConfirm({ challengeId, userId, rewardTotal })`
8. `useFcFinanceSubmit({ challengeId, userId })`
9. Derived: `currentStep`, `isFunded`, `hasAccess`, `govMode`
10. Conditional returns (loading skeleton, PWA gate, access-denied card, QUICK/STRUCTURED guard card, phase-too-early guard).
11. JSX.

Step calculation:
```
isFunded = escrowRecord?.escrow_status === 'FUNDED'
fcDone   = !!challenge?.fc_compliance_complete
currentStep = fcDone ? 3 : isFunded ? 3 : 2
```
(Step 1 is implicit context-review, not a separate locked state.)

Layout follows LC: back link to `/cogni/fc-queue`, `Banknote` header icon, "Finance Workspace" title, challenge title, `fc_compliance_complete` green Alert, step indicator card, `WorkflowProgressBanner step={3}`, Tabs, Separator, gate-failure alerts, `FcFinanceSubmitFooter`.

Tab "Finance Review" body:
```
<FcLegalDocsViewer challengeId={…} />
<RecommendedEscrowCard challengeId={…} />
{!fcDone && !isFunded && (
  <Card title="Escrow Deposit Confirmation" with Banknote icon>
    <EscrowDepositForm
      form={escrow.form}
      onSubmit={escrow.handleSubmit}
      isPending={escrow.confirmEscrow.isPending}
      proofFile={escrow.proofFile}
      onProofFileChange={escrow.setProofFile}
      proofUploading={escrow.proofUploading}
      governanceMode={govMode}
    />
  </Card>
)}
{(fcDone || isFunded) && <FcEscrowConfirmedSummary escrow={escrowRecord.escrow} />}
```
Tab "Curated Challenge" body:
```
<FcChallengeDetailView challengeId={…} defaultOpen />
```

Guard cards (mirroring LC):
- No `FC` role → "Access Denied" card with return-to-dashboard.
- `govMode` is `QUICK` or `STRUCTURED` → "Not applicable for QUICK/STRUCTURED governance" card with link back to `/cogni/fc-queue`.
- `current_phase < 3` → "Challenge not ready for finance review" card with link back to `/cogni/fc-queue`.

## App.tsx

```
const FcFinanceWorkspacePage = lazy(() => import('@/pages/cogniblend/FcFinanceWorkspacePage'));
…
<Route path="/cogni/challenges/:id/finance" element={<LazyRoute><FcFinanceWorkspacePage /></LazyRoute>} />
```
Both `/cogni/escrow` and `/cogni/fc-queue` routes remain.

## FcChallengeQueuePage change

Replace the `onClick={() => navigate('/cogni/escrow')}` with `navigate(\`/cogni/challenges/${item.challenge_id}/finance\`)` and change the button label to **"Open Finance Workspace"**.

## EscrowManagementPage simplification

Reduce to a thin queue/redirect page:
- Reuse the existing `fc-escrow-challenges` query (kept where it is — other callers may depend on the cache key).
- Remove inline form state, `useForm`, `useFormPersistence`, `confirmEscrow` mutation, `handleSubmit`, the inline `FcChallengeDetailView`/`RecommendedEscrowCard`/`EscrowDepositForm` rendering.
- For each challenge row, the "Enter Deposit" button becomes "Open Finance Workspace" → `navigate(\`/cogni/challenges/${ch.challenge_id}/finance\`)`. FUNDED rows still show the green "Escrow Confirmed" badge and a "View Workspace" button.
- Page still acts as a fallback list and respects PWA gate.

## DB / migrations / edge functions

None. All existing tables, RPCs (`complete_financial_review`), bucket policies, and RLS untouched.

## Verification

1. `/cogni/fc-queue` → click a Phase-3 CONTROLLED challenge → lands on `/cogni/challenges/:id/finance`. Header, step indicator, tabs, and submit footer render.
2. PWA gate appears for an FC user without acceptance — same component as today.
3. Tab "Finance Review": Legal Agreement card shows the LC-approved UNIFIED_SPA HTML (or the muted "being reviewed" message if not yet accepted). RecommendedEscrowCard shows governance + reward total. EscrowDepositForm renders with all 9 fields + proof upload (no validation drift — same schema, same masking).
4. Tab "Curated Challenge" shows `FcChallengeDetailView` (33-section preview).
5. Submit on the deposit form → `escrow_records` updated to FUNDED, audit row written, status history logged, Curator notified — all unchanged from today.
6. After FUNDED, the form is replaced by the green confirmed summary; "Submit Financial Review" becomes enabled.
7. Click **Submit Financial Review** → `complete_financial_review` RPC called (idempotent if it already ran in onSuccess), success toast, navigates back to `/cogni/fc-queue`, queue refreshes (challenge gone).
8. Click **Return to Curator** → AlertDialog → enter ≥10 chars → audit row + Curator notification inserted, toast shown.
9. QUICK or STRUCTURED challenge directly visited at `/cogni/challenges/:id/finance` → guard card with link back to queue.
10. Pre-Phase-3 challenge → guard card.
11. Non-FC user → access-denied card.
12. `/cogni/escrow` still loads, shows the queue, and clicking a row routes to the new workspace.
13. LC workspace, AI Pass 1/2/3, Curator flows, QUICK challenges — all unchanged (manual smoke test).
14. `npx tsc --noEmit` passes; every new/modified file ≤ 250 lines; no `any`, no `console.*`.

## Out of scope

- Server-side gate validation for FC submit (mirroring `validate_gate_02`) — not in current spec; the RPC itself enforces preconditions.
- Multi-currency rate cards.
- Editing the escrow record after FUNDED (still a single one-shot confirmation).
- Any change to fee percentages, partial deposits, or refund logic.

