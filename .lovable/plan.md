
# Plan: Add Profile Section Above Galaxy Leaders in Left Sidebar

## Overview

Add a user profile card at the top of the left sidebar containing:
1. **Profile photograph** with upload/replace capability
2. **Editable headline/title** (like LinkedIn)
3. **Clickable "View Profile" link**

---

## Current State Analysis

| Component | Location | Current Behavior |
|-----------|----------|------------------|
| Left Sidebar | `src/components/pulse/layout/LeftSidebar.tsx` | Shows Galaxy Leaders + XP Progress |
| LeaderboardMiniWidget | `src/components/pulse/widgets/LeaderboardMiniWidget.tsx` | Shows top 5 ranked providers |
| profiles table | Database | Has `avatar_url` column ✅ |
| pulse_provider_stats table | Database | NO headline field ❌ |

---

## Solution: 3 Parts

### Part 1: Database Migration

Add `pulse_headline` column to `pulse_provider_stats` table:

```sql
ALTER TABLE public.pulse_provider_stats 
  ADD COLUMN IF NOT EXISTS pulse_headline TEXT DEFAULT NULL;

COMMENT ON COLUMN public.pulse_provider_stats.pulse_headline 
  IS 'User-defined professional headline shown in Pulse (LinkedIn-style)';
```

---

### Part 2: Create ProfileMiniCard Component

**New file:** `src/components/pulse/widgets/ProfileMiniCard.tsx`

```text
┌─────────────────────────────────────────┐
│  ┌───────────┐                          │
│  │  📷       │  ← Photo with upload     │
│  │  Avatar   │     overlay icon         │
│  └───────────┘                          │
│                                         │
│  Senior Technology Consultant           │  ← Editable headline
│  ✏️ (edit icon on hover)                │
│                                         │
│  [👁️ View Profile]                      │  ← Clickable link
└─────────────────────────────────────────┘
```

**Features:**
- **Avatar with AvatarImage**: Shows `profiles.avatar_url` if set, fallback to initials
- **Photo upload overlay**: Camera icon appears on hover, opens file picker
- **Editable headline**: Click to edit, saves to `pulse_provider_stats.pulse_headline`
- **View Profile link**: Navigates to `/pulse/profile`

**Component Structure:**
```tsx
interface ProfileMiniCardProps {
  providerId?: string;
  userId?: string;
  className?: string;
}

export function ProfileMiniCard({ providerId, userId, className }: ProfileMiniCardProps) {
  // State
  const [isEditingHeadline, setIsEditingHeadline] = useState(false);
  const [headlineValue, setHeadlineValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data fetching
  const { data: profile } = useQuery(['profile', userId], ...);
  const { data: stats } = useProviderStats(providerId);

  // Mutations
  const uploadPhoto = useUploadPulseMedia();
  const updateHeadline = useMutation(...);

  return (
    <Card>
      <CardContent>
        {/* Avatar with upload overlay */}
        <div className="relative group">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <button onClick={() => fileInputRef.current?.click()} className="overlay">
            <Camera className="h-4 w-4" />
          </button>
          <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} hidden />
        </div>

        {/* Editable Headline */}
        {isEditingHeadline ? (
          <Input value={headlineValue} onBlur={saveHeadline} autoFocus />
        ) : (
          <p onClick={() => setIsEditingHeadline(true)}>
            {stats?.pulse_headline || 'Add your title'}
            <Pencil className="h-3 w-3" />
          </p>
        )}

        {/* View Profile Link */}
        <Button variant="link" onClick={() => navigate('/pulse/profile')}>
          <Eye className="h-3 w-3 mr-1" />
          View Profile
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

### Part 3: Integrate into LeftSidebar

**Modify:** `src/components/pulse/layout/LeftSidebar.tsx`

Add `ProfileMiniCard` above `LeaderboardMiniWidget`:

```tsx
import { ProfileMiniCard } from '@/components/pulse/widgets';

export function LeftSidebar({ providerId, userId, isFirstTime, className }: LeftSidebarProps) {
  return (
    <div className={cn("p-4 space-y-4 overflow-y-auto", className)}>
      {/* NEW: Profile Card */}
      {providerId && (
        <ProfileMiniCard providerId={providerId} userId={userId} />
      )}

      {/* Existing: Galaxy Leaderboard */}
      <LeaderboardMiniWidget currentProviderId={providerId} isFirstTime={isFirstTime} />

      {/* Existing: XP Progress Card */}
      {providerId && (
        <Card>...</Card>
      )}
    </div>
  );
}
```

---

### Part 4: Create Hook for Profile Updates

**New file:** `src/hooks/mutations/usePulseProfile.ts`

```typescript
// Update pulse headline
export function useUpdatePulseHeadline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ providerId, headline }: { providerId: string; headline: string }) => {
      const { error } = await supabase
        .from('pulse_provider_stats')
        .update({ pulse_headline: headline, updated_at: new Date().toISOString() })
        .eq('provider_id', providerId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['pulse-stats', vars.providerId] });
      toast.success('Headline updated');
    },
  });
}

// Update profile avatar
export function useUpdateProfileAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, avatarUrl }: { userId: string; avatarUrl: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['profile', vars.userId] });
      toast.success('Photo updated');
    },
  });
}
```

---

### Part 5: Update PulseLayout to Pass userId

**Modify:** `src/components/pulse/layout/PulseLayout.tsx`

Ensure `userId` is passed to `LeftSidebar`:

```tsx
// Get userId from auth
const { user } = useAuth();

// Pass to LeftSidebar
<LeftSidebar 
  providerId={providerId} 
  userId={user?.id}
  isFirstTime={isFirstTime} 
/>
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| **Migration** | CREATE | Add `pulse_headline` column to `pulse_provider_stats` |
| `src/components/pulse/widgets/ProfileMiniCard.tsx` | CREATE | New profile card component with photo upload + headline |
| `src/components/pulse/widgets/index.ts` | MODIFY | Export ProfileMiniCard |
| `src/hooks/mutations/usePulseProfile.ts` | CREATE | Mutations for headline and avatar updates |
| `src/components/pulse/layout/LeftSidebar.tsx` | MODIFY | Add ProfileMiniCard above LeaderboardMiniWidget |
| `src/components/pulse/layout/PulseLayout.tsx` | MODIFY | Pass userId to LeftSidebar |

**Total: 2 new files, 3 modified files, 1 migration**

---

## Visual Result

```text
┌─────────────── Left Sidebar ──────────────┐
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │      ┌──────────┐                    │  │
│  │      │  📷      │ ← Upload overlay   │  │
│  │      │  Avatar  │                    │  │
│  │      └──────────┘                    │  │
│  │                                      │  │
│  │  Senior Consultant ✏️                │  │
│  │  👁️ View Profile                     │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ ✨ Galaxy Leaders         [Weekly]   │  │
│  │                                      │  │
│  │  👑 #1  John D.   +1,234 XP  ↑       │  │
│  │  🥈 #2  Sarah M.  +987 XP    ↓       │  │
│  │  🥉 #3  Mike T.   +654 XP    —       │  │
│  │  ...                                 │  │
│  │                                      │  │
│  │  [View Full Leaderboard]             │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ ⚡ Your Progress                     │  │
│  │ ...                                  │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

---

## Technical Notes

1. **Storage path for avatar**: Uses existing `pulse-media` bucket with path `{userId}/avatar/{timestamp}_{filename}`
2. **Photo validation**: Uses existing `validateFile()` with 'gallery' type (50MB max, image formats)
3. **Headline max length**: 120 characters (matching LinkedIn's limit)
4. **RLS**: Avatar upload uses `userId` (auth.uid) matching bucket RLS policy
5. **Caching**: Profile data cached with 5min staleTime, invalidated on update
