
# Phase 9: Testing, Polish & Accessibility Audit

## Overview
This final phase ensures the Industry Pulse module is production-ready through comprehensive testing, accessibility compliance, UI/UX polish, and performance optimization.

---

## 1. Unit & Integration Tests

### 1.1 Hook Tests (New Files)

| File | Purpose | Test Cases |
|------|---------|------------|
| `src/test/pulse/pulse-content.test.ts` | Content hooks | Create, update, publish, delete, archive content; feed filtering |
| `src/test/pulse/pulse-engagements.test.ts` | Engagement hooks | Fire, gold, save, bookmark toggle; own-content prevention |
| `src/test/pulse/pulse-social.test.ts` | Social hooks | Comments CRUD, follow/unfollow, notifications |
| `src/test/pulse/pulse-stats.test.ts` | Stats & gamification | XP calculation, level progress, streak multipliers, leaderboards |

### 1.2 Component Tests (New Files)

| File | Purpose | Test Cases |
|------|---------|------------|
| `src/components/pulse/content/ContentCard.test.tsx` | Content rendering | All 6 content types render correctly, tag display, truncation logic |
| `src/components/pulse/content/EngagementBar.test.tsx` | Engagement buttons | Button states, own-content disabled, optimistic updates |
| `src/components/pulse/content/CommentSection.test.tsx` | Comment rendering | Thread nesting, reply depth limits, delete own comment |
| `src/components/pulse/dashboard/PulseDashboardWidget.test.tsx` | Widget states | Loading, inactive user, active user with stats |

### 1.3 Test Patterns

```typescript
// Example test structure for hooks
describe('usePulseContent', () => {
  it('filters feed by content type', async () => { /* ... */ });
  it('handles empty feed state gracefully', async () => { /* ... */ });
  it('applies audit fields on create', async () => { /* ... */ });
});

// Example test structure for components  
describe('ContentCard', () => {
  it('renders reel with play button overlay', () => { /* ... */ });
  it('truncates caption at 280 characters with Read more', () => { /* ... */ });
  it('displays maximum 5 tags with overflow badge', () => { /* ... */ });
});
```

---

## 2. Accessibility Audit (WCAG 2.1 AA)

### 2.1 Interactive Element Fixes

| Component | Issue | Fix |
|-----------|-------|-----|
| `EngagementBar` | Buttons lack accessible names | Add `aria-label` (e.g., "Give fire reaction", "Add bookmark") |
| `ContentCard` | Avatar click lacks keyboard access | Add `tabIndex={0}` and `onKeyDown` for Enter/Space |
| `CommentSection` | Reply button lacks context | Add `aria-label="Reply to {userName}"` |
| `PulseBottomNav` | Active state not announced | Add `aria-current="page"` to active NavLink |
| `ContentCard DropdownMenu` | Trigger lacks context | Add `aria-label="Content options"` |

### 2.2 Form Accessibility

| Location | Issue | Fix |
|----------|-------|-----|
| Comment `Textarea` | Missing label | Add `aria-label="Write a comment"` or visible label |
| Reply `Textarea` | Missing label | Add `aria-label="Write a reply"` |
| `PulseCreatePage` cards | Selection not announced | Add `aria-selected` and `role="option"` pattern |

### 2.3 Focus Management

| Scenario | Required Behavior |
|----------|-------------------|
| Reply input opens | Focus moves to textarea |
| Comment added | Focus returns to comment list |
| Modal/dialog opens | Focus trapped within |
| Dropdown closes | Focus returns to trigger |

### 2.4 Color Contrast

| Element | Current | Required | Action |
|---------|---------|----------|--------|
| `text-muted-foreground` | Verify ratio | 4.5:1 minimum | Audit and adjust if needed |
| Badge variants | Verify contrast | 3:1 for large text | Check all badge color combos |
| Disabled buttons | Verify visibility | Non-reliance on color alone | Add visual indicator |

---

## 3. UI/UX Polish

### 3.1 Loading States

| Component | Enhancement |
|-----------|-------------|
| `PulseFeedPage` | Skeleton cards with proper aspect ratios |
| `PulseProfilePage` | Skeleton for avatar, stats grid, content tabs |
| `PulseRanksPage` | Skeleton leaderboard entries |
| `ContentCard` (images) | Add `loading="lazy"` and blur placeholder |

### 3.2 Empty States

| Screen | Current | Enhancement |
|--------|---------|-------------|
| Feed | Basic text | Add illustration/icon + CTA button |
| Profile posts | "No posts yet" | Add "Create your first post" button |
| Bookmarks | "No saved posts" | Add "Explore feed" button |
| Leaderboard | "No rankings yet" | Add motivational message |

### 3.3 Error States

| Scenario | Required UI |
|----------|-------------|
| Feed fetch fails | Error card with retry button |
| Content detail 404 | "Content not found" with back navigation |
| Engagement fails | Toast with retry option (already using `handleMutationError`) |
| Image load fails | Fallback placeholder image |

### 3.4 Mobile Responsiveness

| Component | Check |
|-----------|-------|
| `PulseBottomNav` | Safe area insets for notched devices |
| `ContentCard` | Full-bleed images on mobile |
| `CommentSection` | Comfortable touch targets (44x44px minimum) |
| Tabs | Horizontal scroll if needed |

---

## 4. Performance Optimization

### 4.1 Query Caching Review

| Hook | Current `staleTime` | Recommendation |
|------|---------------------|----------------|
| `usePulseFeed` | 10s | Keep (real-time feel) |
| `useProviderStats` | 30s | Keep |
| `useGlobalLeaderboard` | 5min | Keep (low update frequency) |
| `usePulseTags` | 5min | Keep |
| `useMyPulseContent` | 30s | Consider 60s for drafts |

### 4.2 Image Optimization

| Action | Implementation |
|--------|----------------|
| Lazy loading | Add `loading="lazy"` to all `<img>` tags |
| Placeholder | Add blur-up or skeleton while loading |
| Format | Ensure WebP support in upload flow (if not already) |

### 4.3 Component Optimization

| Component | Optimization |
|-----------|--------------|
| `ContentCard` | Wrap in `React.memo()` to prevent unnecessary re-renders |
| `EngagementBar` | Already optimistic; verify no redundant queries |
| Comment list | Consider virtualization if >50 comments typical |

---

## 5. Edge Case Handling

### 5.1 Network Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Offline during fire | Show error toast, revert optimistic update |
| Offline during comment | Show error toast, preserve draft text |
| Slow network | Loading indicators visible |

### 5.2 Concurrent Update Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Two users fire simultaneously | Both succeed, count accurate |
| Comment while viewing detail | New comments appear via polling |
| Content deleted while viewing | Handle 404 gracefully |

### 5.3 Edge Cases in Business Logic

| Scenario | Test Case |
|----------|-----------|
| User has 0 XP | Level displays as 1, progress bar at 0% |
| User at max gold tokens (1000) | Can't receive more gold from loot box |
| Streak breaks at midnight | Multiplier resets to 1.0x |
| Own-content engagement | All buttons disabled except bookmark |

---

## 6. Security Review

### 6.1 RLS Policy Verification

| Table | Verify |
|-------|--------|
| `pulse_content` | Users can only update/delete own content |
| `pulse_comments` | Users can only delete own comments |
| `pulse_engagements` | Proper isolation by provider_id |
| `pulse_connections` | Can only manage own follow relationships |

### 6.2 Input Validation

| Input | Validation |
|-------|------------|
| Comment text | Max 1500 chars (enforced in UI) |
| Content caption | Max length per content type |
| Tags | Sanitize input, prevent XSS |

---

## 7. Files to Create/Modify

### New Files

| Path | Purpose |
|------|---------|
| `src/test/pulse/pulse-content.test.ts` | Content hook tests |
| `src/test/pulse/pulse-engagements.test.ts` | Engagement hook tests |
| `src/test/pulse/pulse-social.test.ts` | Social hook tests |
| `src/test/pulse/pulse-stats.test.ts` | Stats/gamification tests |
| `src/components/pulse/content/ContentCard.test.tsx` | Component tests |
| `src/components/pulse/content/EngagementBar.test.tsx` | Component tests |
| `src/components/pulse/content/CommentSection.test.tsx` | Component tests |

### Modified Files

| Path | Changes |
|------|---------|
| `src/components/pulse/content/ContentCard.tsx` | ARIA labels, lazy loading, React.memo |
| `src/components/pulse/content/EngagementBar.tsx` | ARIA labels, accessible names |
| `src/components/pulse/content/CommentSection.tsx` | ARIA labels, focus management |
| `src/components/pulse/layout/PulseBottomNav.tsx` | aria-current, keyboard navigation |
| `src/pages/pulse/PulseFeedPage.tsx` | Enhanced empty/error states |
| `src/pages/pulse/PulseProfilePage.tsx` | Enhanced empty states |
| `src/pages/pulse/PulseRanksPage.tsx` | Enhanced empty states |

---

## 8. Implementation Order

1. **Accessibility fixes** (quick wins, high impact)
2. **Empty/error state enhancements** (improved UX)
3. **Loading state polish** (visual consistency)
4. **Performance optimizations** (React.memo, lazy loading)
5. **Unit tests for hooks** (regression protection)
6. **Component tests** (UI behavior verification)
7. **Security verification** (RLS smoke tests)
8. **End-to-end manual testing** (full flow validation)

---

## 9. Success Criteria

| Category | Metric |
|----------|--------|
| Accessibility | 0 WCAG 2.1 AA violations in Pulse pages |
| Tests | 80%+ coverage on Pulse hooks |
| Performance | TTI < 1.5s for Pulse Feed page |
| Mobile | All touch targets 44px minimum |
| Error handling | All error states have retry options |

---

## Technical Notes

- Test framework: Vitest + Testing Library (already configured)
- Test location: `src/test/pulse/` for hooks, co-located for components
- ARIA testing: Can use `@testing-library/jest-dom` matchers
- Focus testing: Use `screen.getByRole()` patterns
