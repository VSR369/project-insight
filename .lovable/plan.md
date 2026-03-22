

# Plan: Fix RQ Routing, Enforce Path Isolation, Clean Up Dead Code

## Issues Identified

### 1. Challenge Requestor Opens Challenge Creator Screen
**Root cause**: In `DemoLoginPage.tsx`, the RQ user's `aiDestination` is `/cogni/challenges/create?tab=ai` — same as CR. When the RQ user logs in, the `CogniRoleContext` resolves `activeRole` from `ROLE_PRIORITY` which ranks `CR` (index 1) above `RQ` (index 3). If the RQ demo user also holds a CR role in the database (or has stale `localStorage`), the page renders the CR landing instead of the RQ SimpleIntakeForm.

**Fix**: Two changes needed:
- In `DemoLoginPage.tsx`, set the RQ user's destination to `/cogni/submit-request` (or keep `/cogni/challenges/create`) AND explicitly set `localStorage` `cogni_active_role` to match the demo user's primary role on login.
- In `ChallengeCreatePage.tsx`, ensure path enforcement: when `cogni_demo_path === 'ai'` and role is RQ, always show SimpleIntakeForm (already handled by `isAMorRQ` check — the fix is ensuring `activeRole` resolves correctly).

### 2. AI Path Must Stay Pure AI — No Manual Editor Screens
**Current mixing points**:
- `ChallengeCreatePage.tsx` lines 471-472: AI intake has `onSwitchToEditor={switchToEditor}` prop, allowing users to jump to the 8-step wizard from inside the AI path.
- `ConversationalIntakePage.tsx`: `handleGoToEditor` function navigates to the editor tab.
- When `cogni_demo_path === 'ai'`, these switch links should be hidden/disabled.

**Fix**: When `cogni_demo_path === 'ai'`, do NOT pass `onSwitchToEditor` to `ConversationalIntakeContent`. The AI path should flow: Intake → AI Generate → Spec Review → LC → Curation → ID → Publish. No escape hatch to the wizard.

### 3. Manual Path Must Stay Pure Manual — No AI Interventions
**Current mixing points**:
- `ChallengeCreatePage.tsx` lines 492-494: Manual editor has `onSwitchToSimple={switchToAI}` allowing switch to AI.
- `ChallengeWizardPage.tsx` line 608-612: "Switch to AI" link in the wizard.
- When `cogni_demo_path === 'manual'`, these should be hidden.

**Fix**: When `cogni_demo_path === 'manual'`, do NOT pass `onSwitchToSimple` to `ChallengeWizardPage`. The wizard should be self-contained with no AI suggestions or switches.

### 4. Dead Code Cleanup
Need to identify unused components/hooks. Will scan for imports that are never referenced.

## Changes

### File: `src/pages/cogniblend/DemoLoginPage.tsx`
- On login (`handleLogin`), set `localStorage.setItem('cogni_active_role', demoUser.roles[0])` so the `CogniRoleContext` picks up the correct role immediately instead of falling back to priority order.
- Change RQ `aiDestination` to `/cogni/challenges/create` (no `?tab=ai` needed since RQ auto-routes to SimpleIntakeForm).

### File: `src/pages/cogniblend/ChallengeCreatePage.tsx`
- When `demoPath === 'ai'`: pass `onSwitchToEditor={undefined}` to `ConversationalIntakeContent` (hide "Build Spec Manually" escape hatch).
- When `demoPath === 'manual'`: pass `onSwitchToSimple={undefined}` to `ChallengeWizardPage` (hide "Switch to AI" link).
- On the landing page cards: already filtered by `demoPath` — this is correct.

### File: `src/pages/cogniblend/ConversationalIntakePage.tsx`
- The `handleGoToEditor` / "Switch to Manual Editor" button is already gated by `onSwitchToEditor` presence — no change needed if we pass `undefined`.

### File: `src/pages/cogniblend/ChallengeWizardPage.tsx`
- The "Switch to AI" link is already gated by `onSwitchToSimple` — no change needed if we pass `undefined`.

### Dead Code Cleanup
- `ConversationalIntakePage` standalone default export is only used as a lazy route in `App.tsx` but the route `/cogni/challenges/create` now uses `CogniChallengeCreatePage` which embeds `ConversationalIntakeContent`. Check if the standalone route is still referenced.
- The redirect `/cogni/challenges/new → /cogni/challenges/create?tab=editor` should be reviewed — if manual editor is a separate path, it should go to `/cogni/challenges/create?tab=editor` which is correct.
- Identify any other orphaned components.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/cogniblend/DemoLoginPage.tsx` | Set `cogni_active_role` in localStorage on demo login to match selected role |
| `src/pages/cogniblend/ChallengeCreatePage.tsx` | Gate `onSwitchToEditor` and `onSwitchToSimple` props based on `demoPath` |

## Summary

Two targeted fixes: (1) force correct `activeRole` on demo login so RQ doesn't resolve to CR, and (2) conditionally hide path-switching props based on `cogni_demo_path` to enforce clean separation between AI and Manual flows.

