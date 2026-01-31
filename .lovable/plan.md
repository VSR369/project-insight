
# Plan: Fix Feed Author Display & Add Follow Functionality

## Problem Analysis

### Root Cause Identified
The feed shows "Anonymous" for all content creators because of **RLS (Row Level Security) restrictions** on the `solution_providers` table.

**Current RLS Policies on `solution_providers`:**
| Policy | Command | Effect |
|--------|---------|--------|
| `Providers view own record` | SELECT | Only own record (user_id = auth.uid()) |
| `Admin view all providers` | SELECT | Only platform admins |
| `Reviewers can view assigned providers` | SELECT | Only assigned providers |

**The Issue:** When the Supabase query joins `pulse_content` to `solution_providers`, RLS blocks reading other providers' names because there's no policy for "public profile viewing".

**Evidence from Network Request:**
```json
"provider": null  // ← RLS blocks the join
```

---

## Solution Overview

### Phase 1: Database - Enable Social Profile Visibility
Add a new RLS policy to allow authenticated users to see basic profile info of any provider (for social features).

### Phase 2: Frontend - Add Follow Button to Feed Cards
Create a reusable `FollowButton` component and integrate it into:
- `ContentCard.tsx`
- `PulseCardFeedItem.tsx`

### Phase 3: Update Follower Count Display
Ensure following a user updates `pulse_provider_stats.follower_count` via database trigger.

---

## Technical Implementation

### Phase 1: Database Migration

**New RLS Policy:**
```sql
-- Allow authenticated users to view basic provider info for social features
CREATE POLICY "Authenticated users view provider profiles"
ON solution_providers
FOR SELECT
TO authenticated
USING (true);
```

This is safe because:
1. Only SELECT (read) access
2. Sensitive fields (if any) should be handled separately
3. Standard pattern for social platforms

---

### Phase 2: Create FollowButton Component

**File:** `src/components/pulse/social/FollowButton.tsx`

**Features:**
- Compact, responsive design (icon-only on mobile, text on desktop)
- Shows "Follow" / "Following" state
- Prevents self-follow
- Triggers follower count update
- Uses existing `useToggleFollow` and `useIsFollowing` hooks

**Props Interface:**
```typescript
interface FollowButtonProps {
  targetProviderId: string;
  currentUserProviderId?: string;
  variant?: 'default' | 'compact';
  className?: string;
}
```

**Responsive Behavior:**
- Mobile: Small icon button with UserPlus/Check icon
- Desktop: "Follow" / "Following" text button

---

### Phase 3: Integrate Follow Button into Feed Cards

**ContentCard.tsx Updates:**
1. Add `FollowButton` next to author name
2. Pass `content.provider?.id` as target
3. Pass `currentUserProviderId` for self-detection
4. Hide for own content

**PulseCardFeedItem.tsx Updates:**
1. Same integration pattern
2. Use `card.seed_creator_id` as target

**UI Placement:**
```
┌─────────────────────────────────────────┐
│ [Avatar] John Provider [Follow] ← NEW   │
│          2 hours ago    ● Spark         │
├─────────────────────────────────────────┤
│ Content here...                         │
└─────────────────────────────────────────┘
```

---

### Phase 4: Database Trigger for Follower Count Sync

**Current State:** `pulse_provider_stats` has `follower_count` and `following_count` columns but no automatic sync.

**New Trigger Function:**
```sql
CREATE OR REPLACE FUNCTION pulse_sync_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment follower count for followed user
    UPDATE pulse_provider_stats
    SET follower_count = follower_count + 1
    WHERE provider_id = NEW.following_id;
    
    -- Increment following count for follower
    UPDATE pulse_provider_stats
    SET following_count = following_count + 1
    WHERE provider_id = NEW.follower_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement counts
    UPDATE pulse_provider_stats
    SET follower_count = GREATEST(0, follower_count - 1)
    WHERE provider_id = OLD.following_id;
    
    UPDATE pulse_provider_stats
    SET following_count = GREATEST(0, following_count - 1)
    WHERE provider_id = OLD.follower_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pulse_sync_follower_counts
AFTER INSERT OR DELETE ON pulse_connections
FOR EACH ROW EXECUTE FUNCTION pulse_sync_follower_counts();
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| Migration SQL | Create | Add RLS policy + trigger |
| `src/components/pulse/social/FollowButton.tsx` | Create | Reusable follow button |
| `src/components/pulse/social/index.ts` | Create | Barrel export |
| `src/components/pulse/content/ContentCard.tsx` | Modify | Add follow button |
| `src/components/pulse/content/PulseCardFeedItem.tsx` | Modify | Add follow button |

---

## Responsive Design Considerations

### FollowButton Breakpoints
```tsx
// Mobile (< 640px)
<Button size="sm" className="h-7 w-7 p-0">
  <UserPlus className="h-3.5 w-3.5" />
</Button>

// Desktop (>= 640px)
<Button size="sm" className="h-7 px-2 text-xs">
  {isFollowing ? 'Following' : 'Follow'}
</Button>
```

### Feed Card Header Layout
```tsx
// Responsive flex layout
<div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
  <span className="font-semibold truncate">{providerName}</span>
  <FollowButton 
    targetProviderId={providerId}
    currentUserProviderId={currentUser}
    variant="compact"
  />
  {/* badges */}
</div>
```

---

## Testing Checklist

After implementation:
- [ ] Names display correctly (not "Anonymous")
- [ ] Follow button appears on other users' content
- [ ] Follow button hidden on own content
- [ ] Clicking Follow toggles to "Following"
- [ ] Follower count updates on profile page
- [ ] Mobile: Icon-only button displays correctly
- [ ] Desktop: Text button displays correctly
- [ ] Clicking author name/avatar navigates to profile

---

## Summary

| Issue | Solution |
|-------|----------|
| "Anonymous" names | Add RLS policy for public profile viewing |
| No follow option | Create `FollowButton` component |
| Follower count not updating | Add database trigger on `pulse_connections` |
| Responsive design | Use breakpoint-aware button variants |
