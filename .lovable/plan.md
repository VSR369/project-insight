

# Plan: Fix RQ Routing, Enforce Path Isolation, Clean Up Dead Code

## Status: IMPLEMENTED ✅

## What Was Done

### 1. RQ Role Routing Fix ✅
- In `DemoLoginPage.tsx`, added `localStorage.setItem('cogni_active_role', demoUser.roles[0])` on demo login
- This forces `CogniRoleContext` to pick up the correct role (RQ) instead of falling back to priority order (which would resolve to CR)

### 2. AI Path Isolation ✅
- In `ChallengeCreatePage.tsx`, when `demoPath === 'ai'`: `onSwitchToEditor` is set to `undefined`
- This hides the "Build Spec Manually" escape hatch from AI intake flow

### 3. Manual Path Isolation ✅
- In `ChallengeCreatePage.tsx`, when `demoPath === 'manual'`: `onSwitchToSimple` is set to `undefined`
- This hides the "Switch to AI" link in the wizard

### 4. Dead Code Cleanup ✅
- Removed unused `ConversationalIntakePage` lazy import from `App.tsx` (was imported but never rendered in any route)

## Files Modified

| File | Change |
|------|--------|
| `src/pages/cogniblend/DemoLoginPage.tsx` | Set `cogni_active_role` in localStorage on demo login |
| `src/pages/cogniblend/ChallengeCreatePage.tsx` | Gate path-switching props based on `demoPath` |
| `src/App.tsx` | Removed unused `ConversationalIntakePage` lazy import |
