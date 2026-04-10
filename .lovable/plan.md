

## Fix: Save Draft & Submit to Curator — 7 Bugs

### Bug 1 — `useSaveDraft.onSuccess` missing `cogni-my-challenges` invalidation

**File:** `src/hooks/cogniblend/useChallengeSubmit.ts` (line 296-299)
- Add `queryClient.invalidateQueries({ queryKey: ['cogni-my-challenges'] })` to `useSaveDraft`'s `onSuccess`

### Bug 2 — `draftForm` state defers by one render cycle

**File:** `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` (lines 67-72, 103)
- Remove `useState`/`useEffect` for `draftForm`
- Pass `form` directly to `useCreatorDraftSave`

### Bug 3 — `executeSubmit` catch swallows pre-mutation errors

**File:** `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` (line 167)
- Replace empty `catch {}` with:
```ts
catch (err) {
  if (err instanceof Error && !submitMutation.isError) {
    toast.error(err.message || 'Submission failed. Please try again.');
  }
}
```

### Bug 4 — No curator notification after role assignment

**File:** `src/hooks/cogniblend/useChallengeSubmit.ts` (after line 217)
- After successful `autoAssignChallengeRole`, query `user_challenge_roles` to find the assigned CU user, then insert a `cogni_notifications` row with type `CHALLENGE_ASSIGNED_CU`

### Bug 5 — `referenceUrls` dropped on draft save

**File:** `src/lib/cogniblend/challengePayloads.ts`
- Add `referenceUrls?: string[]` to `DraftPayload` interface
- Add `...(fp.referenceUrls?.length ? { reference_urls: fp.referenceUrls } : {})` to `rawExtBrief` in `buildChallengeUpdatePayload`

**File:** `src/hooks/cogniblend/useCreatorDraftSave.ts`
- Pass `referenceUrls` from form values (if available) into the draft payload. Since the form doesn't have a `referenceUrls` field directly, this requires the parent to pass `referenceUrls` into the hook config, or reading from the extended_brief. Will add `referenceUrls` to `DraftSaveConfig` and pass it through.

### Bug 6 — `useUpdateDraft.onSuccess` missing detail view cache invalidation

**File:** `src/hooks/cogniblend/useChallengeSubmit.ts` (lines 323-325)
- Add invalidation for `['public-challenge']` and `['challenge-detail']` query keys

### Bug 7 — `ChallengeWizardPage` hardcodes `operatingModel: 'MP'`

**File:** `src/pages/cogniblend/ChallengeWizardPage.tsx` (line 532)
- Replace `'MP'` with `propEngagementModel` or fall back to the org's operating model from `useOrgModelContext()`
- Need to check if `propEngagementModel` or org context is available in scope; use `propEngagementModel ?? orgModelContext?.operatingModel ?? 'MP'`

### Files Changed (5)

1. `src/hooks/cogniblend/useChallengeSubmit.ts` — Bugs 1, 4, 6
2. `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` — Bugs 2, 3
3. `src/lib/cogniblend/challengePayloads.ts` — Bug 5
4. `src/hooks/cogniblend/useCreatorDraftSave.ts` — Bug 5 (pass referenceUrls)
5. `src/pages/cogniblend/ChallengeWizardPage.tsx` — Bug 7

