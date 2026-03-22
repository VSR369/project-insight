

# Fix: Challenge Requestor Not Seeing "Share Your Idea" Screen

## Problem

The URL is `/cogni/challenges/create?tab=ai`. Line 366 reads the `tab` query param and sets `activeView = 'ai'`. The RQ routing check on line 434 only triggers when `activeView === 'landing'`:

```
if (isAMorRQ && activeView === 'landing') → SimpleIntakeForm
```

Since `activeView` is `'ai'`, RQ users fall through to the ConversationalIntakePage (the CR/CA form) instead of seeing their "Share Your Idea" SimpleIntakeForm.

## Solution

In `ChallengeCreatePage.tsx`, move the AM/RQ role check **before** the activeView derivation, or make the AM/RQ check independent of the tab parameter. AM and RQ users should **always** see SimpleIntakeForm regardless of URL params.

## Change

### `src/pages/cogniblend/ChallengeCreatePage.tsx`

**Line 434** — Remove the `&& activeView === 'landing'` condition so AM/RQ users always get routed to SimpleIntakeForm:

```tsx
// Before:
if (isAMorRQ && activeView === 'landing') {

// After:
if (isAMorRQ) {
```

This ensures that regardless of how the RQ user navigates to the page (direct link, sidebar click with `?tab=ai`, etc.), they always see their role-appropriate intake form.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/cogniblend/ChallengeCreatePage.tsx` | Remove `activeView === 'landing'` guard from AM/RQ routing check |

