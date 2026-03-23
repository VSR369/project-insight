

# Integrate Rich Text Editor + Expand/Collapse into CR/CA Intake & Fix Stale Create Data

## Summary

Two issues to fix:
1. The **ConversationalIntakePage** (CR/CA path) uses plain `Textarea` components everywhere -- no rich text editing, no expand/collapse dialogs. The AM/RQ path (`SimpleIntakeForm`) already has both.
2. Clicking **"New Challenge"** can show stale data from a previous session due to `useFormPersistence` restoring from sessionStorage.

## Changes

### File 1: `src/pages/cogniblend/ConversationalIntakePage.tsx`

**Replace Textarea with RichTextEditor + Expand Dialog for main content fields:**

- **Problem Statement** (line 994): Replace `Textarea` with `RichTextEditor` + `Maximize2` expand button + fullscreen `Dialog`
- **Expected Outcomes** (line 1022): Same treatment
- **ExpandField helper** (line 265-282): Rewrite to use `RichTextEditor` instead of `Textarea`, add expand button + fullscreen dialog using a local `useState` boolean
- **Dynamic AM fields** (line 1345): Replace `Textarea` with `RichTextEditor` + expand dialog

Each field gets:
- `RichTextEditor` (Tiptap-based) replacing the plain `Textarea`
- An "Expand" button (`Maximize2` icon) in the label row
- A fullscreen `Dialog` containing another `RichTextEditor` instance with `min-h-[60vh]`
- View mode continues using `SafeHtmlRenderer` (already in place for SimpleIntakeForm pattern)

**New imports needed:**
- `RichTextEditor` from `@/components/ui/RichTextEditor`
- `Dialog, DialogContent, DialogHeader, DialogTitle` from `@/components/ui/dialog`
- `Maximize2` from `lucide-react`
- `SafeHtmlRenderer` from `@/components/ui/SafeHtmlRenderer`
- `Controller` from `react-hook-form` (for RichTextEditor which needs `onChange` not `register`)

**ExpandField rewrite**: Since `register()` returns a ref-based binding but `RichTextEditor` uses `value`/`onChange`, convert to use `Controller` pattern. Each ExpandField will manage its own fullscreen state.

### File 2: `src/pages/cogniblend/ConversationalIntakePage.tsx` (same file)

**Clear persisted data on fresh create mount:**

Add a `useEffect` that clears the sessionStorage key `cogni_intake_conversational` when `mode === 'create'` and there is no `challengeId`. This ensures clicking "New Challenge" always starts fresh.

```typescript
useEffect(() => {
  if (mode === 'create' && !editChallengeId) {
    sessionStorage.removeItem('cogni_intake_conversational');
  }
}, []); // run once on mount
```

### File 3: `src/components/cogniblend/SimpleIntakeForm.tsx`

**Clear persisted data on fresh create mount:**

Same pattern -- add a `useEffect` to clear `cogni_intake_simple` and `cogni_intake_simple_template` when in create mode:

```typescript
useEffect(() => {
  if (mode === 'create') {
    sessionStorage.removeItem('cogni_intake_simple');
    sessionStorage.removeItem('cogni_intake_simple_template');
  }
}, []);
```

## Technical Details

- The `ExpandField` component will be converted from a simple function to accept `control` (from react-hook-form) instead of `register`, and use `Controller` + `RichTextEditor` internally
- Each expandable field needs its own `useState<boolean>` for the dialog open state. The `ExpandField` component can manage this internally.
- In view mode, fields render `SafeHtmlRenderer` instead of the editor (matching AM/RQ pattern)
- The `RichTextEditor` already supports `storagePath`, `placeholder`, `className`, and `onChange` props

**Files modified**: 2 (`ConversationalIntakePage.tsx`, `SimpleIntakeForm.tsx`)

