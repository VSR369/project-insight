
Goal
- The “Add Question” dialog must not disappear on Alt+Tab.
- Additionally (per your answer), if anything causes the page/dialog to remount (token refresh, transient guard loading, etc.), the dialog should automatically reopen and restore the in-progress draft (foolproof, first-time-right).

What I found in the code (important)
1) The dialog already blocks outside dismiss and Escape via:
- onInteractOutside / onPointerDownOutside / onFocusOutside / onEscapeKeyDown → preventDefault()
- plus a “close only with buttons” guard in handleOpenChange()

2) Despite that, you still see the dialog disappear. That strongly indicates the dialog is not being “dismissed” by Radix events anymore, but instead the parent page state is being reset because the page subtree temporarily unmounts/remounts (common causes: auth token refresh → guard rerender, role query refresh edge cases, or any transient full-screen loader in AdminGuard/AuthGuard). When that happens, the local React state `formOpen` resets to its initial value (false), so the dialog disappears.

3) There is also a correctness bug in InterviewKitQuestionForm:
- closeDialog() currently calls `onOpenChange(false)` directly (parent setter) and bypasses the guard handler `handleOpenChange()`.
- This doesn’t explain Alt+Tab closure by itself, but it is still wrong and will undermine the “close only with buttons” design over time (and makes debugging harder).

5-Why (updated root cause)
Why #1: Why does the dialog disappear after Alt+Tab?
- Because `open={formOpen}` becomes false, so the controlled dialog closes.

Why #2: Why does `formOpen` become false?
- Because the component that owns `formOpen` (InterviewKitQuestionsPage) is likely being remounted (local state resets), or something calls its `setFormOpen(false)` during a guard transition.

Why #3: Why would the page remount on Alt+Tab?
- Supabase commonly refreshes tokens and triggers auth-related state updates when the tab regains focus (your network logs show refresh token calls). Even if you remain authenticated, some parts of the app can briefly render loading/redirect gates (AdminGuard/AuthGuard) or refetch role data, causing the subtree to unmount and mount again.

Why #4: Why do we lose the dialog state on remount?
- Because `formOpen` and the form draft currently live only in component memory (useState / useForm). Remount = everything resets.

Why #5: Why wasn’t this prevented by earlier “preventDefault” handlers?
- Because those handlers only prevent Radix “dismiss” events. They cannot protect you from React component remounts or parent state resets.

Foolproof solution (defense-in-depth)
Layer A — Fix the local dialog correctness bug (so the “close only with buttons” logic is internally consistent)
- Change closeDialog() to close via the guarded handler, not by calling the parent setter directly.
  - Instead of: allowCloseRef.current = true; onOpenChange(false)
  - Do: allowCloseRef.current = true; handleOpenChange(false)
- Ensure allowCloseRef is reset correctly after a successful authorized close.

Layer B — Persist dialog open-state + draft to sessionStorage and auto-restore on remount (this is the “never lose work” guarantee)
- In InterviewKitQuestionsPage (parent owner of formOpen):
  - When opening the dialog (Add or Edit), write a small “dialog session” record to sessionStorage, e.g.:
    - isOpen: true
    - mode: "new" | "edit"
    - editingQuestionId (if edit)
    - defaultCompetencyId / current filters context (optional)
    - timestamp (for cleanup)
  - When closing the dialog intentionally (Cancel/X/Submit success), clear that sessionStorage record.

- In InterviewKitQuestionForm (child form):
  - Persist draft form values to sessionStorage as the user types (debounced ~300ms) using react-hook-form’s watch().
  - On mount/open:
    - If a draft exists and dialog session says “isOpen: true”, restore the form values and keep dialog open.
    - If editing an existing question:
      - Prefer the saved draft if present (user may have started editing), otherwise load from the question record.
  - On successful submit:
    - Clear draft + dialog session.

Layer C — Add targeted, structured debug instrumentation to confirm the exact closure mechanism (then remove)
- Add temporary structured logs (using your existing error/log standards in src/lib/errorHandler.ts) to record:
  - InterviewKitQuestionsPage mount/unmount events (useEffect cleanup)
  - Any time setFormOpen(false) is called, with a “reason” tag:
    - user_cancel
    - user_x
    - submit_success
    - parent_unmount_restore
    - unknown_close_request
  - Any time InterviewKitQuestionForm handleOpenChange receives newOpen=false (and whether it was ignored/accepted)
- This will tell us definitively whether Alt+Tab is:
  - causing a subtree remount, OR
  - still triggering an unexpected close request.

Files to change (implementation)
1) src/pages/admin/interview-kit/InterviewKitQuestionForm.tsx
- Fix closeDialog to route through the guarded handler (not direct parent setter).
- Add sessionStorage draft save/restore:
  - Key example: interviewKitQuestionDraft:{competencyId}:{mode}:{questionIdOrNew}
  - Debounced watch save.
  - Restore on open.
- Add temporary structured logs for open/close events (remove after confirmation).

2) src/pages/admin/interview-kit/InterviewKitQuestionsPage.tsx
- Add sessionStorage “dialog session” persistence:
  - When opening: set session.isOpen=true
  - When closing intentionally: clear session
- On component mount:
  - If session.isOpen=true, automatically set formOpen(true) and restore editingQuestion based on session.
- Add temporary structured logs for mount/unmount + formOpen changes.

3) (Optional, if needed after logs) src/hooks/useUserRoles.ts
- Make role query more stable on focus to reduce guard churn:
  - refetchOnWindowFocus: false
  - (and/or) keepPreviousData-like behavior (TanStack v5 patterns) to avoid transient “rolesLoading” gates.
- This isn’t required if Layer B is implemented (Layer B will survive remounts), but it reduces the chances of remounts.

Acceptance tests (must pass)
1) Open Add Question dialog, type into multiple fields.
2) Alt+Tab away for 5–30 seconds, then return.
   - Dialog is still open OR (if remount happened) it automatically reopens within 0–1s.
   - Draft text is preserved.
3) Click outside overlay → dialog stays open.
4) Press Escape → dialog stays open.
5) Click Cancel → dialog closes and draft is cleared.
6) Reopen Add Question → starts fresh (no old draft).
7) Start typing, then hard refresh the page (optional test) → dialog auto-reopens with draft (since you requested auto-restore).

Why this will be “foolproof”
- Even if Radix emits an unexpected dismiss, Layer A prevents unauthorized close.
- Even if the entire page remounts due to auth/role refresh, Layer B restores both “open” state and the exact in-progress draft.
- Layer C gives us hard evidence of the closure mechanism so we can eliminate any remaining edge cases rather than guessing.

Non-blocking improvement noticed (separate from Alt+Tab)
- There’s a console warning: “Function components cannot be given refs… Check render method of InterviewKitQuestionForm at FormField”.
- After the Alt+Tab fix, we should also eliminate this warning by ensuring the specific FormControl child components used with FormField are forwardRef-compatible (likely a specific SelectTrigger/FormControl usage path). This doesn’t cause the dialog closure, but it’s worth cleaning up for stability.

Next step
- After you approve this plan, I’ll implement Layers A–C. Then we’ll reproduce Alt+Tab once and use the new structured logs to confirm whether the issue was dismiss-driven or remount-driven (and we’ll remove the temporary logs once confirmed).
