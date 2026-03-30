

# Fix: Eligibility & Visibility AI Generating Invalid Codes

## Root Cause (3 bugs)

### Bug 1: Wrong Column Names in Master Data Fetch (CRITICAL)
**File:** `supabase/functions/review-challenge-sections/index.ts`, lines 216-223

`fetchMasterDataOptions()` queries `md_solver_eligibility` with `SELECT code, name` — but the table has no `name` column, only `label`. The query returns `null` for the label field, so the AI prompt receives codes with `null` labels like `"certified_expert (null)"`. Without meaningful labels, the AI ignores the allowed list and invents codes like "registered_companies", "sap_certified_partners", etc.

Same issue for `md_challenge_complexity` — queries `code, name` but columns are `complexity_code, complexity_label`.

**Fix:** Change the queries:
- `md_solver_eligibility`: `SELECT code, label` → map `r.label`
- `md_challenge_complexity`: `SELECT complexity_code, complexity_label` → map as `{ code: r.complexity_code, label: r.complexity_label }`

### Bug 2: Visibility Uses Wrong Master Data (HIGH)
**File:** `supabase/functions/review-challenge-sections/index.ts`, lines 181-185

`STATIC_MASTER_DATA.visibility` is set to `["anonymous", "named", "verified"]` — these are **challenge visibility** codes (public/private). But the `visibility` section in curation review is a `checkbox_multi` for **solver visibility tiers** which should use the same `md_solver_eligibility` codes (certified_basic, registered, open_community, etc.).

**Fix:** Remove the static visibility entry and populate `result.visibility` from the same `md_solver_eligibility` fetch (or a copy of it), since solver eligibility and visibility use the same tier codes.

### Bug 3: Pass 2 (Rewrite) Has No Master Data Injection (HIGH)
**File:** `supabase/functions/review-challenge-sections/promptTemplate.ts`, lines 562-677

`buildPass2SystemPrompt()` injects templates, quality criteria, frameworks — but **never injects the allowed values list**. So even though Pass 1 might see the valid codes, Pass 2 (which generates the actual suggestion array) operates unconstrained and invents free-text codes.

**Fix:** Accept `masterDataOptions` as a parameter in `buildPass2SystemPrompt()` and inject allowed values per section, with a strict enforcement instruction.

## Changes

### File 1: `supabase/functions/review-challenge-sections/index.ts`
- Fix `fetchMasterDataOptions()`:
  - Change eligibility query to `SELECT code, label` and map `r.label`
  - Change complexity query to `SELECT complexity_code, complexity_label` and map correctly
  - Add `result.visibility = result.eligibility` (same tier codes)
- Remove stale `STATIC_MASTER_DATA.visibility` entry (keep `challenge_visibility` as-is)
- Pass `masterDataOptions` to `buildPass2SystemPrompt()` calls

### File 2: `supabase/functions/review-challenge-sections/promptTemplate.ts`
- Update `buildPass2SystemPrompt()` signature to accept `masterDataOptions`
- Inject allowed values for each section in the per-section enrichment loop
- Add strict enforcement: "You MUST only output codes from this list. Do NOT invent new codes."

### Deployment
- Redeploy `review-challenge-sections` edge function

## Impact
- Eligibility AI suggestions will only contain valid codes: certified_basic, certified_competent, certified_expert, registered, expert_invitee, signed_in, open_community, hybrid
- Visibility AI suggestions will use the same valid tier codes
- Complexity master data will also be correctly labeled

