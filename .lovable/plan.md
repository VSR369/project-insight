

# Gap Analysis: Context Intelligence Plan vs. Implementation

## Summary

All 10 prompts (7.1–7.10) have been implemented. I found **3 functional gaps** and **2 structural gaps**.

---

## Gap 1 (FUNCTIONAL): Pass 1 batch-filtered attachments NOT implemented

**Plan says (Prompt 7.9, Change A):** Inside the batch loop, filter attachments so only sections in the current batch are included:
```typescript
const batchKeySet = new Set(batchKeys);
for (const [sk, refs] of Object.entries(attachmentsBySection)) {
  if (!batchKeySet.has(sk)) continue;
```

**Reality (index.ts line 1717):** ALL attachments from every section are dumped into every batch prompt — no filtering by `batchKeys`.

**Impact:** Token waste, potential context window overflow, and cross-contamination of irrelevant references in batch prompts.

**Fix:** Add `batchKeySet` filter at line 1717.

---

## Gap 2 (FUNCTIONAL): Pass 2 missing context digest + grounding rule

**Plan says (Prompt 7.9, Change B):** Inject `contextDigestText` into Pass 2 system prompt:
```typescript
pass2SystemPrompt = contextIntel + contextDigest + '\n\n' + pass2SystemPrompt;
```

**Reality (index.ts line 756):** Pass 2 only prepends `contextIntel` — no `contextDigestText`. The digest is only injected into Pass 1 (line 1710).

**Plan also says:** Add grounding rule to Pass 2 user prompt.

**Reality:** Grounding rule only appears in Pass 1 attachment block (line 1742). Pass 2 has no grounding rule.

**Impact:** Pass 2 rewrites are ungrounded — AI generates content without the verified digest or grounding constraints, undermining the entire context intelligence system for the content generation step (which is the step that matters most).

**Fix:** 
1. Pass `contextDigestText` to the `buildPass2` call site and inject into Pass 2 system prompt.
2. Add grounding rule to Pass 2 per-section attachment blocks.

---

## Gap 3 (FUNCTIONAL): Pass 2 attachment format missing summary/keyData

**Plan says (Prompt 7.9, Change C):** Pass 2 per-section attachment blocks should include `KEY POINTS`, `VERIFIED DATA`, and `resource_type`.

**Reality (index.ts line 690-694):** Pass 2 attachment rendering is basic — no summary, no keyData, no resourceType:
```typescript
`--- [${typeTag}] ${a.name} [${shareTag}] ---\n${a.sourceUrl ? ...}${a.content}`
```

**Impact:** Pass 2 rewrites miss AI-extracted summaries and structured data, reducing quality of generated content.

**Fix:** Update Pass 2 attachment block construction to match Pass 1 format (include summary, keyData, resourceType).

---

## Gap 4 (FUNCTIONAL): Digest fetch missing `key_facts` column

**Plan says:** Context digest injection should include `key_facts`:
```typescript
`VERIFIED KEY FACTS:\n${JSON.stringify(digest.key_facts, null, 2)}`
```

**Reality (index.ts line 1546):** Query only selects `digest_text, source_count` — missing `key_facts`. The injected text has no key facts section.

**Fix:** Add `key_facts` to the select query and include in the digest text block.

---

## Gap 5 (STRUCTURAL): Component decomposition not done

Already identified in prior audit:
- `DiscoveryDirectivesEditor.tsx` is 334 lines (plan says extract `DiscoveryResourceTypeCard.tsx`)
- Section approval logic not extracted from `CurationReviewPage.tsx` into `SectionApprovalCard/List` + `useSectionApprovals` hook

**Impact:** Functional — none. Maintainability — violates 300-line component rule.

---

## Implementation Plan

### Step 1: Fix Pass 1 batch filtering (Gap 1)
File: `supabase/functions/review-challenge-sections/index.ts` line ~1717
Add `batchKeySet` filter before iterating `attachmentsBySection`.

### Step 2: Fix Pass 2 digest + grounding + attachment format (Gaps 2, 3, 4)
File: `supabase/functions/review-challenge-sections/index.ts`
1. Line ~1546: Add `key_facts` to digest select query
2. Line ~1550: Include key_facts in digest text
3. Line ~756: Inject `contextDigestText` into Pass 2 system prompt
4. Lines ~690-696: Update Pass 2 attachment block to include summary, keyData, resourceType, and grounding rule

### Step 3: Deploy edge function
Redeploy `review-challenge-sections`.

### Step 4: Extract DiscoveryResourceTypeCard (Gap 5)
Extract resource type card from `DiscoveryDirectivesEditor.tsx` into `DiscoveryResourceTypeCard.tsx`.

### Step 5: Extract section approval components (Gap 5)
Extract from `CurationReviewPage.tsx` into `SectionApprovalCard.tsx`, `SectionApprovalList.tsx`, and `useSectionApprovals.ts`.

---

## Files Changed: 4–6

| File | Action |
|------|--------|
| `supabase/functions/review-challenge-sections/index.ts` | Fix batch filter + Pass 2 digest/grounding/attachments + key_facts |
| `src/components/admin/prompt-studio/DiscoveryResourceTypeCard.tsx` | NEW — extract from DiscoveryDirectivesEditor |
| `src/components/admin/prompt-studio/DiscoveryDirectivesEditor.tsx` | Refactor to use DiscoveryResourceTypeCard |
| `src/components/cogniblend/approval/SectionApprovalCard.tsx` | NEW — extract from CurationReviewPage |
| `src/components/cogniblend/approval/SectionApprovalList.tsx` | NEW — extract from CurationReviewPage |
| `src/hooks/cogniblend/useSectionApprovals.ts` | NEW — extract from CurationReviewPage |

**Risk:** Steps 1–3 are additive changes to the edge function. Steps 4–5 are pure refactors with no functional change.

