

## Supervisor-Configurable AI Model for ALL Edge Functions

### What Changes

**Database**: Add `fallback_model` column to `ai_review_global_config` (1 ALTER). The table already has `default_model` and `critical_model`.

**Edge Functions (12 files)**: Each hardcoded function gets a shared utility to fetch the config, then uses `default_model` from DB instead of hardcoded strings. On AI gateway failure (502/503/429), retry once with `fallback_model`.

**UI**: Extend the existing AIReviewConfigPage Global Settings card to add a "Fallback Model" dropdown alongside the existing "Default Model" and "Critical Model" fields.

---

### Phase 1: Database (1 migration)

```sql
ALTER TABLE ai_review_global_config
  ADD COLUMN IF NOT EXISTS fallback_model TEXT DEFAULT 'openai/gpt-5-mini';
```

### Phase 2: Shared AI Config Utility

Create `supabase/functions/_shared/aiModelConfig.ts`:
- Fetches `default_model`, `critical_model`, `fallback_model` from `ai_review_global_config` (row id=1)
- Caches result for the function invocation lifetime
- Returns typed `{ defaultModel, criticalModel, fallbackModel }`
- Used by all 14 edge functions

### Phase 3: Update 12 Edge Functions

Replace every hardcoded `model: "google/gemini-3-flash-preview"` (or `gemini-2.5-flash`) with a call to the shared config utility. Add fallback retry on 502/503/429:

| Edge Function | Current Hardcoded Model |
|---|---|
| `ai-field-assist` | `gemini-3-flash-preview` |
| `check-challenge-quality` | `gemini-3-flash-preview` |
| `generate-challenge-spec` | `gemini-3-flash-preview` |
| `enhance-pulse-content` | `gemini-3-flash-preview` |
| `generate-spark-insights` | `gemini-3-flash-preview` |
| `refine-challenge-section` | `gemini-3-flash-preview` |
| `extract-attachment-text` | `gemini-3-flash-preview` + `gemini-2.5-flash-lite` |
| `compile-card-narrative` | `gemini-3-flash-preview` |
| `discover-context-resources` | `gemini-2.5-flash` (3 occurrences) |
| `suggest-legal-documents` | `gemini-3-flash-preview` |
| `generate-context-digest` | `gemini-2.5-flash` |
| `triage-challenge-sections` | Already reads config (just add fallback) |

Each function: import config → use `defaultModel` → on failure, retry with `fallbackModel`.

### Phase 4: UI — Extend AIReviewConfigPage

Add "Fallback Model" dropdown to the existing Global Settings card. Available models:

- `google/gemini-3-flash-preview` (recommended default)
- `google/gemini-2.5-flash`
- `google/gemini-2.5-pro`
- `google/gemini-3.1-pro-preview`
- `openai/gpt-5`
- `openai/gpt-5-mini`
- `openai/gpt-5-nano`

Supervisor selects Main, Critical, and Fallback from dropdowns. All edge functions read from this single config row.

### Summary

- **1 migration** (add `fallback_model` column)
- **1 shared utility** (`_shared/aiModelConfig.ts`)
- **12 edge function updates** (replace hardcoded → config-driven + fallback retry)
- **1 UI update** (add fallback dropdown to existing config page)
- **Zero breaking changes** — defaults match current hardcoded values

