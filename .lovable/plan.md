

## Fix: Curator Guide Modal Stability & Visibility

### Problems Identified

1. **Modal disappears on overlay click** — `Dialog` passes `onOpenChange={setGuideOpen}` directly, so clicking outside the modal closes it immediately without the user clicking either CTA
2. **ESC key closes without intent** — Same issue; ESC fires `onOpenChange(false)` bypassing the "Show again later" / "Got it" flow
3. **No visible close button** — `hideCloseButton` is set to `true`, so there's no X button for explicit dismissal
4. **Tooltip exists and works** — The HelpCircle button with `<TooltipContent>Curation Guide</TooltipContent>` is already in place (confirmed in CurationHeaderBar.tsx lines 144-152)

### Fix (1 file: `CuratorGuideModal.tsx`)

**Prevent accidental dismissal:**
- Add `onPointerDownOutside={(e) => e.preventDefault()}` to `DialogContent` — prevents overlay click from closing
- Add `onEscapeKeyDown={(e) => e.preventDefault()}` — prevents ESC from closing
- Remove `hideCloseButton` — show the built-in X close button so users have an explicit way to dismiss (acts like "Show again later")

**Improve layout visibility:**
- Change `max-w-3xl` to `max-w-4xl` for more breathing room
- Ensure the modal has proper z-index stacking by keeping the Dialog's built-in overlay

### Changes

```typescript
// CuratorGuideModal.tsx — DialogContent update
<DialogContent
  className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-0"
  onPointerDownOutside={(e) => e.preventDefault()}
  onEscapeKeyDown={(e) => e.preventDefault()}
>
```

Remove `hideCloseButton` so the X button appears (clicking X = "Show again later" behavior, just closes without setting localStorage flag).

### Files changed
| File | Change |
|------|--------|
| `CuratorGuideModal.tsx` | Prevent overlay/ESC dismissal, show X button, widen modal |

