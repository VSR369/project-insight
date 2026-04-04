

# Fix: CogniBlend Demo Card Navigation

## Problem
The card on the Login page uses `navigate('/cogni-demo-login')` but the route is registered as `/cogni/demo-login`. The mismatched URL hits no route, showing a blank screen.

## Change

| File | Fix |
|------|-----|
| `src/pages/Login.tsx` (line ~563) | Change `'/cogni-demo-login'` → `'/cogni/demo-login'` |

One-line fix.

