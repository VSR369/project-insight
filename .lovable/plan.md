

# Fix: Uploaded Document Content Not Applied to TipTap Editor

## Root Cause

`LegalDocEditorPanel` has a one-shot content initialization:
```typescript
if (editor && content && !isInitialized) {
  editor.commands.setContent(content);
  setIsInitialized(true);
}
```
Once `isInitialized` is `true`, subsequent `content` prop changes (from uploads) are silently ignored. The TipTap editor keeps showing the old content.

## Fix

### Step 1: Add a `contentVersion` counter to `useLegalDocEditor`

Add a `contentVersion` state (number) that increments every time `handleContentChange` is called from an **external source** (upload). Distinguish upload-driven changes from user-typing changes.

- Add `contentVersion` state initialized to `0`
- Create a new method `setUploadedContent(html)` that calls `setEditorState`, `setIsDirty(true)`, AND increments `contentVersion`
- Keep `handleContentChange` (from typing) as-is — no version bump needed
- Return `contentVersion` from the hook

### Step 2: Update `LegalDocEditorPanel` to accept and react to `contentVersion`

- Add `contentVersion: number` to props
- Change the `useEffect` to watch `contentVersion` instead of `!isInitialized`:
  ```
  useEffect(() => {
    if (editor && content) {
      editor.commands.setContent(content);
    }
  }, [editor, contentVersion]);
  ```
- This fires on initial load (version 0) AND on every upload (version 1, 2, ...)

### Step 3: Update `LegalDocumentEditorPage` to wire it

- Pass `contentVersion={editor.contentVersion}` to `LegalDocEditorPanel`
- Update `handleUploadContent` to call `editor.setUploadedContent(html)` instead of `editor.handleContentChange(html, null)`

## Files Changed

| File | Change |
|---|---|
| `src/hooks/admin/useLegalDocEditor.ts` | Add `contentVersion` state + `setUploadedContent` method |
| `src/components/admin/legal/LegalDocEditorPanel.tsx` | Accept `contentVersion` prop, use it in useEffect |
| `src/pages/admin/legal/LegalDocumentEditorPage.tsx` | Pass `contentVersion`, use `setUploadedContent` in upload handler |

3 files, minimal changes. Fixes the issue for all legal document types.

