

# Unified Challenge Creation UX — Implementation Plan

## Summary

Replace the current tabbed "Create with AI / Advanced Editor" layout with a role-aware landing page that routes users to the correct track based on their role and engagement model. Add governance mode awareness to the Solution Request form, and consolidate sidebar navigation.

## Two Tracks (Not Three)

- **Track 1: Challenge Creation** — produces a full challenge spec via AI-Assisted or Manual Editor (for CR, CA, and RQ with bypass)
- **Track 2: Solution Request** — lightweight intake form, architect converts later (for AM in MP, RQ in AGG without bypass)

## Changes

### 1. New Component: `CreationContextBar.tsx`
**File:** `src/components/cogniblend/CreationContextBar.tsx`

Horizontal bar showing 4 badges: Org name, Governance Mode (colored per `GOVERNANCE_MODE_CONFIG`), Engagement Model (MP/AGG), Tier code. Data from `useCurrentOrg` + `useOrgModelContext`.

### 2. Rewrite Landing Page: `ChallengeCreatePage.tsx`
**File:** `src/pages/cogniblend/ChallengeCreatePage.tsx`

Replace current `Tabs` with a smart landing that shows role-appropriate path cards:

- **CR/CA roles**: Show two cards — "AI-Assisted" (primary, recommended) and "Manual Editor" (secondary). No Solution Request card.
- **AM role (MP model)**: Show single full-width "Solution Request" card labeled "Mandatory". No creation cards.
- **RQ role (AGG, bypass OFF)**: Show "Solution Request" card (labeled "Optional") + both creation cards.
- **RQ role (AGG, bypass ON)**: Show creation cards only + blue bypass banner. No Solution Request card.

Clicking a card either:
- Shows the existing `ConversationalIntakeContent` or `ChallengeWizardPage` inline (same as current tabs)
- Navigates to `/cogni/submit-request` for Solution Request

Add `CreationContextBar` at top. Add governance mode explanation footer showing what happens after AI generation per mode.

Uses `useCogniRoleContext` for active role and `useOrgModelContext` for model/bypass.

### 3. Add Governance Mode to Submit Request
**File:** `src/pages/cogniblend/CogniSubmitRequestPage.tsx`

- Add `CreationContextBar` at top
- Add governance mode selector (3 card-style options) between the Request Info header and the form
- Tier-gating logic: disable modes the org's tier doesn't support, show "Upgrade" badge on locked modes
- Pre-select the org's current governance profile as default
- Adjust field requirements based on selected mode:
  - **QUICK**: Only Problem + Outcomes required; budget, timeline, constraints, categorization become optional with sensible defaults
  - **STRUCTURED**: Current full form (no change)
  - **CONTROLLED**: All fields mandatory including constraints and full categorization
- Store `governance_mode` in the submitted payload via `buildPayload`

### 4. Add Tier-to-Governance Mapping
**File:** `src/lib/governanceMode.ts`

Add:
```typescript
export const TIER_GOVERNANCE_MODES: Record<string, GovernanceMode[]> = {
  basic:      ['QUICK'],
  standard:   ['QUICK', 'STRUCTURED'],
  premium:    ['QUICK', 'STRUCTURED', 'CONTROLLED'],
  enterprise: ['QUICK', 'STRUCTURED', 'CONTROLLED'],
};

export function getAvailableGovernanceModes(tierCode: string | null): GovernanceMode[] {
  return TIER_GOVERNANCE_MODES[(tierCode ?? 'basic').toLowerCase()] ?? ['QUICK'];
}
```

### 5. Merge Sidebar Navigation Entries
**File:** `src/components/cogniblend/shell/CogniSidebarNav.tsx`

Replace:
```
├── Create with AI  (CR, AM, RQ)
├── Submit Request   (AM, RQ)
```
With:
```
├── New Challenge    (CR, CA, AM, RQ)
```

Single entry pointing to `/cogni/challenges/create`. The landing page handles routing. Use `FilePlus` icon.

### 6. Update Role Config
**File:** `src/types/cogniRoles.ts`

- `ROLE_PRIMARY_ACTION.AM` → route changes to `/cogni/challenges/create`, label stays "Submit Request"
- `ROLE_PRIMARY_ACTION.RQ` → route changes to `/cogni/challenges/create`, label stays "Submit Request"
- `ROLE_NAV_RELEVANCE.AM` → add `/cogni/challenges/create`, keep `/cogni/my-requests`
- `ROLE_NAV_RELEVANCE.RQ` → add `/cogni/challenges/create`, keep `/cogni/my-requests`

### 7. Update Breadcrumbs
**File:** `src/components/cogniblend/shell/CogniShell.tsx`

- Change `'/cogni/challenges/create': 'Create Challenge'` to `'New Challenge'`
- Keep `'/cogni/submit-request': 'Submit Request'` (still accessible via direct navigation)

## Files Summary

| File | Action |
|------|--------|
| `src/components/cogniblend/CreationContextBar.tsx` | Create |
| `src/pages/cogniblend/ChallengeCreatePage.tsx` | Rewrite |
| `src/pages/cogniblend/CogniSubmitRequestPage.tsx` | Modify (add context bar + governance selector) |
| `src/lib/governanceMode.ts` | Modify (add tier mapping) |
| `src/components/cogniblend/shell/CogniSidebarNav.tsx` | Modify (merge entries) |
| `src/types/cogniRoles.ts` | Modify (update actions/relevance) |
| `src/components/cogniblend/shell/CogniShell.tsx` | Modify (breadcrumb label) |

No database changes required.

