

## Plan: Align RichTextEditor with User's Feature Requirements

### Analysis
The existing `RichTextEditor.tsx` already uses Tiptap (the correct architecture for this stack). The user's provided code uses `document.execCommand` (deprecated, incompatible with Tiptap). Rather than replacing Tiptap, we'll add the missing features from the user's code into the existing Tiptap editor.

### Missing features to add

1. **Font family selector** (Serif/Sans/Mono dropdown) — needs `@tiptap/extension-font-family`
2. **Updated color swatches** — replace current 15 colors with user's specific 15 brand colors
3. **Save button + save status** — add optional `onSave` callback prop with status indicator in footer
4. **Media files panel** — show uploaded media list below editor with name/size/status

### Changes

#### 1. `src/components/ui/RichTextEditor.tsx`
- Add `FontFamily` Tiptap extension import
- Add font family dropdown (Serif/Sans/Mono) to Row 1 toolbar after block style dropdown
- Replace `COLOR_SWATCHES` array with user's 15 colors: `#0f172a, #1e3a5f, #1a5276, #145a32, #7b241c, #512e5f, #784212, #154360, #4d5656, #717d7e, #2980b9, #27ae60, #e74c3c, #f39c12, #8e44ad`
- Add `onSave?: (html: string) => void` to props interface
- Add save button in footer (calls `onSave` with current HTML)
- Add save status state with auto-dismiss after 3s
- Track uploaded media files in state, display panel below editor showing name/size/saved status
- All existing functionality preserved

#### 2. `package.json`
- Add `@tiptap/extension-font-family` dependency

### Files
- **Modified:** `src/components/ui/RichTextEditor.tsx`
- **Modified:** `package.json`

