

## Phase 1: Production-Grade Rich Text Editor Upgrade

### Context
The project already uses Tiptap (a proper ProseMirror-based editor) — NOT contentEditable + execCommand. The user's spec is based on a contentEditable approach, but we'll implement the same requirements using Tiptap extensions, which is the correct architecture for this React/Vite stack.

### Changes

#### 1. Install additional Tiptap extensions
Add: `@tiptap/extension-underline`, `@tiptap/extension-text-style`, `@tiptap/extension-color`, `@tiptap/extension-highlight`, `@tiptap/extension-text-align`, `@tiptap/extension-link`, `@tiptap/extension-superscript`, `@tiptap/extension-subscript`, `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header`, `@tiptap/extension-horizontal-rule`, `@tiptap/extension-code-block`

#### 2. Rewrite `RichTextEditor.tsx` — Full toolbar upgrade
**Row 1:** Block style dropdown (P/H1/H2/H3/H4/Blockquote/Code Block), Font size select (10-48px via TextStyle), Bold, Italic, Underline, Strikethrough, Text color picker (15 preset swatches via popover), Highlight (yellow), Superscript, Subscript, Clear formatting

**Row 2:** Bullet list, Numbered list, Indent (sinkListItem), Outdent (liftListItem), Align Left/Center/Right/Justify, Insert Link (dialog), Unlink, Undo, Redo, Insert dropdown menu

**Insert dropdown menu:** Upload Image, Upload Audio, Upload Video, Insert Table (3×2), Insert Horizontal Rule, Info/Warning/Success/Danger Callouts

**Footer:** Live word count + character count

**Key behaviors maintained:**
- Existing media upload to Supabase Storage preserved
- YouTube/Vimeo embed preserved
- `value`/`onChange` prop contract preserved — all existing usages (CurationSectionEditor, AISpecReviewPage, StepProblem) continue working unchanged

#### 3. Create callout extension
Custom Tiptap Node extension for styled callouts (info/warning/success/danger) with colored left borders and backgrounds, insertable from the Insert menu.

#### 4. Upgrade CSS in `index.css`
Replace the existing `.tiptap` styles with the professional Word-document CSS from the spec:
- Serif font (Georgia), 14px base, 1.85 line-height
- Proper heading hierarchy (H1: 26px with border-bottom, H2: 19px blue, H3: 15px)
- Paragraph spacing (14px margin-bottom)
- Table styling (alternating rows, borders)
- Blockquote styling (blue left border)
- Callout classes (info/warning/success/danger)
- Code blocks (dark background)
- Image styling (rounded, centered, bordered)
- HR styling

#### 5. Update `aiContentFormatter.ts`
Ensure `normalizeAiContentForEditor` produces clean semantic HTML that Tiptap renders correctly with the new styles. The existing marked + DOMPurify pipeline handles this already.

#### 6. Update `AiContentRenderer.tsx` display styles
Apply the same `.editor-content` CSS classes to the read-only renderer so AI content looks identical whether displayed or being edited.

### What stays the same
- All existing `<RichTextEditor>` usages across 5 files — prop interface is backward compatible
- Supabase Storage upload flow
- `normalizeAiContentForEditor` utility
- SafeHtmlRenderer for non-editor contexts

### Files to create/modify
- **Modified:** `src/components/ui/RichTextEditor.tsx` (full rewrite with 2-row toolbar)
- **Created:** `src/lib/tiptap-callout.ts` (custom callout node extension)
- **Modified:** `src/index.css` (replace `.tiptap` styles with professional CSS)
- **Modified:** `src/components/ui/AiContentRenderer.tsx` (apply matching styles)
- **Modified:** `package.json` (new Tiptap extension dependencies)

