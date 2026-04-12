

## Discover Resources Module — Complete Fix Plan (6 Changes)

### Summary
Rewrite the discovery edge function to use real web search (Serper API) instead of LLM-invented URLs, fix extraction to always summarize sparse content, output HTML from digest generation, normalize content in DigestPanel, add `access_status` column, and show access badges in SourceDetail.

### Prerequisites
- **SERPER_API_KEY** secret must be added to Supabase (user action required). Currently only `LOVABLE_API_KEY` and `RESEND_API_KEY` exist.

---

### Change 1 — Full rewrite: `discover-context-resources/index.ts`

Replace the entire file (~513 lines) with the 5-phase architecture. The function is large but it's an edge function (single file requirement). Key phases:

1. **LLM generates 12-15 search queries** from challenge context + gaps
2. **Serper API executes searches** → real URLs with real snippets (fallback: Gemini grounding if no SERPER_API_KEY)
3. **HEAD accessibility pre-check** per URL — skip paywalled/blocked domains
4. **LLM scores relevance** of accessible URLs against challenge sections (reads real snippets)
5. **Insert ALL as `discovery_status = 'suggested'`** with search snippet as seed content, trigger async extraction

Key differences from current:
- No auto-accept (removes `>= 0.85` threshold)
- Real URLs from search API, not LLM memory
- Seed content stored immediately so tabs are never empty
- `access_status` stored per source
- Existing accepted URLs used as dedup set

### Change 2 — DB Migration: Add `access_status` column

```sql
ALTER TABLE public.challenge_attachments
  ADD COLUMN IF NOT EXISTS access_status TEXT
    CHECK (access_status IN ('accessible', 'blocked', 'paywall', 'failed', 'unknown'))
    DEFAULT 'unknown';
```

### Change 3 — `extract-attachment-text/index.ts`: Always run Tier 2

**Line 268**: Change `if (extractedText.length > 500)` to always run Tier 2 summarization. For sparse/meta-only content (`url_meta_only`, `url_html_sparse`, `url_error`), use a context-aware prompt that references `att.section_key` and `att.relevance_explanation` to generate a useful summary even from metadata. For normal content, keep existing prompt but increase input to 12K chars.

### Change 4 — `generate-context-digest/index.ts`: HTML output format

**Lines 145-170**: Change the prompt from requesting markdown (`**bold**`, `### heading`) to requesting clean HTML (`<h3>`, `<p>`, `<ul><li>`). After extracting `digestText`, add post-processing to convert any residual markdown to HTML tags.

### Change 5 — `DigestPanel.tsx`: Normalize content for editor

**Line 62**: Wrap `digest?.digest_text` with `normalizeAiContentForEditor()` from `@/lib/aiContentFormatter` so the RichTextEditor always receives proper HTML regardless of what format the AI returned.

### Change 6 — Frontend: `access_status` support

| File | Change |
|---|---|
| `useContextLibrary.ts` | Add `access_status` to `ContextSource` interface and `SOURCE_COLUMNS` string |
| `SourceDetail.tsx` | Add access status badges (Accessible/Blocked/Paywall) in metadata row after ExtractionBadge |

### Files Summary

| # | File | Change |
|---|------|--------|
| 1 | `supabase/functions/discover-context-resources/index.ts` | Full rewrite — 5-phase real search + score |
| 2 | DB Migration | Add `access_status` column to `challenge_attachments` |
| 3 | `supabase/functions/extract-attachment-text/index.ts` | Always run Tier 2, context-aware for sparse |
| 4 | `supabase/functions/generate-context-digest/index.ts` | Prompt outputs HTML, post-process strips markdown |
| 5 | `src/components/cogniblend/curation/context-library/DigestPanel.tsx` | `normalizeAiContentForEditor()` on digest text |
| 6 | `src/hooks/cogniblend/useContextLibrary.ts` | Add `access_status` to type + query |
| 7 | `src/components/cogniblend/curation/context-library/SourceDetail.tsx` | Access status badges |

### Secret Required
User must add `SERPER_API_KEY` to Supabase edge function secrets (get from serper.dev — 2,500 free searches). The function includes a Gemini grounding fallback if the key is absent.

