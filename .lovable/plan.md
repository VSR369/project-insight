

## Audit — Final Bug Fix Plan v2 (8 Prompts)

| # | Bug | Status | Evidence |
|---|---|---|---|
| **1** | Diagnostics labels (Pass 1 = "Analysed", Pass 2 = "AI Content Generated" / "AI Suggestion Ready") | ✅ **FIXED** | `DiagnosticsReviewPanel.tsx` line 116 returns `'Analysed'`; line 44 title is `Pass 1 — Analysis`. `DiagnosticsSuggestionsPanel.tsx` lines 155–157 emit `'AI Content Generated'` / `'AI Suggestion Ready'`. |
| **2** | Persist consistency + ambiguity findings to dedicated tables | ✅ **FIXED** | `index.ts` lines 228–264 contain helper functions; lines 1150–1167 (consistency) and 1206–1222 (ambiguity) execute delete-then-insert into `challenge_consistency_findings` / `challenge_ambiguity_findings` via `adminClient`, wrapped in try/catch (non-blocking). |
| **3** | Outcomes acceptance criteria — prompt + UI flag | ✅ **FIXED** | `promptConstants.ts` line 112: `expected_outcomes` requires `[{name, description, acceptance_criteria}]` with explicit "REQUIRED — never leave empty". `SuggestionVersionDisplay.tsx` line 196: `hideAcceptanceCriteria={badgePrefix === "S"}` (only Submission Guidelines hide; Outcomes show). `renderProblemSections.tsx` (Outcomes, line 108): `badgePrefix="O"` with no `hideAcceptanceCriteria` → criteria visible after acceptance. |
| **4** | Phase schedule — descriptive `phase_name`, never empty | ✅ **FIXED** | `promptConstants.ts` line 49 (`schedule_table` dispatcher) + line 114 (`phase_schedule` field): both REQUIRE non-empty descriptive name with examples (`Registration`, `Submission Window`…) and explicitly forbid `—`/`TBD`/generic `Phase 1`. |
| **5** | Accept-All failure visibility — auto-open diagnostics + per-row Retry | ✅ **FIXED** | `useCurationPageOrchestrator.ts` lines 51 (state lift) + 336 (`setDiagnosticsOpen(true)` on `totalFailed > 0`) + 404 (exposed via return). `CurationRightRail.tsx` lines 83–89 receive props. `CurationReviewPage.tsx` lines 362–367 wire `onReReviewSection` → `handleNavigateToSection`. `DiagnosticsAcceptancePanel.tsx` lines 104–116 render the `Retry` button on failed rows. |
| **6** | Empty placeholder cleanup in line-item view mode | ⚠️ **PARTIALLY FIXED** | `LineItemsSectionRenderer.tsx`: structured branch (lines 76–87) and string branch (lines 89–95) both filter empties — covers `current_deficiencies`, `root_causes`, `expected_outcomes`. **Not implemented:** the optional "expand all / show 5→10 more" toggle. The plan called this out as a polish-only enhancement and the core empty-placeholder bug is closed. |
| **7** | Reward tier toggle consistency (no "Enabled $0") | ✅ **FIXED** (different strategy than plan) | `normalizeAIContent.ts` lines 69–78: instead of force-enabling tiers, drops zero-amount tiers entirely so `applyAIReviewResult` only sees tiers with `amount > 0`. Net effect identical — every displayed tier is enabled and has an amount. Code comment documents the choice. |
| **8** | Diagnostics counts from store (not execution snapshot) | ✅ **FIXED** | `DiagnosticsReviewPanel.tsx` lines 71–75: counts derive purely from `entry.reviewStatus`. Lines 107–108: per-row `sectionStatus` / `sectionAction` read store, no execution fallback. Execution record retained only for wave-level badge (line 78) and timestamps (lines 57–62). `DiagnosticsSuggestionsPanel.tsx` correctly keeps Pass 2 status driven by execution record (Pass 2 hasn't been re-keyed by curator), with live overlays for "Accepted by Curator" / "Discarded by Curator". |

---

## Net Result

**7 of 8 prompts fully implemented; 1 partially (cosmetic only).**

### What is NOT fixed (single open item)

- **Prompt 6 — "+N more" expand toggle (5→10 visible items, "Show N more" button).** Empty-item filtering IS done; the row-count expansion polish was deferred. Plan language permits this ("defer unless found during QA").

### Verifications recommended

| Bug | Manual check |
|---|---|
| 2 | After a fresh review: `select count(*) from challenge_consistency_findings where challenge_id='25ca71a0-…'` should be > 0 if the AI flagged any. QualityScoreSummary chip should show non-zero. |
| 3 | Re-run review on Outcomes → suggestion preview shows acceptance_criteria block; accept → cards display the criteria in view mode. |
| 4 | Re-run review on Phase Schedule → every row has a descriptive name, none `—`. |
| 5 | Force a section failure → toast appears + diagnostics auto-opens to Pass 3 panel + Retry button navigates to that section. |
| 7 | Accept a reward suggestion that includes Platinum/Gold/Silver — all three appear "Enabled" with non-zero amounts; no "Enabled $0" rows. |

### Optional follow-up (single small prompt)

If you want the "+N more" expand toggle from Prompt 6 closed too, I can add a `visibleLimit` (default 10) + "Show N more" button to `LineItemsSectionRenderer` view-mode (~10 lines, no behavior change in edit mode, file stays well under 250 lines).

