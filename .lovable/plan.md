## Root Cause Analysis

I inspected the database, the editor hook, and the registration acceptance card. The findings:

### Finding 1 — Publish IS persisting (the perceived bug is a display issue)
Querying `legal_document_templates` directly:

| document_code | version_status | is_active | content length |
|---|---|---|---|
| DPA | ACTIVE | true | **5614 chars** |
| DPA | DRAFT | false | 0 |
| PRIVACY_POLICY | DRAFT | false | 0 |

So the DPA you edited and published **did save 5614 chars of HTML to the `content` column** and was correctly flipped to `ACTIVE`. The Publish flow works.

The reason it *looks* broken is Finding 2 — when you re-open the editor, the canvas is empty, so you assume nothing was saved.

### Finding 2 — Editor shows empty on Edit (real bug)
In `LegalDocEditorPanel.tsx`:

```ts
React.useEffect(() => {
  if (editor && content) editor.commands.setContent(content);
}, [editor, contentVersion]);   // depends on contentVersion only
```

On mount the template query is still loading, so `content === ''`. When the template resolves and `editorState.content` becomes the 5614-char HTML, this effect does **not** re-run because `contentVersion` is still `0`. Result: blank editor even though data exists.

`contentVersion` is only bumped on file uploads, never on initial template load or when switching IPAA sections.

### Finding 3 — Privacy Policy is not yet streamable
There is no `ACTIVE` row for `PRIVACY_POLICY` (only an empty DRAFT seeded by the prior migration). Once Finding 2 is fixed, the admin can paste content + Publish and the registration card will pick it up automatically — `usePlatformLegalTemplate` already filters `is_active=true` and reads `template_content ?? content`.

### Finding 4 — Minor noise
`LegalDocPublishDialog` triggers a "Function components cannot be given refs" warning (Radix passes a ref through `AlertDialogAction`). Cosmetic, not blocking.

---

## Fix Plan

### A. Make the editor reliably load saved content (`LegalDocEditorPanel.tsx`)
Replace the version-only dependency with content-aware sync that runs whenever the incoming `content` string changes AND differs from what TipTap currently has — without clobbering the user's in-progress edits:

```ts
React.useEffect(() => {
  if (!editor) return;
  const current = editor.getHTML();
  // Skip if identical (prevents cursor jump while typing)
  if (current === content) return;
  // Only push when (a) editor is empty, or (b) caller bumped contentVersion
  // (used by file upload + IPAA section switch)
  editor.commands.setContent(content || '', false);
}, [editor, content, contentVersion]);
```

### B. Bump `contentVersion` in the hook on real content swaps (`useLegalDocEditor.ts`)
- When the template query resolves for the first time → `setContentVersion(v => v + 1)`.
- In `handleSectionContentChange` callers / IPAA section switching path → bump version when the active section changes (handled in the page by passing `activeSection` into `contentVersion`).

This guarantees the TipTap instance is reseeded after async load and after section switches.

### C. Strengthen `handlePublish` to use the freshest code (`useLegalDocEditor.ts`)
`handlePublish` currently prefers `template?.document_code` over `config.document_code`. For brand-new docs this can be stale until the template query refetches. Reorder priority:

```ts
const code = (config.document_code ?? template?.document_code ?? defaultCode) as string;
```

Also, after `handleSave()` inside publish for new docs, await one tick for `persistedId` to settle before publishing — otherwise the publish call no-ops.

### D. Mirror content into both columns on save (defensive, `useLegalDocumentTemplates.ts`)
Some readers (legacy) hit `template_content`, some hit `content`. To eliminate the read/write mismatch permanently, on every `useSaveLegalDocDraft` and `useCreateLegalDocTemplate`, write the HTML into **both** `content` and `template_content`. The registration card and admin preview already read `template_content ?? content` so this is forward-compatible and removes a class of bugs.

### E. Confirm streaming into Seeker enrollment
No code change needed in `PlatformLegalAcceptCard` / `usePlatformLegalTemplate` — they already:
- filter `is_active=true`
- order by `effective_date DESC`
- coalesce `template_content ?? content`

After fixes A–D, once the admin opens DPA, sees the 5614-char content, optionally edits, and clicks Publish → the seeker enrollment Compliance step will stream the published HTML into the "View" dialog, with the scroll-95% gate already wired.

For Privacy Policy: the empty DRAFT row is a placeholder. Admin needs to open it, paste content, and Publish. After fix A, the editor will correctly show what they type / paste, and publish will persist + stream.

### F. Fix the ref warning (`LegalDocPublishDialog.tsx`)
Wrap the component in `React.forwardRef` (or simply ensure no parent passes a ref). Low priority but trivial — done in same pass.

---

## Files Touched
- `src/components/admin/legal/LegalDocEditorPanel.tsx` — content-aware sync effect
- `src/hooks/admin/useLegalDocEditor.ts` — bump `contentVersion` on template load + section change; reorder code priority in `handlePublish`
- `src/pages/admin/legal/LegalDocumentEditorPage.tsx` — pass section-aware version to panel
- `src/hooks/queries/useLegalDocumentTemplates.ts` — mirror HTML into `content` + `template_content` on save & create
- `src/components/admin/legal/LegalDocPublishDialog.tsx` — `forwardRef` wrapper

## What This Does NOT Change
- DB schema (no migration needed — both columns already exist)
- RLS policies (already correct: supervisor / senior_admin can write; everyone reads `is_active=true`)
- `PlatformLegalAcceptCard` UX or scroll gate
- Any other legal document family (SPA / SKPA / PWA / CPA_*)

## Verification Steps After Implementation
1. Open `/admin/legal-documents/<DPA id>/edit` → editor shows the 5614 chars instead of blank.
2. Edit, wait 2s → "All changes saved" appears; DB `updated_at` advances.
3. Click Publish → row stays `ACTIVE`, `effective_date` = today.
4. Open Privacy Policy DRAFT, paste content, Publish → DB row flips `ACTIVE` with content.
5. Start a Seeker registration → Compliance step → click "View" on Privacy Policy and DPA → admin-published HTML streams into the dialog → scroll to bottom → checkboxes enable.
