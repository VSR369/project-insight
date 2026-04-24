

# Final Plan: Client-Side CPA Template Variable Interpolation

## Goal
Render real challenge values inside CPA template previews everywhere (`{{challenge_title}}`, `{{ip_clause}}`, `{{prize_amount}}`, `{{jurisdiction}}`, etc.) without changing the DB template, the `assemble_cpa` RPC, AI passes, or any reviewed-mode flow. Missing values render as styled `[Not set: …]` chips so the preview doubles as a completion checklist.

Affects three preview surfaces (QUICK, STRUCTURED, CONTROLLED all share the same templates):
1. `CreatorLegalPreview` — Creator form modal
2. `ChallengeLegalDocsCard` — Creator challenge detail card
3. `LegalDocsSectionRenderer` — Curator curation page

## Approach (validated against architecture)
Build a pure interpolator service that mirrors the **server-side `assemble_cpa` substitution rules exactly** — same variable keys, same `ip_clause` CASE, same `escrow_terms` (CONTROLLED only), same `anti_disintermediation` (AGG only). Feed it current draft values + org name + geo context.

Why client-side at draft time: no `challenge_legal_docs` row exists pre-freeze, so the only way to show populated content is to interpolate locally using the same rules the server will use later.

## Files

### NEW — `src/services/legal/cpaPreviewInterpolator.ts` (~140 lines)
Pure functions, zero DB calls. Per project rule R2 (services hold business logic) and the directory convention (`src/services/[domain]/`).
- `buildPreviewVariables(input)` → resolves the same 17 keys `assemble_cpa` emits, including the IP clause CASE, escrow CASE (CONTROLLED only), anti-disint CASE (AGG only).
- `interpolateCpaTemplate(template, vars, mode)` → regex `/\{\{([a-z_]+)\}\}/gi` replace. Empty values render as `<span class="legal-preview-missing">[Not set: Friendly Label]</span>` in `'preview'` mode, or remain `{{key}}` in `'strict'` mode.
- `analyzeTemplateCompleteness(template, vars)` → `{ total, filled, missing, missingNames }` for the completeness banner.
- Friendly labels + IP clause CASE table exported from a new `src/constants/legalPreview.constants.ts`.

### NEW — `src/hooks/queries/useGeoContextForOrg.ts` (~50 lines)
Mirrors the SELECT inside `assemble_cpa`:
```sql
SELECT region_name, array_to_string(data_privacy_laws, ', ')
FROM geography_context gc JOIN countries co ON gc.country_codes @> ARRAY[co.code]
WHERE co.id = <org.hq_country_id>
```
Returns `{ jurisdiction, governing_law }` with the same `'Applicable jurisdiction'` / `'As per applicable regulations'` defaults. `staleTime: 15min` (config data — per R4).

### NEW — `src/constants/legalPreview.constants.ts`
- `CPA_VARIABLE_LABELS: Record<string, string>` — friendly labels for missing-field markers (e.g. `challenge_title → 'Challenge title'`).
- `IP_CLAUSE_TEXT: Record<string, string>` — exact strings from `assemble_cpa` (IP-EA, IP-NEL, IP-EL, IP-JO, fallback).
- Re-exported via `src/constants/index.ts`.

### EDIT — `src/components/cogniblend/creator/CreatorLegalPreview.tsx`
- Add `templateContext?: CpaTemplateContext` prop.
- Compute `interpolatedContent` via `useMemo` from `cpaTemplate?.template_content` (or override content). Override (uploaded DOCX/TXT) is rendered as-is — no interpolation.
- Compute `completeness` via `useMemo`.
- Pass `interpolatedContent` to `LegalDocumentViewer` inside the View Template dialog.
- Replace the existing static "Variables like `{{...}}` are auto-filled" line with a dynamic legend: `"X/Y variables filled. Z still pending: …"` plus a one-line note that missing values appear as `[Not set: …]` markers.

### EDIT — `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`
Build `templateContext` from form values + `currentOrg` + `useGeoContextForOrg(orgId)`:
```ts
const watched = form.watch();  // single subscribe (R5-safe — before conditional returns)
const { data: geo } = useGeoContextForOrg(currentOrg?.organizationId);
const templateContext = useMemo(() => buildPreviewVariables({
  challenge_title: watched.title,
  problem_statement: watched.problem_statement,
  scope: watched.scope,
  ip_model: watched.ip_model,
  governance_mode: governanceMode,
  operating_model: engagementModel,
  prize_amount: watched.platinum_award,
  currency: watched.currency_code,
  submission_deadline: watched.submission_deadline,
  seeker_org_name: currentOrg?.orgName,
  jurisdiction: geo?.jurisdiction,
  governing_law: geo?.governing_law,
}), [watched, governanceMode, engagementModel, currentOrg?.orgName, geo]);
```
Pass `templateContext={templateContext}` to `<CreatorLegalPreview />`.

### EDIT — `src/components/cogniblend/challenges/ChallengeLegalDocsCard.tsx`
- Add `templateContext?: CpaTemplateContext` prop.
- For non-`SOURCE_DOC` rows (i.e. assembled CPA) where the DB content may still contain residual `{{vars}}`, run `interpolateCpaTemplate(viewingDoc.content, templateContext, 'preview')` before passing to `LegalDocumentViewer`.
- Uploaded `SOURCE_DOC` replacement content stays as-is.

### EDIT — `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx`
Build `templateContext` from already-loaded `challenge` + org name and pass to `ChallengeLegalDocsCard`.

### EDIT — `src/components/cogniblend/curation/renderers/LegalDocsSectionRenderer.tsx`
- Extend `LegalDocDetail` typing to optionally include `content` / `content_html`.
- Add `templateContext?: CpaTemplateContext` prop.
- Add a small View dialog (mirroring `ChallengeLegalDocsCard`) with `LegalDocumentViewer` rendering `interpolateCpaTemplate(content, templateContext, 'preview')`.
- Updates to the curation page that already loads challenge data (`useCurationData`) to pass the context down.

### EDIT — `src/styles/legal-document.css`
Add `.legal-preview-missing` rule: amber background chip (`#FEF3C7` / `#92400E`), small padding, monospace, so missing fields stand out without breaking print typography. (Same look Claude proposed, isolated in CSS instead of inline styles per R10 “no inline styles”.)

## Explicit non-changes
- `assemble_cpa` RPC — unchanged. Server remains source of truth at freeze.
- `seed_default_legal_docs` RPC — unchanged.
- `org_legal_document_templates` rows — unchanged (still store `{{vars}}`).
- AI Pass 1 / Pass 2 / Pass 3 — unchanged.
- UNIFIED_SPA reviewed-mode flow — unchanged.
- Solver `CpaEnrollmentGate` — unchanged (already reads assembled doc post-freeze).
- LC / FC / Curator legal workspace logic — unchanged (only the curator preview *renderer* gets interpolation for preview display).
- Org-level CPA template editor — unchanged.
- QUICK uploaded replacement (`SOURCE_DOC`) — never interpolated; shown verbatim.

## Why this is better than gating the View button
A gated button hides what the Creator most wants to see. Inline `[Not set: Field Name]` chips turn the preview into a live checklist of what still needs to be filled — same UX consistently across QUICK, STRUCTURED, CONTROLLED.

## Adjustments from Claude's draft
- File location moved to `src/services/legal/cpaPreviewInterpolator.ts` (project R10 / directory standard) instead of `src/lib/cogniblend/legal/…`.
- Inline `<span style="…">` replaced with a CSS class `.legal-preview-missing` (R10 — no inline styles).
- `ip_clause` resolution **must mirror the server CASE text** (full clause sentence, not the IP code label). The server uses different strings than Claude's `IP_MODEL_LABELS`. Keeping them identical avoids divergence between draft preview and post-freeze document.
- Geo context (`jurisdiction`, `governing_law`) added via a real hook (`useGeoContextForOrg`) instead of being hard-nulled.
- `escrow_terms` (CONTROLLED only) and `anti_disintermediation` (AGG only) are interpolated too — Claude's draft missed them.
- `useMemo` deps consolidated to a single `form.watch()` subscribe to stay R5-compliant (no individual `form.watch('field')` calls in the deps array).

## Verification checklist
- Open View Template in QUICK with empty draft → all variables render as `[Not set: …]` chips; banner reads `0/N filled`.
- Fill title, prize, currency, IP model, problem statement → those values appear in preview live; banner counts update.
- Switch IP model among IP-EA / IP-NEL / IP-EL / IP-JO / none → `{{ip_clause}}` updates with the **exact** server clause text.
- Switch governance mode to CONTROLLED → `{{escrow_terms}}` populates with prize/currency.
- Switch engagement model to AGG → `{{anti_disintermediation}}` populates.
- Org name appears from `currentOrg`; jurisdiction + governing law appear from `geography_context`.
- QUICK uploaded replacement document still shows raw uploaded content (no interpolation).
- ChallengeLegalDocsCard View shows interpolated content for assembled docs.
- Curator preview shows interpolated content.
- After freeze, the actual assembled document still matches server output (no DB change).
- `npx tsc --noEmit` passes.

