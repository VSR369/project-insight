

## Fix 2 — Enhanced File Upload UI in ContextLibraryDrawer

### What Changes

The current implementation has basic file upload but the user wants an improved UX with:

1. **`addMode` toggle** — Replace `showUrlInput` boolean with `'url' | 'file' | null` state so URL and File panels are mutually exclusive
2. **Suggested count badge** — Show "N awaiting review" badge next to the title
3. **URL validation** — Validate with `new URL()` before submitting
4. **File size validation** — Check 20MB limit with user-friendly alert
5. **Dedicated file upload row** — When "Upload Document" is clicked, show a separate row with file info text, section selector, and close button (instead of immediately opening file picker)
6. **Better button labels** — "Upload Document" instead of "Upload File"

### File: `src/components/cogniblend/curation/ContextLibraryDrawer.tsx`

- Replace `showUrlInput: boolean` with `addMode: 'url' | 'file' | null`
- Add `suggestedCount` memo
- Add `Badge` and `FileText` imports, add `cn` import
- Add URL validation in `handleAddUrl`
- Add file size check in `handleFileChange`
- Restructure header: title row with badge, then action bar, then conditional URL/file rows
- Move file `<input>` into the file upload row panel
- Add supported formats description text in file row

No other files affected. ~170 lines total, well within the 250-line limit.

