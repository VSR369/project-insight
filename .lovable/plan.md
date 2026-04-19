

## Sprint 1 — TipTap Legal Editor Components (Cogniblend)

Create 5 new reusable building-block components under `src/components/cogniblend/legal/`. Standalone — not wired into any existing page. Zero modifications to existing files.

### Files to create

| # | File | ~Lines | Purpose |
|---|---|---|---|
| 1 | `LegalDocEditorPanel.tsx` | ~90 | Controlled TipTap editor with legal-doc CSS shell |
| 2 | `LegalDocEditorToolbar.tsx` | ~140 | Formatting toolbar (Bold/Italic/Underline, H2/H3, lists, quote, HR, undo/redo) with shadcn `Tooltip` |
| 3 | `LegalDocQuickInserts.tsx` | ~180 | Dropdown with 8 prebuilt legal clause templates (7 standard + 1 AGG-specific) |
| 4 | `LegalDocUploadHandler.tsx` | ~170 | DOCX (mammoth) + TXT upload, 10MB cap, replace-confirm `AlertDialog`, loading spinner, sonner toasts |
| 5 | `LegalDocSectionNav.tsx` | ~120 | Vertical 11-section navigator with status dots; exports `LEGAL_SECTIONS` constant |

### Design decisions (deltas vs admin/legal versions)

- **Controlled editor**: unlike admin's `contentVersion`-keyed reset, the new panel diffs `content` vs `editor.getHTML()` inside a `useEffect` to avoid cursor jumping, per prompt.
- **Extensions**: `StarterKit + Underline + TextAlign + Placeholder` only (lighter than admin which loads Table/Highlight/Link/CharacterCount).
- **Placeholder**: uses `@tiptap/extension-placeholder` driven by `placeholder` prop.
- **ReadOnly**: passed via `editable: !readOnly` and re-applied with `editor.setEditable()` on prop change.
- **Quick Inserts**: shadcn `DropdownMenu` (admin uses inline `Button`s) with a `DropdownMenuSeparator` between Standard Clauses (7) and Model-Specific (Non-Circumvention AGG). Each template is a real 2–3 sentence legal paragraph with numbered sub-clauses.
- **Upload Handler**: same mammoth pattern as admin hook but inlined (no Supabase storage upload — purely local conversion as the prompt does not mention persistence). 10MB guard + `AlertDialog` for replace confirmation when `hasExistingContent`.
- **Section Nav**: new component (no admin equivalent). Tailwind-only, ~220px wide, exports both component and `LEGAL_SECTIONS` constant array of 11 sections with `id` + `label` + index.

### Status badge mapping (Section Nav)

```text
pending      → bg-muted   gray dot
ai_modified  → bg-blue-500 dot + "AI" pill
reviewed     → bg-yellow-500 dot
approved     → green check icon (lucide CheckCircle2)
```

### Type exports

Each file exports its `Props` interface. `LegalDocSectionNav.tsx` additionally exports:
- `LEGAL_SECTIONS: ReadonlyArray<{ id: string; label: string }>`
- `LegalSectionStatus` type: `'pending' | 'ai_modified' | 'reviewed' | 'approved'`

### Guarantees

- 5 new files only; **no existing file touched**.
- Each file < 250 lines (R1).
- TypeScript strict; no `any` (R3).
- All deps (`@tiptap/*`, `mammoth`, shadcn primitives, `lucide-react`, `sonner`) already in `package.json` — no installs.
- CSS reused: `import '@/styles/legal-document.css'` once in the editor panel.
- Components are pure presentational/controlled — no Supabase, no React Query, no business logic (R2 layer separation respected).
- No route/page changes; existing Curation Queue, LC workspace, admin legal editor untouched.

### Out of scope (explicitly)

- No wiring into Curator or LC pages (Sprint 3 / Sprint 4).
- No persistence to DB or Supabase storage.
- No AI suggestion overlays.
- No section-level diff or version history (separate component already exists for admin).

### Validation after generation

- `npm run build` must pass with zero new errors.
- `src/components/cogniblend/legal/` contains exactly 5 new files.
- `git diff` shows only additions, no modifications.
- Existing routes (`/cogni/curation/queue`, `/cogni/lc-workspace`, `/admin/legal`) render identically.

