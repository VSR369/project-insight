

# Plan — Per-button spinners on Pass 3 / Organize so the active op is visually distinct

## Root cause (confirmed)

`LcSourceDocUpload` accepts a single `pass3Busy` prop (`isRunning || isOrganizing`) and uses it to drive the spinner on **both** buttons. When Organize runs, the **Re-run AI Pass 3** button also flips its `Sparkles` icon to a spinning `Loader2`, making the user believe Pass 3 is also executing. The mutex/server side is correct — only the visual signal is wrong.

## Fix — Split the spinner flag; keep the disable flag combined

Two files change.

### 1. `src/components/cogniblend/lc/LcSourceDocUpload.tsx`

- Replace the single prop:
  ```ts
  pass3Busy?: boolean;
  ```
  with two:
  ```ts
  isRunningPass3?: boolean;
  isOrganizing?: boolean;
  ```
- Default both to `false` in the destructure.
- Compute internally for the disabled logic so mutual exclusion is preserved:
  ```ts
  const pass3Busy = isRunningPass3 || isOrganizing;
  ```
- **Re-run AI Pass 3 button** — spinner driven by `isRunningPass3` only:
  ```tsx
  {isRunningPass3 ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
  ```
- **Re-organize (Organize & Merge) button** — spinner driven by `isOrganizing` only:
  ```tsx
  {isOrganizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
  ```
- `disabled={isBusy || pass3Busy}` stays on both buttons → still mutually exclusive.

### 2. `src/pages/cogniblend/LcLegalWorkspacePage.tsx`

Replace the single prop on the `<LcSourceDocUpload>` instance:

```tsx
// before
pass3Busy={pass3.isRunning || pass3.isOrganizing}

// after
isRunningPass3={pass3.isRunning}
isOrganizing={pass3.isOrganizing}
```

No other call sites use `pass3Busy` (search confirms `LcSourceDocUpload` is the only consumer). No DB, edge function, hook, or dialog change. Both files stay ≤ 250 lines (R1).

## Behaviour after fix

| User clicks | Re-run AI Pass 3 button icon | Re-organize button icon | Both buttons disabled? |
|---|---|---|---|
| Re-run AI Pass 3 | `Loader2` spinning | `FileText` static | Yes |
| Re-organize | `Sparkles` static | `Loader2` spinning | Yes |
| Neither | `Sparkles` static | `FileText` static | No |

Mutual exclusion preserved (mutex + combined `pass3Busy` for `disabled`); only the operation actually running shows a spinner.

## Verification

1. Click **Re-organize** → only the Organize button spins; Pass 3 button shows static `Sparkles` and is disabled. Toast/progress/status reflect Organize. DB row → `ai_review_status='organized'`.
2. Click **Re-run AI Pass 3** → only the Pass 3 button spins; Organize button shows static `FileText` and is disabled. DB row → `ai_review_status='ai_suggested'`.
3. Same-tick double-click on different buttons → mutex still wins; second click shows the existing info toast; only the first button spins.
4. `npx tsc --noEmit` passes; touched files ≤ 250 lines.

## Out of scope

- Mutex logic (already correct).
- Edge function, DB, dialog, progress-bar, or status-strip changes.
- Renaming statuses or columns.

