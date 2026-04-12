

## Fix 2 remaining "Solver" → "Solution Provider" toast messages

Two simple string replacements in user-visible toast messages:

1. **`src/hooks/cogniblend/useChallengeSubmit.ts` line 323** — Change `'Challenge published! Solvers can now discover and apply.'` to `'Challenge published! Solution Providers can now discover and apply.'`

2. **`src/hooks/cogniblend/useScreeningReview.ts` line 383** — Change `Solvers notified.` to `Solution Providers notified.` in the template string.

No other changes needed. Zero functional impact.

