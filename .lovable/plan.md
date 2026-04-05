

# QUICK Mode End-to-End Fix

## Summary
Fix 6 bugs preventing QUICK governance mode from working: complete_phase crash at Phase 3 (gate check before compliance flags set), missing legal doc auto-insertion, missing challenge_visibility, no solver notifications, and no legal docs in detail view.

---

## Part A: SQL Migration — Fix complete_phase + QUICK Phase 3

**Problem:** Current `complete_phase` checks gate_flags (line 28-35) on the **current** phase before completing it. When Phase 2 auto-completes and recurses into Phase 3, the gate check fires immediately — but compliance flags haven't been set yet (they're set in the "next config" block at line 55-64, which only fires when *entering* a phase). QUICK Phase 3 has `gate_flags = [lc_compliance_complete, fc_compliance_complete]` + `auto_complete = true`, causing an instant crash.

**Two-part fix:**

1. **Update `complete_phase` function** — Move the compliance flag auto-set logic to fire **before** the gate check. Specifically:
   - When entering Phase 3 (v_next_phase = 3), set compliance flags and insert legal docs BEFORE advancing
   - When entering Phase 4, set `challenge_visibility = 'public'`
   - Skip gate checks for phases with `auto_complete = true` (auto-complete phases should not block on gates — the system is responsible for satisfying them)

2. **Remove gate_flags from QUICK Phase 3** — As a belt-and-suspenders fix:
   ```sql
   UPDATE md_lifecycle_phase_config
   SET gate_flags = NULL
   WHERE governance_mode = 'QUICK' AND phase_number = 3;
   ```

**Key changes to the function:**
- Gate check (line 28) gets additional condition: `AND NOT COALESCE(v_phase_config.auto_complete, false)`
- Compliance setup block (line 55) triggers on `v_next_phase = 3` instead of only when gate_flags exist
- Legal doc INSERT uses `legal_document_templates` table (5 active templates: PMA, CA, PSA, IPAA, EPIA) with status `auto_accepted` for QUICK, `pending_review` for others
- New block for `v_next_phase = 4`: sets `challenge_visibility = 'public'`

---

## Part B: TypeScript — Solver Notification + Toast Fix

**File: `src/hooks/cogniblend/useSubmitSolutionRequest.ts`** (~10 lines added)

After the `complete_phase` RPC and CU auto-assign block, add QUICK-specific logic:

1. **QUICK toast message** — Change success toast from "sent to Curator for review" to "Challenge published! Solvers can now discover and apply." when `normalizedGov === 'QUICK'`
2. **Solver notification** — Insert rows into `cogni_notifications` for registered solvers. Since `solver_profiles` may not have industry filtering, use a simple query for all solver user_ids. Batch insert in groups of 50. Non-blocking (catch errors silently via `logWarning`).

Columns available in `cogni_notifications`: `user_id, notification_type, title, message, challenge_id, is_read`.

---

## Part C: Legal Docs in Detail View

**New file: `src/components/cogniblend/challenges/ChallengeLegalDocsCard.tsx`** (~55 lines)

A standalone card component that:
- Accepts `challengeId` and `isQuickMode` props
- Queries `challenge_legal_docs` for the challenge
- Renders each doc as a row with name, type, tier, and status badge
- Shows "Auto-accepted" badge for `status = 'auto_accepted'`, otherwise shows `lc_status`
- For QUICK mode, shows "Auto-applied" badge in header + italic "Platform default legal templates applied automatically. View-only." footer

**File: `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx`**

- Import and render `<ChallengeLegalDocsCard>` after the sections (before QA section)
- Pass `challengeId` and `isQuickMode`

---

## Part D: Seed Data — Add visibility to all 3 challenges

**File: `supabase/functions/setup-test-scenario/index.ts`**

Add `challenge_visibility: 'public'` to all 3 challenge INSERTs. (No `challenge_enrollment` or `challenge_submission` columns exist — skip those.)

---

## Verification
- QUICK submit: no crash at Phase 3, auto-advances to Phase 5
- DB: `lc_compliance_complete = TRUE`, `fc_compliance_complete = TRUE`
- DB: `challenge_legal_docs` has 5 rows with `status = 'auto_accepted'`
- DB: `challenge_visibility = 'public'`
- Detail view shows Legal Documents card with auto-accepted badges
- Toast says "published" not "sent to Curator"

