

## Filter Resource Pool Roles to Marketplace Only

**Problem**: The "Add Pool Member" form shows all SLM roles including Aggregator-specific ones (R4, R5_AGG, R6_AGG, R7_AGG). Since the Resource Pool serves the Marketplace engagement model, only Marketplace-applicable roles should appear.

**Change**: In `src/components/admin/marketplace/PoolMemberForm.tsx`:

1. Replace `useSlmRoleCodes` import with `useChallengeRoleCodes` from the same hook file
2. Also import `useCoreRoleCodes` to include core roles (R2, R8, R9) if needed
3. Call `useChallengeRoleCodes("marketplace")` — this already filters to roles where `model_applicability === "marketplace" || model_applicability === "both"`, excluding `agg`-only roles
4. Combine with core roles to give the full set of applicable roles

Alternatively, the simplest approach: keep using `useSlmRoleCodes()` but filter the result inline to exclude roles where `model_applicability === "agg"`. This shows core roles + marketplace roles + "both" roles, excluding aggregator-only ones.

**Single file change**: `PoolMemberForm.tsx` — filter the `roleCodes` list to `role.model_applicability !== 'agg'` before rendering checkboxes.

