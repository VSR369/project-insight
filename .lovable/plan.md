

# Restore Tier-Gated Governance Mode Selector

## What Was Wrong
The previous change removed the Governance Mode selector entirely, replacing it with a read-only badge saying "configured by your Platform Supervisor." This is only correct for **Basic** tier (locked to QUICK). For Standard/Premium/Enterprise tiers, the Creator should be able to choose the governance mode per challenge from the modes their tier allows.

## Correct UX Rules

| Tier | Available Modes | UI Behavior |
|------|----------------|-------------|
| Basic | QUICK only | Read-only badge: "Your tier uses Quick governance" — no selector |
| Standard | QUICK, STRUCTURED | Dropdown with 2 options |
| Premium | QUICK, STRUCTURED, CONTROLLED | Dropdown with 3 options |
| Enterprise | QUICK, STRUCTURED, CONTROLLED | Dropdown with 3 options |

## Changes

### `ChallengeCreatePage.tsx`
Replace the current `EngagementModelSelector` component with a combined `GovernanceEngagementSelector` that:

1. Reads `getAvailableGovernanceModes(currentOrg.tierCode)` to get allowed modes
2. If only 1 mode available (Basic tier) → show read-only info badge with the mode name
3. If 2+ modes available → show a dropdown/card selector for governance mode, using `GOVERNANCE_MODE_CONFIG` for labels, colors, and tooltips
4. Keep the Engagement Model (MP/AGG) dropdown below as-is
5. Each governance mode option shows its label + short description from config

The governance mode selection fires `setGovernanceMode()` which already flows into the form via props. No other files need changes — the downstream logic (`resolveChallengeGovernance`, field rules, validation) already handles all three modes.

### Files Modified
| File | Change |
|------|--------|
| `src/pages/cogniblend/ChallengeCreatePage.tsx` | Restore governance mode selector with tier-gating logic |

