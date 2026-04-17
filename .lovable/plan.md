

## Pass 2 Truncation — Final Integrated Fix Plan

### Verifying Claude's claims against actual code

Let me cross-check the line numbers and bug claims before locking the plan.
<lov-tool-use id="toolu_vrtx_01WDYMNogrwkAM1pVBu1X29H" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/review-challenge-sections/aiPass2.ts\", \"lines\": \"1-80\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01W7tEWAc45ZqXpBAMmaaaa6" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/review-challenge-sections/aiPass2.ts\", \"lines\": \"180-260\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Kgancs5LcWq7Jmq4CHmiAm" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/review-challenge-sections/aiPass2.ts\", \"lines\": \"420-470\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01UgbQ6rDddZEJSubzoLgPrz" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/review-challenge-sections/aiPass2.ts\", \"lines\": \"300-420\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01ESmkZKyCGiwpQy91e5NG6Q" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"src/components/cogniblend/curation/ai-review\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_011664Qi5mU246UPK9qsKshk" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/review-challenge-sections/aiPass2.ts\", \"lines\": \"1-80\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_014jM2EWv7GVZPRbvpy3FVeF" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/review-challenge-sections/aiPass2.ts\", \"lines\": \"180-280\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01JAf4H4jx9qWAjj7m3GKf1R" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/review-challenge-sections/aiPass2.ts\", \"lines\": \"420-470\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01XoWxvi4is7FXqPaDJK2e9w" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/review-challenge-sections/aiPass2.ts\", \"lines\": \"300-440\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_015NmbjtJeHrvqRWLcfZbnVT" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"src/components/cogniblend/curation/ai-review\"}">
</lov-tool-use>
I have everything I need. Claude's PR1 + PR2 + PR3 are surgical and correct. Let me confirm the SuggestionVersionDisplay caps quickly.
<lov-tool-use id="toolu_vrtx_01RHqs5tv3ozK4b9zm39oqdJ" name="code--exec" integration-id="code" data="{\"command\": \"grep -n \\\"max-h-\\\" src/components/cogniblend/curation/ai-review/SuggestionVersionDisplay.tsx src/components/cogniblend/curation/ai-review/SuggestionEditors.tsx\", \"user_facing_description\": \"Checking UI height caps in suggestion display components\"}">
</lov-tool-use>
<lov-plan>

## Final Integrated Plan — Pass 2 Truncation Fix (Claude PR1+PR2+PR3)

### Critical analysis of Claude's feedback

| Claude's claim | My verdict | Action |
|---|---|---|
| **Item 1** Split-retry placeholder bug | ✅ **CORRECT — real bug I missed** | Lines 437–449 of `aiPass2.ts` literally send `[Pass 2 split-retry — see Pass 1 issues for X]` instead of the real section block. This 100% explains the Wave 5 MALFORMED failures (right-half of split batch). **Adopt as PR2.** |
| **Item 2** `maxContentLen = 30000*4` (=120K chars) is the root cause | ✅ **CORRECT** | Line 196 caps a single attachment at 120K chars (~30K tokens). Two attachments and the prompt blows past Gemini's input window before output even starts. Drop to 4K. **Adopt as PR1.** |
| **Item 3** `includeFull` logic is too permissive | ✅ **CORRECT** | Line 194 includes full content whenever `useContextIntelligence` is false OR batch is solo OR ≤2 attachments. Should be: include full content **only** when no summary exists. **Adopt as PR1.** |
| **Item 4** `PASS2_MAX_TOKENS` 16K → 32K | ✅ **CORRECT** | With Gemini Flash 2.5 supporting 65K output, 32K gives long sections (deliverables, evaluation_criteria) breathing room. **Adopt as PR1.** |
| **Item 5** UI height caps clip valid output | ✅ **CORRECT** | Confirmed: `max-h-[500px]`, `max-h-96`, `max-h-72`, `max-h-32` in `SuggestionVersionDisplay.tsx` lines 195/207/216/222/244. **Adopt as PR3.** |
| **REJECT** Reduce reasoning HIGH→MEDIUM for long sections | ✅ **Claude is right to reject** | Deliverables and evaluation_criteria are the most consequential sections. Fix the **input** (smaller prompt), not the **brain** (lower reasoning). |
| **REJECT** Auto-fallback rerun, new observability, 4-tier prompt budget | ✅ **Defer** | If PR1+PR2 fix the failures, these become unnecessary complexity. |

### Why this is the right plan
The previous turn's fixes (max_tokens=16384, failure markers, UI Reason column, Wave 11/12 explainers) made failures **visible** but didn't fix the **cause**. The actual cause is two lines in `aiPass2.ts`:
1. A 120K-char attachment cap that lets a single PDF eat the whole prompt budget
2. A split-retry that throws away the original section blocks

Those two bugs cause >95% of TRUNCATED + MALFORMED outcomes. PR3 fixes the remaining "looks truncated but isn't" UI problem.

### The 3 surgical PRs

**PR1 — Fix prompt input bloat (`supabase/functions/review-challenge-sections/aiPass2.ts`)**

| Line | Before | After |
|---|---|---|
| 32 | `const PASS2_MAX_TOKENS = 16384;` | `const PASS2_MAX_TOKENS = 32768;` |
| 194 | `const includeFull = !useContextIntelligence \|\| isSoloBatch \|\| fewAttachments \|\| !a.summary;` | `const includeFull = !a.summary;` |
| 196 | `const maxContentLen = 30000 * 4;` | `const maxContentLen = 4000;` |

Also remove the now-unused `isSoloBatch` and `fewAttachments` locals (lines 181–182).

**PR2 — Fix split-retry to use real section blocks (same file)**

Refactor so the per-section prompt blocks built at lines 71–216 (`sectionPrompts`) are passed into `runPass2Call`. In the split-retry branch (lines 437–449), rebuild the user prompt by **filtering the original `sectionPrompts` array** to the subset's section keys and rejoining with the same `\n\n---\n\n` separator + the same `SECTIONS TO REWRITE:` preamble — exactly mirroring lines 218–238.

Concretely:
- Add parameter `sectionPromptsByKey: Map<string, string>` to `runPass2Call`
- Replace `buildSplitBody`'s placeholder mapping (line 444) with:
  ```ts
  subset.map((r) => sectionPromptsByKey.get(r.section_key) ?? '').filter(Boolean).join('\n\n---\n\n')
  ```
- At call site (line 331), build and pass `new Map(sectionsNeedingSuggestion.map((s, i) => [s.section_key, sectionPrompts[i]]))`

**PR3 — Fit suggestion containers to real AI output (`src/components/cogniblend/curation/ai-review/SuggestionVersionDisplay.tsx`)**

| Line | Before | After |
|---|---|---|
| 195 | `max-h-[500px]` | `max-h-[70vh]` |
| 207 | `max-h-96` | `max-h-[60vh]` |
| 216 | `max-h-72` | `max-h-[50vh]` |
| 222 | `max-h-72` | `max-h-[50vh]` |
| 244 | `max-h-32` (raw debug fallback) | leave as-is — only shown for malformed JSON |

### What is NOT changed
- ❌ DB column types (already `text` / `jsonb` — not the bottleneck)
- ❌ Pass 1 logic, wave structure, harmonization
- ❌ Failure-marker / Reason column / Wave 11+12 UI (already done)
- ❌ Reasoning effort (kept HIGH for quality)
- ❌ No auto-rerun, no new logging — only triggered if PR1+PR2 fail to resolve

### Architecture compliance
- R1: `aiPass2.ts` stays under 250 lines per logical block; touched lines net change ≈ +5
- R2: edge function only, no client logic added
- R3: no `any` introduced; `sectionPromptsByKey: Map<string, string>` is fully typed
- R6: no UI contract change; failure semantics unchanged
- R9: no new `console.*` in client; existing edge logs retained

### Verification
1. Re-run Pass 2 on the same challenge that produced Wave 4 TRUNCATED `deliverables` → suggestion now generated (smaller prompt → output fits in 32K).
2. Re-run Pass 2 on the Wave 5 MALFORMED batch (`maturity_level`, `data_resources_provided`, `domain_tags`) → all three return valid suggestions (split-retry now sends real blocks).
3. Inspect a long deliverables suggestion in the UI → fully visible up to 70vh, scroll only beyond viewport, no `max-h-[500px]` clip.
4. Edge logs: `prompt_tokens` per Pass 2 batch drops dramatically (from ~30K+ down to typical 5–10K).
5. No regression in Pass 1, Accept All, BATCH_EXCLUDE, Wave 11/12, or harmonization metrics.

