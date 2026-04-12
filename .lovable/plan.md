

## Plan: Clear All Sources + Deselect Manual Sources

### What changes

**1. New hook: `useClearAllSources` in `useContextLibrary.ts`**
- Deletes ALL `challenge_attachments` for the challenge (both `ai_suggested` and `manual`)
- Also deletes storage files for any file-type attachments
- Deletes the `challenge_context_digest` row so digest starts fresh
- Invalidates all queries
- Toast: "All sources and digest cleared"

**2. Manual sources go to `suggested` instead of `accepted`**
- `useAddContextUrl`: change `discovery_status: 'accepted'` → `'suggested'`
- `useUploadContextFile`: change `discovery_status: 'accepted'` → `'suggested'`  
- Still trigger extraction immediately so content is ready when curator accepts
- This lets curator review and accept/reject manually-added sources just like AI ones

**3. "Clear All" button in `DrawerHeader.tsx`**
- Add a destructive "Clear All" button next to "Re-discover Sources"
- Confirm with `window.confirm()` before executing
- Disabled while clearing is in progress

**4. Wire up in `ContextLibraryDrawer.tsx`**
- Import and use `useClearAllSources`
- Pass handler to `DrawerHeader`

### Files Summary

| # | File | Change |
|---|------|--------|
| 1 | `useContextLibrary.ts` | Add `useClearAllSources` hook (~25 lines) |
| 2 | `useContextLibrary.ts` | Change manual URL/file inserts from `accepted` → `suggested` |
| 3 | `DrawerHeader.tsx` | Add "Clear All" button + props |
| 4 | `ContextLibraryDrawer.tsx` | Wire `useClearAllSources` to header |

No DB migrations needed. All components stay under 200 lines.

