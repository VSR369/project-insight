
## Goal
Ensure the “Add Question” dialog **never closes** when the user Alt+Tabs away and returns (or clicks outside). The dialog must **only** close via explicit buttons (Cancel, Save/Create, and the “X” close button).

---

## What we know from current code
- We already added:
  - `onInteractOutside={(e) => e.preventDefault()}`
  - `onPointerDownOutside={(e) => e.preventDefault()}`
- Yet the dialog **still closes** after Alt+Tab.
- The dialog is **controlled** by the parent page (`formOpen` state). So if Radix calls `onOpenChange(false)`, the page sets `formOpen=false` and the dialog disappears.

This means: even if we attempt to prevent dismissal, **Radix is still triggering `onOpenChange(false)`** in an Alt+Tab scenario (likely via focus/escape-related dismissal events that we are not currently intercepting).

---

## 5-Why Analysis (updated with evidence)
### Why #1: Why does the dialog disappear when Alt+Tabbing away and returning?
Because `formOpen` becomes `false`, so the controlled `<Dialog open={formOpen} …>` closes and unmounts the form UI.

### Why #2: Why does `formOpen` become `false`?
Because Radix fires `onOpenChange(false)` in response to an internal “dismiss” event when focus/interaction changes during Alt+Tab.

### Why #3: Why didn’t our existing `onInteractOutside` and `onPointerDownOutside` prevent it?
Because Alt+Tab can cause dismissal through events that are **not covered** by those handlers (commonly `onFocusOutside`, and sometimes `onEscapeKeyDown` / auto-focus close behaviors).

### Why #4: Why does Radix treat Alt+Tab as a dismiss trigger?
Radix Dialog uses a “dismissable layer” pattern. Focus leaving the document/window can be interpreted as leaving the dialog’s focus scope, which can trigger dismissal unless explicitly blocked.

### Why #5: Why is the bug persistent even after adding preventDefault handlers?
Because even if we block some dismissal paths, **any remaining dismissal path** that calls `onOpenChange(false)` will still close the dialog in controlled mode. We must:
1) block *all relevant* dismiss events, and  
2) **defensively ignore** unintended close requests unless the user explicitly pressed a close button.

---

## Solution Design (defense-in-depth)
We will implement a two-layer fix:

### Layer A — Block all relevant Radix dismiss events
In `InterviewKitQuestionForm.tsx`, add the missing Radix handlers:
- `onFocusOutside={(e) => e.preventDefault()}`
- `onEscapeKeyDown={(e) => e.preventDefault()}` (optional but recommended since “only close with buttons”)

Keep:
- `onInteractOutside`
- `onPointerDownOutside`

This covers more dismissal pathways than the current implementation.

### Layer B — “Only close with buttons” enforcement (hard guarantee)
Even with Layer A, some environments can still trigger `onOpenChange(false)` due to focus quirks. So we’ll add a guard that **ignores close requests** unless we explicitly allow them.

Implementation approach:
1) Add a local `allowCloseRef` in `InterviewKitQuestionForm`.
2) Wrap the dialog’s `onOpenChange`:
   - If `open === true`: always allow (opening is fine)
   - If `open === false`: only allow when `allowCloseRef.current === true`
3) When the user clicks:
   - Cancel
   - Submit success (Create/Save)
   - X button
   we set `allowCloseRef.current = true` then call `onOpenChange(false)`.

#### Important detail: the current “X” is rendered inside `src/components/ui/dialog.tsx` automatically.
That built-in Close button will trigger `onOpenChange(false)` without giving us a chance to set `allowCloseRef`.

So we must do one of the following:
- Option 1 (preferred): Update the shared `DialogContent` wrapper to support `hideCloseButton?: boolean`, and in this form pass `hideCloseButton` and render our own X button inside the form header.
- Option 2 (more localized): Stop using the shared `DialogContent` wrapper here and directly use Radix primitives so we can fully control the close button.

Given maintainability, Option 1 is preferred (backward compatible, minimal disruption).

---

## Exact Implementation Steps (code changes)
### 1) Update shared Dialog wrapper to support hiding the default close button
**File:** `src/components/ui/dialog.tsx`

- Extend `DialogContent` props to include:
  - `hideCloseButton?: boolean`
- Default: `false` (so no other dialogs change).
- Only render `<DialogPrimitive.Close …>` if `hideCloseButton !== true`.

This is safe and backward compatible.

### 2) Harden InterviewKitQuestionForm against dismiss + enforce “close only by buttons”
**File:** `src/pages/admin/interview-kit/InterviewKitQuestionForm.tsx`

- Add:
  - `const allowCloseRef = useRef(false);`
- Wrap `onOpenChange`:
  - Allow open always
  - Allow close only if `allowCloseRef.current` is true
- Add to `<DialogContent …>`:
  - `onFocusOutside={(e) => e.preventDefault()}`
  - `onEscapeKeyDown={(e) => e.preventDefault()}`
  - keep existing outside handlers
  - pass `hideCloseButton`
- Add a custom X close button in the dialog header area:
  - On click:
    - `allowCloseRef.current = true;`
    - `onOpenChange(false);`

- Update Cancel button:
  - Before closing:
    - `allowCloseRef.current = true;`
    - `onOpenChange(false);`

- Update submit success close:
  - Before closing:
    - `allowCloseRef.current = true;`
    - `onOpenChange(false);`

### 3) (Optional) Add minimal diagnostic logging during verification (dev only)
If needed for verification, we can temporarily add a structured `logInfo` entry in the guarded `onOpenChange` to confirm whether close requests are coming from Radix during Alt+Tab. (Must be removed once confirmed, per “no console.log” standards.)

---

## Testing Checklist (must pass)
1) Open “Add Question”
2) Type into Question Text and Expected Answer
3) Alt+Tab to another application/window
4) Return to browser
   - Dialog remains open
   - Data remains in the fields
5) Click outside overlay
   - Dialog remains open
6) Press Escape
   - Dialog remains open
7) Click Cancel
   - Dialog closes
8) Click X
   - Dialog closes
9) Submit (Create/Save)
   - Dialog closes after success

---

## Risk / Impact
- Low risk: Changes to `DialogContent` are backward compatible (`hideCloseButton` defaults to false).
- Stronger guarantee: Even if Radix triggers a close event unexpectedly, the guard prevents state from changing unless the close is user-authorized.

---

## Files that will change
- `src/components/ui/dialog.tsx`
- `src/pages/admin/interview-kit/InterviewKitQuestionForm.tsx`
