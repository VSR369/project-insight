

# Rename "Marketplace" → "Aggregator" in Solution Seeking Org Admin Portal

The user is logged in as a **Solution Seeking Org Admin** and sees "Marketplace" references that should say "Aggregator" since the SOA portal operates under the Aggregator engagement model.

## Changes

| File | Line | Current | New |
|------|------|---------|-----|
| `src/components/rbac/RoleReadinessPanel.tsx` | 56 | `"Marketplace"` | `"Aggregator"` |
| `src/components/rbac/MsmeQuickAssignModal.tsx` | 174 | `"all marketplace roles"` | `"all aggregator roles"` |
| `src/components/rbac/AggBlockedScreen.tsx` | 33 | `"Marketplace Roles"` | `"Aggregator Roles"` |
| `src/components/rbac/ChallengeCanProceedBanner.tsx` | 83 | `"Marketplace"` in mp ternary | `"Aggregator"` |
| `src/components/rbac/SubmissionBlockedScreen.tsx` | 52 | `"Marketplace"` | `"Aggregator"` |

**Not changed:** `ChallengeCreatePage.tsx` — the `"marketplace"` there is a **select option value** (data), not a display label in the SOA context.
**Not changed:** `EngagementModelSelector.tsx` — only in a code comment, not user-facing.

