
## Yes — this is a real UI issue

I reviewed the current implementation and the reference sheet. Even without changing browser zoom, the modal is not fully viewport-safe, so at higher zoom levels it can look trimmed or cramped.

### What is causing it
1. `CuratorGuideModal.tsx` uses `max-w-4xl max-h-[90vh]` but does not set a viewport-safe width like `w-full max-w-[90vw]`.
2. The dialog primitive itself defaults to `w-full max-w-lg`; only `max-w-4xl` is being overridden, so the modal is not explicitly optimized for zoomed/narrower viewports.
3. The “Time You Get Back” section is hard-coded as `grid-cols-3`, so it stays 3 columns even when browser zoom reduces usable width.
4. The header/body/footer use fixed padding, which makes the content feel tighter sooner at high zoom.
5. The tooltip trigger already exists in the header (`HelpCircle` + `TooltipContent`), so that part is present.

### Important clarification
A web app cannot control the browser’s zoom level. What we should fix is:
- make the instruction sheet adapt better to the available viewport
- prevent clipping/trimming at common zoom levels
- make the content reflow cleanly

## Fix plan

### 1) Make the modal viewport-safe
Update `CuratorGuideModal.tsx` so the dialog uses a width pattern like:
- `w-[calc(100vw-2rem)]`
- `max-w-5xl` or `max-w-[90vw]`
- `max-h-[90vh]`

This ensures the sheet respects the visible browser area instead of feeling cut off.

### 2) Improve internal layout responsiveness
Adjust section layouts so they collapse earlier and more gracefully:
- review flow: keep `grid-cols-1 lg:grid-cols-3`
- AI coverage: keep `grid-cols-1 lg:grid-cols-2`
- time savings: change from `grid-cols-3` to `grid-cols-1 lg:grid-cols-3`

This is the main reason the content feels trimmed at zoomed widths.

### 3) Reduce visual crowding
Tighten the modal into a cleaner readable structure:
- slightly reduce padding on smaller widths
- keep header and footer fixed
- keep body scrollable with `flex-1 min-h-0 overflow-y-auto`
- add a little more right/left breathing room only on large screens

### 4) Make the close/help behavior clearer
Keep the visible close button and retain the existing tooltip trigger in the header.
I’ll also make sure the help trigger has a clearer accessible label/tooltip text such as:
- “Open curation guide”
- tooltip: “View guide”

### 5) Align more closely with the reference design
Refine the content block spacing so it feels more like a professional instruction sheet:
- stronger header hierarchy
- cleaner metric cards
- simpler dependency callout
- consistent text sizing and line lengths

## Files to update
| File | Change |
|------|--------|
| `src/components/cogniblend/curation/CuratorGuideModal.tsx` | Make width viewport-safe, improve responsive grids, spacing, and readability |
| `src/components/cogniblend/curation/CurationHeaderBar.tsx` | Keep/possibly refine tooltip label and accessibility text |

## Expected result
After this fix, the instruction sheet should:
- no longer appear trimmed at common zoom levels
- adapt better to available screen width
- remain readable without looking crowded
- still open automatically on first challenge visit
- still be re-openable anytime from the tooltip/help button

## Note from review
I could not fully verify the live modal in the preview because the browser session opened on the login screen, but the current code clearly shows the responsiveness issue and the tooltip is already implemented.
