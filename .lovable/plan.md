

# Context Intelligence System — Implementation Plan

## Overview

A complete AI-powered context discovery, extraction, and digest system for the Curation workflow. Curators can discover relevant external resources via AI, manage a centralized Context Library, and feed verified context into AI section reviews for grounded, citation-backed output.

## What Gets Built

**3 Database Migrations** -- New columns on `challenge_attachments` (discovery tracking), new `challenge_context_digest` table, and `discovery_directives` JSONB on `ai_review_section_config` with seed data for all 27 curation sections.

**2 New Edge Functions** -- `discover-context-resources` (AI-powered web search for relevant sources per section) and `generate-context-digest` (synthesizes accepted sources into a 600-word grounded digest).

**1 Enhanced Edge Function** -- `extract-attachment-text` gains Tier 2 AI summarization (extracted_summary + extracted_key_data JSON) and increased text truncation (5K to 50K chars).

**1 Enhanced Edge Function** -- `review-challenge-sections` gets 4 fixes: Pass 1 batch-filtered attachments, context digest injection, enhanced attachment format with summaries/key data, and a grounding rule requiring [INFERENCE] tags on unverified claims.

**1 New Hook** -- `useContextLibrary.ts` with ~11 queries/mutations covering discovery, accept/reject, upload, URL add, sharing, section relinking, digest regeneration.

**2 New Components** -- `ContextLibraryDrawer.tsx` (900px Sheet with source list, detail panel, digest viewer) and `ContextLibraryCard.tsx` (right-rail summary card with source/suggestion counts).

**1 New Admin Component** -- `DiscoveryDirectivesEditor.tsx` for configuring per-section discovery rules in Prompt Studio.

**2 Updated Components** -- `SectionReferencePanel` (add "View in Library" link), `CurationReviewPage` (wire card + drawer state).

**1 Updated Admin Page** -- `AIReviewConfigPage` saves `discovery_directives` JSONB.

## Technical Details

### Execution Sequence (10 Prompts)

| # | Scope | Type | Dependencies |
|---|-------|------|-------------|
| 7.1 | Add `discovery_directives` JSONB to `ai_review_section_config` + seed 27 sections | DB Migration | None |
| 7.2 | Add 8 columns to `challenge_attachments` + create `challenge_context_digest` table with RLS | DB Migration | None |
| 7.3 | `discover-context-resources` edge function | Edge Function | 7.1, 7.2 |
| 7.4 | `generate-context-digest` edge function | Edge Function | 7.2 |
| 7.5 | Enhance `extract-attachment-text` with Tier 2 summarization | Edge Function | 7.2 |
| 7.6 | `useContextLibrary.ts` hook (queries + mutations) | Frontend Hook | 7.2, 7.3, 7.4, 7.5 |
| 7.7 | `ContextLibraryDrawer.tsx` | Frontend Component | 7.6 |
| 7.8 | `ContextLibraryCard.tsx` + wire into CurationReviewPage + SectionReferencePanel link | Frontend Component | 7.7 |
| 7.9 | Fix Pass 1 + inject digest + grounding rule in `review-challenge-sections` | Edge Function | 7.2 |
| 7.10 | `DiscoveryDirectivesEditor.tsx` + wire into ResearchTab/AIReviewConfigPage | Admin Component | 7.1 |

### Key Integration Points

- **CurationReviewPage** (4394 lines): Add `contextLibraryOpen` state, render `ContextLibraryCard` in right rail after `CompletenessChecklistCard`, render `ContextLibraryDrawer` at component bottom.
- **SectionReferencePanel** (427 lines): Add `onOpenLibrary` prop and "View in Library" link.
- **review-challenge-sections** (1855 lines): 4 targeted changes at lines ~1510, ~1578, ~1690, ~1668.
- **extract-attachment-text** (260 lines): Additive Tier 2 after existing extraction.
- **AIReviewConfigPage** (782 lines): Add `discovery_directives` to form state and save query.

### Database Schema Changes

**`challenge_attachments` new columns:** `discovery_source` (manual/ai_suggested/creator_uploaded), `discovery_status` (suggested/accepted/rejected), `resource_type`, `relevance_explanation`, `confidence_score` (NUMERIC 3,2), `suggested_sections` (TEXT[]), `extracted_summary`, `extracted_key_data` (JSONB).

**New table `challenge_context_digest`:** `challenge_id` (unique FK), `digest_text`, `key_facts` (JSONB), `source_count`, `generated_at`. RLS: authenticated read, service_role write.

**`ai_review_section_config` new column:** `discovery_directives` (JSONB) with per-section seeds defining priority, max_resources, resource_types with search query templates using `{{domain}}`, `{{geography}}`, `{{industry}}` variables.

### Zero Breaking Changes

All existing components, hooks, stores, and edge functions continue working unchanged. The system is purely additive.

