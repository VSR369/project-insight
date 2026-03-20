

## Fix: 404 on "View" Click from Dashboard

### Problem
Three dashboard components navigate to `/cogni/challenges/{id}` (no suffix), but no route is defined for that bare path — only suffixed routes like `/spec`, `/edit`, `/view`, `/manage` exist.

### Solution
Add a route for `/cogni/challenges/:id` that redirects intelligently based on challenge status, or simply map it to the existing detail/manage page.

**Option chosen**: Add a new route entry in `src/App.tsx` that points `/cogni/challenges/:id` to `ChallengeManagePage` (the post-creation management view), since "View" from the dashboard is the most common use case for existing challenges.

### Files to Change

**1. `src/App.tsx`**
- Add route: `<Route path="/cogni/challenges/:id" element={<LazyRoute><ChallengeManagePage /></LazyRoute>} />`
- Place it after the more specific `/cogni/challenges/:id/*` routes so those match first.

That's it — one line fix.

