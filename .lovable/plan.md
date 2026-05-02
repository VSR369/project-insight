## Root cause

Inspected `legal_document_templates`. Found three concrete defects:

1. **CPA templates store raw Markdown.** `CPA_QUICK`, `CPA_STRUCTURED`, `CPA_CONTROLLED` `template_content` starts with `# Challenge Participation Agreement…`, `## 1. Parties`, `- **Challenge:**…`. TipTap is an HTML editor — it renders these as flat lines of plain text. No headings, no bullets, no spacing.
2. **The seed loader feeds raw Markdown to the editor.** `getDefaultTemplateContent()` in `src/constants/legalDefaults.constants.ts` returns the markdown string verbatim. `useLegalDocEditor` writes it straight into `editorState.content`, and `LegalDocEditorPanel` passes it to TipTap — which displays `#` and `**` as literal characters.
3. **`RA_R2`, `PRIVACY_POLICY`, `DPA` share the wrong body.** All three currently hold the JBM "Digital Workforce" proposal HTML (5,524–5,614 chars, identical opening). They are HTML-formatted but the content is wrong / placeholder for a different document.

Net effect: every CPA published from the seeded defaults is unreadable, and the three privacy/role docs hold mis-seeded copy.

## Fix plan

### A. Stop seeding raw Markdown — convert at the seed boundary

In `src/hooks/admin/useLegalDocEditor.ts`, change the `?code=` seeding branch to run the seed string through `markdownToHtml()` (already exists at `src/utils/markdownToHtml.ts` and supports headings, lists, bold, paragraphs). The editor will then receive valid HTML and render proper headings, bullets, and spacing.

```text
const seed = getDefaultTemplateContent(defaultCode);
if (seed) {
  const html = markdownToHtml(seed);          // NEW
  setEditorState(prev => ({ ...prev, content: html, contentJson: null }));
  ...
}
```

This single change fixes every future "Create" action for `RA_R2` and the three CPA modes.

### B. Rewrite the seed templates as well-structured Markdown

Tighten `src/constants/legalDefaults.constants.ts` and `src/constants/cpaDefaults.constants.ts` so the source markdown produces clean HTML after conversion:

- Use `#` for the title, `##` for clauses, `###` for sub-clauses (5.1, 5.2…).
- Blank line between every block (heading, paragraph, list) — required by the parser to break paragraphs correctly.
- Bullet lists for parties / definitions / deliverables, using `- ` consistently.
- Bold (`**Label:**`) for inline labels (Challenge, Prize, Deadline) followed by the value on the same line.
- Numbered sub-points stay under their parent heading via blank-line separation, not by inlining.
- Add missing standard sections to QUICK/STRUCTURED so they render as multi-section contracts (Acceptance, Governing Law, Confidentiality where appropriate).

### C. Repair the existing rows in the database

Run a migration that:

1. **Backs up** current `template_content` / `content_html` into a one-time `template_content_backup` JSONB column on the affected rows (or to an audit row) so nothing is lost.
2. For `CPA_QUICK`, `CPA_STRUCTURED`, `CPA_CONTROLLED` — replace `template_content` (and `content` legacy column, if populated) with the **HTML** version produced from the new structured Markdown. Bumps `version` and re-publishes (`version_status='ACTIVE'`).
3. For `RA_R2` — replace the mis-seeded JBM HTML with the proper Seeker-Org-Admin Role Agreement HTML rendered from the new template.
4. For `PRIVACY_POLICY` and `DPA` — these need correct content, not the JBM proposal. Provide a structured starter HTML for each (Privacy Policy: data controller, categories collected, lawful basis, retention, subject rights, contact; DPA: parties, processing scope, sub-processors, security measures, data transfers, breach notification, audits, term, governing law). Mark as `version_status='ACTIVE'` so the Health card clears.
5. Updates `updated_at` and `updated_by` for audit.

Because the migration needs to write final HTML, the SQL will embed the converted HTML strings directly (generated locally from the same Markdown the app uses, so source and DB stay in sync).

### D. Verify the renderer pipeline (no code change expected)

`LegalDocumentViewer` already injects content via `dangerouslySetInnerHTML` inside `.legal-doc-page > .legal-doc`, and `src/styles/legal-document.css` styles `h1/h2/h3/p/ul/ol/li`. Once the rows hold real HTML, both the in-app preview and the acceptance modal will render correctly with no further changes. Same for the TipTap editor on Edit — it already syncs incoming HTML through `setContent`.

### E. Streaming during Seeker Org enrollment

`PRIVACY_POLICY` and `DPA` are already wired into the legal-gate stream (`useLegalGate` + `roleToDocumentMap`). Once their `version_status` is `ACTIVE` with real content (step C.4), the enrollment flow will pull and display them automatically — no additional wiring needed. We will smoke-test by walking through Seeker enrollment in the preview after deploy.

## Files to change

- `src/constants/cpaDefaults.constants.ts` — rewrite the three CPA Markdown templates with proper structure + blank-line separation.
- `src/constants/legalDefaults.constants.ts` — rewrite RA_R2 Markdown the same way; add structured Markdown defaults for `PRIVACY_POLICY` and `DPA`; extend `getDefaultTemplateContent` to cover them.
- `src/hooks/admin/useLegalDocEditor.ts` — pipe `getDefaultTemplateContent(...)` through `markdownToHtml(...)` before placing it into `editorState.content`.
- `supabase/migrations/<new>.sql` — backup + overwrite `template_content` (HTML) for the 5 affected rows, set `version_status='ACTIVE'`, bump `version`, refresh `updated_at`.

No changes to `LegalDocEditorPanel`, viewer, or CSS required.

## Verification checklist

1. Open Admin → Legal Documents → Edit each of CPA_QUICK / STRUCTURED / CONTROLLED / RA_R2 / PRIVACY_POLICY / DPA. Editor shows proper H1/H2, paragraphs, bullets — not raw `#` / `-`.
2. Click Publish → row stays `ACTIVE`, Health card shows green.
3. Open the public viewer (acceptance modal) for each → contract-grade typography.
4. Walk through Seeker Org enrollment → Privacy Policy and DPA appear in the legal stream and can be accepted.
5. Click "Create" from any of the 4 dedicated cards → editor opens pre-filled with structured HTML, not Markdown literals.
