
# Fix: Interview KIT Dialog Closing on Alt+Tab (5-Why Analysis)

## 5-Why Root Cause Analysis

### Why #1: Why does the dialog disappear when pressing Alt+Tab?
The Radix UI Dialog component's overlay triggers a close event when the window loses focus (blur event) or when focus moves outside the dialog.

### Why #2: Why does focus loss trigger the dialog to close?
The Radix UI Dialog has default behaviors where:
- Clicking outside the dialog (overlay) closes it
- When the browser window loses focus, Radix interprets this as "focus moved outside"

### Why #3: Why wasn't this prevented by our previous fix?
The previous fix only addressed:
1. `refetchOnWindowFocus: false` - prevents data refresh, not dialog closing
2. `hasInitializedRef` - prevents form reset, but dialog is already closed by then

**The dialog closure happens BEFORE any form logic runs** because it's a Radix UI primitive behavior.

### Why #4: Why doesn't Radix UI provide an option to prevent this?
It actually does! Radix Dialog has props:
- `onPointerDownOutside` - event when clicking outside
- `onInteractOutside` - event when any interaction happens outside (including focus loss)
- `onFocusOutside` - event when focus moves outside

Calling `event.preventDefault()` on these events prevents the dialog from closing.

### Why #5: Why wasn't this implemented initially?
The form was created following the standard pattern which uses the default Dialog behavior. The requirement to keep the dialog open during tab switches is a specific UX need that requires explicit configuration.

---

## Root Cause Summary

| Factor | Impact |
|--------|--------|
| `onInteractOutside` default behavior | Dialog closes when focus leaves the component (Alt+Tab) |
| `onPointerDownOutside` default behavior | Dialog closes when clicking outside (on overlay) |
| Standard Dialog component | Doesn't expose these props, uses defaults |

---

## Solution: Prevent Dialog Close on Focus Loss

### Approach
Per user requirement: **"Only close with buttons"** - the dialog should only close when the user explicitly clicks Cancel or the X button, NOT when:
1. Clicking outside the dialog
2. Switching apps with Alt+Tab
3. Window loses focus for any reason

### Changes Required

**File 1: `src/pages/admin/interview-kit/InterviewKitQuestionForm.tsx`**

Add `onInteractOutside` and `onPointerDownOutside` handlers to `DialogContent` that call `event.preventDefault()` to block the default close behavior.

```tsx
// Current code
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">

// Fixed code - prevent closing on outside interaction
<DialogContent 
  className="max-w-2xl max-h-[90vh] overflow-y-auto"
  onInteractOutside={(e) => e.preventDefault()}
  onPointerDownOutside={(e) => e.preventDefault()}
>
```

This is a minimal, targeted fix that:
1. Keeps the dialog open when Alt+Tab is pressed
2. Keeps the dialog open when clicking outside
3. Allows the Cancel button and X to still work normally
4. Does NOT affect other dialogs in the system

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/interview-kit/InterviewKitQuestionForm.tsx` | Add `onInteractOutside` and `onPointerDownOutside` handlers to prevent auto-close |

---

## Technical Details

The Radix UI Dialog component emits these events before closing:
- `onPointerDownOutside`: Fired when user clicks on overlay
- `onInteractOutside`: Fired when any interaction occurs outside (focus, click, touch)
- `onFocusOutside`: Fired when focus moves outside

By calling `preventDefault()` on these events, we stop the dialog from responding to them.

```tsx
// From Radix Dialog documentation
// These handlers receive DismissableLayerEvents
onInteractOutside={(event: Event) => {
  event.preventDefault(); // Prevents dialog from closing
}}
```

---

## Testing Checklist

After implementation:
- [ ] Open "Add Question" dialog
- [ ] Fill in some form fields
- [ ] Press Alt+Tab to switch to another window
- [ ] Return to the browser
- [ ] **Dialog should still be open**
- [ ] **Form data should be preserved**
- [ ] Click outside the dialog (on dark overlay)
- [ ] **Dialog should NOT close**
- [ ] Click Cancel button - dialog should close
- [ ] Click X button - dialog should close
- [ ] Submit the form - dialog should close after success

---

## Why This Solution Works

| Issue | Solution |
|-------|----------|
| Alt+Tab closes dialog | `onInteractOutside` with `preventDefault()` blocks this |
| Click outside closes dialog | `onPointerDownOutside` with `preventDefault()` blocks this |
| Cancel/X buttons still work | These use `onOpenChange` which is unaffected |
| Form data lost | With dialog staying open, form data is preserved |

---

## Pattern for Other Dialogs

If other dialogs need this behavior, apply the same pattern:

```tsx
<DialogContent
  onInteractOutside={(e) => e.preventDefault()}
  onPointerDownOutside={(e) => e.preventDefault()}
>
  {/* ... */}
</DialogContent>
```

This is a targeted solution following the principle of minimal changes to fix the specific issue.
