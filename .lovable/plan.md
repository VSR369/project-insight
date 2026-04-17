

## Gap Check — PR1 / PR2 / PR3 Implementation Audit

### Verification results against the actual current code

| # | Required change | File | Line | Current state | Status |
|---|---|---|---|---|---|
| **PR1.1** | `PASS2_MAX_TOKENS = 32768` | `aiPass2.ts` | 32 | `const PASS2_MAX_TOKENS = 32768;` | ✅ DONE |
| **PR1.2** | `maxContentLen = 4000` | `aiPass2.ts` | 195 | `const maxContentLen = 4000;` | ✅ DONE |
| **PR1.3** | `includeFull = !a.summary` | `aiPass2.ts` | 193 | `const includeFull = !a.summary;` (isSoloBatch / fewAttachments removed) | ✅ DONE |
| **PR2** | Split-retry uses real per-section blocks | `aiPass2.ts` | 441–459 | `buildSplitBody` reads from `sectionPromptsByKey.get(r.section_key)`, joins with `\n\n---\n\n`, preserves preamble. Placeholder text fully gone. | ✅ DONE |
| **PR2** | `sectionPromptsByKey` propagated through recursion | `aiPass2.ts` | 330–341, 462–463 | Map built at call site, threaded through `runPass2Call` parameter and into both recursive split calls. | ✅ DONE |
| **PR3.a** | `max-h-[500px]` → `max-h-[70vh]` | `SuggestionVersionDisplay.tsx` | 195 | `max-h-[70vh]` | ✅ DONE |
| **PR3.b** | `max-h-96` → `max-h-[60vh]` | `SuggestionVersionDisplay.tsx` | 207 | `max-h-[60vh]` | ✅ DONE |
| **PR3.c** | `max-h-72` → `max-h-[50vh]` (×2) | `SuggestionVersionDisplay.tsx` | 216, 222 | both `max-h-[50vh]` | ✅ DONE |

### Minor gaps identified (not in the original PR scope, decision required)

| # | Gap | Severity | Note |
|---|---|---|---|
| **G1** | **Pass 1 still at `max_tokens: 16384`** (`aiPass1.ts` line 27) — the user's earlier "Priority Fix #2" said to bump Pass 1 to 16384 (already done), but for symmetry with the new 32768 Pass 2 ceiling, Pass 1 large batches could still truncate on heavy industry intelligence prompts. | Low — Pass 1 has not shown TRUNCATED in your screenshots. | Optional bump to 32768 if Pass 1 truncations appear. **Not in approved PR scope — leave as-is.** |
| **G2** | `max-h-32` raw-debug fallback (line 244) still capped at 128px. | Cosmetic — only shown for malformed JSON debug view. | Plan explicitly said "leave as-is". ✅ Correct. |
| **G3** | **No "Expand" button** added to suggestion containers (PR3 mentioned it as optional UX). | Low | Not in the diff. Containers now scroll internally up to 70vh, which covers ~95% of suggestions. Adding an Expand-to-full-page modal would be a separate UX PR. |

### Conclusion

**All three approved PRs (PR1, PR2, PR3) are fully and correctly implemented.** The split-retry bug is genuinely fixed (verified the placeholder string `[Pass 2 split-retry — see Pass 1 issues for ...]` is gone — replaced with real `sectionPromptsByKey.get(...)` lookup). Token caps, attachment caps, and viewport-based UI heights match the spec exactly.

**No corrective action required for the approved scope.** Two optional follow-ups (G1: bump Pass 1 to 32K, G3: add Expand-to-modal button) are out of the original PR scope — flag them only if you want them as a follow-up PR4.

### Recommended next step
End-to-end verification on the same challenge that produced Wave 4 TRUNCATED + Wave 5 MALFORMED. If both come back clean, the fix is confirmed and no further work is needed.

