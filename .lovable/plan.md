

# Update Fill Test Data to Include Organization Context

## What Changed
The "Fill Test Data" button currently populates only challenge form fields (title, problem statement, scope, etc.) but leaves the Organization Context card empty. We will add Mahindra & Mahindra sample org data so that clicking "Fill Test Data" also populates the org profile fields (description, website, LinkedIn, Twitter, tagline).

## Challenge
The org context fields live in `CreatorOrgContextCard` — a separate component with its own state that auto-saves to `seeker_organizations`. The challenge form's `handleFillTestData` cannot directly set those fields because they are not part of the form schema.

## Approach

### 1. Add org seed data to `creatorSeedContent.ts`
Add a new exported object with Mahindra & Mahindra sample data for internal testing:

```ts
export const ORG_SEED = {
  organization_description: "Mahindra & Mahindra Limited is a multinational conglomerate...(200+ chars describing their automotive, farm equipment, IT, financial services, and real estate businesses)",
  website_url: "https://www.mahindra.com",
  linkedin_url: "https://www.linkedin.com/company/mahindra-and-mahindra",
  twitter_url: "https://x.com/MahijndraRise",
  tagline: "Rise.",
};
```

### 2. Expose a fill method from `CreatorOrgContextCard`
Add an imperative handle (via `useImperativeHandle` + `forwardRef`) or simpler: emit a custom event / use a callback prop so the parent can trigger org field population.

**Simpler approach**: Add an `onFillTestData` event pattern:
- `CreatorOrgContextCard` accepts an optional `fillTrigger` counter prop
- When `fillTrigger` increments, the card reads `ORG_SEED` and populates its local state + triggers auto-save
- This avoids tight coupling while keeping the card self-contained

### 3. Wire it in `ChallengeCreatorForm.tsx`
- Import `ORG_SEED` from `creatorSeedContent`
- Add a `fillTrigger` state counter
- In `handleFillTestData`, increment the counter alongside existing form reset
- Pass `fillTrigger` to `CreatorOrgContextCard`

### Files Modified
| File | Change |
|------|--------|
| `src/components/cogniblend/creator/creatorSeedContent.ts` | Add `ORG_SEED` with M&M data |
| `src/components/cogniblend/creator/CreatorOrgContextCard.tsx` | Accept `fillTrigger` prop, populate fields + auto-save when triggered |
| `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` | Add `fillTrigger` state, pass to org card, increment on fill |

### Technical Detail
- The org card's `useEffect` watches `fillTrigger` and sets all 5 fields from `ORG_SEED`, then calls `saveToOrg()` to persist
- Both MP and AGG seeds use the same org data (M&M example) since it is org-level, not challenge-level
- The card auto-opens when filled to show the populated data

