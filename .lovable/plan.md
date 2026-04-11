

## Convert Context Library from Side Drawer to Fullscreen Dialog

### Problem
The Context Library currently opens as a 900px right-aligned Sheet (drawer), which feels narrow and cramped for reviewing sources, reading extracted text, and managing suggestions. The user wants a fullscreen experience with a clear Close option.

### Approach
Replace the `Sheet` / `SheetContent` wrapper with a fullscreen `Dialog` / `DialogContent` — similar to the existing `SectionFullscreenModal` pattern already in the codebase.

### Changes

**1. `src/components/cogniblend/curation/ContextLibraryDrawer.tsx`**
- Replace `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` imports with `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from `@/components/ui/dialog`
- Apply fullscreen sizing: `w-[calc(100vw-80px)] max-w-none h-[calc(100vh-80px)]` on `DialogContent` (matches the existing `SectionFullscreenModal` pattern)
- Keep all internal layout (header actions, source list + detail split, digest panel) exactly the same
- The Dialog component already renders a built-in X close button in the top-right corner
- Remove the inline `style` prop hack (no longer needed since Dialog doesn't have the `sm:max-w-sm` issue)

### No other files change
- `CurationReviewPage.tsx` already passes `open` and `onOpenChange` — Dialog uses the same props
- All child components (`SourceList`, `SourceDetail`, `DigestPanel`) are layout-agnostic

### Technical Detail
- The `Dialog` close button is built into `DialogContent` by default (the X icon at top-right)
- The fullscreen sizing gives ~95% of viewport space vs the previous fixed 900px drawer
- The source list and detail panel will have more horizontal room, improving readability of Full Text and Key Data tabs

