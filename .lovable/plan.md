

# Plan: Clarify Governance Example & Add SOA Admin Rule

## Issues to Fix

**1. Confusing tier depth example (lines 261-267)**
The current example says "you launch with yourself as Supervisor (depth=1), onboard 5 admins, then change to 3." This is misleading because:
- At depth=1, you cannot onboard admins at all — there are no lower tiers to place them in
- The jump from "just yourself" to "5 admins" is unexplained
- It conflates hiring people with enabling tiers

**Rewrite:** A step-by-step growth story: depth=1 (solo), then depth=2 (hire senior admins to share load), then depth=3 (hire basic admins under seniors). Each step explains WHY you change and WHAT unlocks.

**2. Missing: SOA Primary Admin rule**
The user asks "how many primary admins can exist at a time?" The answer (enforced by DB constraint): exactly 1 active PRIMARY admin per organization. The primary admin can then create up to N delegated admins (configured by `max_delegated_admins_per_org`). This critical rule is not documented anywhere in the Knowledge Centre.

## File Changes

| File | Action |
|------|--------|
| `src/pages/admin/verifications/VerificationKnowledgeCentrePage.tsx` | **Edit** two sections |

### Edit 1: Rewrite `config-governance` content (lines 259-274)
Replace the tier depth explanation and example with a clearer 3-step growth narrative. Add explicit note that depth=1 means NO other admins can exist on the platform.

### Edit 2: Expand `config-soa-provisioning` content (lines 442-458)
Add a prominent section at the top explaining the **One Primary Admin Rule**: each organization has exactly 1 active Primary Admin at all times (enforced by database constraint). The Primary Admin is the person designated during registration. They can then create up to `max_delegated_admins_per_org` delegated admins. Include the admin transfer process (if the primary admin needs to change, a formal transfer request is required and approved by the Platform Admin).

