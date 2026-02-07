
## What I found (confirmed in code)

You are on `/pulse/reels`. In `src/pages/pulse/PulseReelsPage.tsx`, the “header” you expect (the block with the Build/View Profile action) is rendered like this:

```tsx
{!isFirstTime && firstTimeProvider && (
  <PersonalizedFeedHeader ... />
)}
```

So if the user is considered **first-time** (`isFirstTime === true`), the header is intentionally **not rendered at all**. This matches your screenshot symptom: “still I do not see the header in each individual feed page”.

Also, the **main feed page** (`PulseFeedPage.tsx`) does **not** rely on `PersonalizedFeedHeader` to provide the Build/View Profile CTA for all users. Instead it uses:

- `ProfileBuildBanner` (always visible when provider exists; CTA changes based on completion)
- `PersonalizedFeedHeader` (only for returning users)

Your requirement is: “same rules as main feed page, no new rules”. That means the individual feeds must also include `ProfileBuildBanner` (the “attached” feature), not only `PersonalizedFeedHeader`.

---

## 5-Why Analysis (root cause)

### Why #1: Why don’t you see the header on `/pulse/reels`?
Because the page only renders `PersonalizedFeedHeader` when `!isFirstTime`.

### Why #2: Why is `isFirstTime` true for you (or for many users)?
`useIsFirstTimeProvider()` defines first-time as: **no provider record OR provider exists but enrollments are empty**.

### Why #3: Why does that hide the “Build Profile” path?
Because the individual feeds use `PersonalizedFeedHeader` as the only place to surface the CTA, and it is gated behind `!isFirstTime`.

### Why #4: Why doesn’t this happen on the main feed page?
Because the main feed page always shows `ProfileBuildBanner` (when provider exists), which contains the CTA with the correct rules:
- Incomplete → Build Profile → `/dashboard`
- Complete → View Profile → `/pulse/profile`

### Why #5: Why was the individual feeds implementation incomplete?
We copied only the “returning user header” pattern (`PersonalizedFeedHeader`) into those pages, but did **not** replicate the “always visible CTA banner” (`ProfileBuildBanner`) pattern that the main feed uses to prevent users from getting lost.

**Root cause:** The individual feed pages do not include `ProfileBuildBanner`, and they gate `PersonalizedFeedHeader` behind `!isFirstTime`, so first-time users never see any CTA/header.

---

## Resolution approach (apply the same rules as main feed)

### Goal
On each individual feed page (Reels, Sparks, Articles, Podcasts, Gallery), implement the same top-of-page structure as `PulseFeedPage.tsx`:

1) **ProfileBuildBanner**: show whenever `provider` exists (first-time or returning)
2) **PersonalizedFeedHeader**: show only when `!isFirstTime && provider` (same as main feed)

This ensures:
- First-time users still see the “Build Profile” CTA (not lost)
- Returning users see the personalized header + button behavior
- No new rules introduced; this is literally the main-feed pattern reused

---

## Implementation plan (exact files and edits)

### 1) Update each individual feed page to render `ProfileBuildBanner`
**Files:**
- `src/pages/pulse/PulseReelsPage.tsx`
- `src/pages/pulse/PulseSparksPage.tsx`
- `src/pages/pulse/PulseArticlesPage.tsx`
- `src/pages/pulse/PulsePodcastsPage.tsx`
- `src/pages/pulse/PulseGalleryPage.tsx`

**Changes per file (consistent):**
- Import `ProfileBuildBanner` from `@/components/pulse/layout` (or from layout index if already exported)
- Use `provider` from `useIsFirstTimeProvider()` as the source of truth for `profileProgress` + `isProfileComplete`
- Render this block at the top of the page content (before the page-specific header like “Reels / Sparks / …”):

```tsx
{provider && (
  <div className="px-4 py-3 sm:py-4 border-b">
    <ProfileBuildBanner
      profileProgress={profileProgress}
      isProfileComplete={isProfileComplete}
    />
  </div>
)}
```

### 2) Keep `PersonalizedFeedHeader` but ensure it uses the same provider source
Still render:

```tsx
{!isFirstTime && provider && (
  <PersonalizedFeedHeader
    providerId={provider.id}
    providerName={providerName}
    profileProgress={profileProgress}
    isProfileComplete={isProfileComplete}
  />
)}
```

### 3) Reduce confusion between `useCurrentProvider()` and `useIsFirstTimeProvider()`
Right now each page uses both:
- `useCurrentProvider()` (provider used for PulseLayout `providerId`)
- `useIsFirstTimeProvider()` (provider used for header computations)

This can cause “provider A / provider B” mismatch bugs and makes behavior harder to reason about.

**Plan:**
- Prefer `provider` from `useIsFirstTimeProvider()` everywhere in these pages (including `PulseLayout providerId`), and remove the extra `useCurrentProvider()` call unless it’s needed for something else specific.
- This aligns with `PulseFeedPage.tsx` which uses `useIsFirstTimeProvider()` as its single source of truth.

### 4) Loading behavior (avoid flicker/missing header)
Currently these pages only show skeletons based on `isLoading` from `usePulseFeed`, not provider/enrollment loading.

**Plan:**
- Use `useIsFirstTimeProvider().isLoading` (or the two loading flags it returns) to avoid rendering the “no header” state while provider/enrollments are still loading.
- Minimal change: if provider loading is true, don’t decide `isFirstTime` gating yet; show a small skeleton/banner placeholder or simply render nothing until provider state resolves. This prevents “header never shows” perception due to timing.

---

## Acceptance criteria (how we’ll verify)

1) On `/pulse/reels`, `/pulse/sparks`, `/pulse/articles`, `/pulse/podcasts`, `/pulse/gallery`:
   - If provider exists and profile < 100%: the top banner shows Build Profile CTA (routes to `/dashboard`)
   - If provider exists and profile = 100%: the banner shows View Profile CTA (routes to `/pulse/profile`)
2) Returning user (`isFirstTime=false`) still sees `PersonalizedFeedHeader` exactly as on main feed
3) First-time user now sees the Build Profile path even on individual feeds (no longer “lost”)
4) Mobile + tablet + desktop: no layout break, no horizontal overflow, CTA visible

---

## Notes (non-breaking, “no new rules” guarantee)

- We are not inventing any new logic.
- We are copying the existing, already-approved main-feed rules:
  - `ProfileBuildBanner` = always visible CTA (when provider exists)
  - `PersonalizedFeedHeader` = returning users only

That is the simplest way to make the individual feeds behave exactly like the main feed and ensure the CTA is always discoverable.
