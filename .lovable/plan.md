

## Verification Report — 16 Errors vs Implemented Code

### ✅ FULLY CLOSED in code (12 of 16)

| # | Error | Evidence in code |
|---|---|---|
| 1 | `[object Object]` for Affected Stakeholders | `buildExportHtml.ts:215-217` dispatches `line_items` → `renderLineItemsCards` (cards, no `String()`) |
| 2 | Raw JSON for Data & Resources | line 218-219 dispatches `structured_fields` → `renderStructuredFieldsList` (`<dl>/<dt>/<dd>`) |
| 3 | Raw JSON for Success Metrics & KPIs | same as #1 (`line_items` format) |
| 4 | Reward Structure dump | line 140-141 calls `renderRewardTiersTable` — parses tiers, skips zero-amount tiers, separate non-monetary block |
| 5 | `["certified_expert",…]` for Eligibility | line 220-221 dispatches `checkbox_multi` → `renderCheckboxBadges` (humanises labels) |
| 6 | Maturity raw enum | line 132-133 → `renderEnumLabel(ch.maturity_level, ctx.maturityLabels)` |
| 7 | IP Model short label only | line 134-135 → `IP_MODEL_LABELS` map includes full explanation (`"Joint Ownership — Shared rights between seeker and provider"`) |
| 8 | Visibility raw enum (`"public"`) | line 136-137 → `VISIBILITY_LABELS` map (`"Public — visible to all Solution Providers"`) |
| 9 | `Problem Statementby CA` glued | line 317-321 emits leading space + `<span class="export-section-attribution">` |
| 10 | Evaluation Criteria flat text | line 138-139 → `renderEvaluationCriteriaTable` (proper `<table>` with weight totals) |
| 11 | Cover `<div>`-in-`<dl>` invalid markup | line 260-279 rebuilt as valid `<table class="export-cover-meta">` |
| 12 | Cover footer concatenation bug | line 280 footer is now a sibling `<p>`, not buried inside the meta block |

### ⚠️ PARTIALLY CLOSED (3 of 16) — depends on data, not code

| # | Error | Status | Why |
|---|---|---|---|
| 13 | Problem Statement empty | **Code-side fixed**, data-side **NOT yet repaired** | `readSectionValue` (line 81-90) now reads direct column then falls back to `extended_brief`. New exports will pick up whichever path Accept-All used. **But the existing challenge in your DB still has the broken value** — it will only render correctly after the next Accept-All run on a fresh AI session. |
| 14 | Scope empty | same as #13 | same |
| 15 | Context & Background "Not provided." | same as #13 | same |
| Bonus | Solver Expertise / Complexity placeholders | Routing fix applies; same data-repair caveat | — |

### ❌ NOT CLOSED (1 of 16) — out of scope by design

| # | Error | Why still open |
|---|---|---|
| 16 | Creator Legal Instructions empty | This section has `aiCanDraft: false` AND `curatorCanEdit: false`. If the **creator** never filled it during Phase 1, no export change can populate it. The plan explicitly flagged this as requiring a creator-form validation gate, scheduled separately. |

### Honest answer to "will the preview document now be complete without blanks/junk"?

**For RC-1 (junk characters / `[object Object]` / raw JSON / `[…]` arrays / glued titles): YES — fully fixed.** Every one of the 12 RC-1/RC-3 errors has explicit code closing it. New exports of any challenge will render cleanly.

**For RC-2 (blank Problem Statement / Scope / Context on the *uploaded* challenge): NO, not until you re-run Accept-All.** The export code will now read from whichever DB target holds the data — but the existing record's `aiSuggestion` blobs are still the truncated/duplicated outputs from the pre-hardening AI run (the "Mahindra ahindra", "4820.6", mid-word truncation issues identified earlier). The export renderer faithfully renders whatever is in the DB; it cannot un-corrupt content that was bad at write time.

**For Creator Legal Instructions: NO, and never via export logic** — needs a creator-form validation gate (separate work).

### What I recommend next (one-time data repair for the uploaded challenge)

1. **Re-run Pass 2 on the affected challenge** with the now-hardened pipeline (the 12-test `passResilience_test.ts` suite + `safeJsonParse` guards that landed in the previous step). This regenerates clean suggestions for Problem Statement / Scope / Context / Solver Expertise / Complexity.
2. **Click Accept All AI Suggestions** — with the routing fix in `bulkAcceptHelpers.ts`, values will land in the correct DB target.
3. **Re-export** — all 15 export-side errors will be gone. Only Creator Legal Instructions will remain blank (creator must fill it).

### Confidence summary

| Class | Verdict |
|---|---|
| Junk characters / object dumps / raw JSON | ✅ Eliminated by code |
| Enum-vs-label issues | ✅ Eliminated by code |
| Layout / cover / attribution | ✅ Eliminated by code |
| Empty rich-text sections on **new** runs | ✅ Will be correct |
| Empty rich-text sections on the **uploaded** challenge | ⚠️ Needs one-time data repair (re-run Pass 2 + Accept-All) |
| Creator Legal Instructions | ❌ Requires separate creator-form fix |

**Bottom line: the export pipeline itself is now correct. The uploaded DOCX will not be perfect on re-export until the underlying AI suggestions are regenerated with the hardened pipeline. Want me to wire up the one-click "Re-run Pass 2 for malformed sections" admin action so you can repair this challenge in place?**

