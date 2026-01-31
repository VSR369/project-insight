

# Plan: Remove Redundant "Build Profile" Button from Header

## Summary
Remove the "Build Profile" button from the first-time user header since the "Let's Build Your Profile" CTA already exists in the `ProfileBuildBanner` component below. This eliminates redundancy and creates a cleaner header design.

---

## Current State
The `PulseHeaderFirstTime` component has:
- Pulse branding (left)
- "Build Profile" button (right) ← **Redundant - to be removed**

Meanwhile, the `ProfileBuildBanner` already has the prominent "Let's Build Your Profile" CTA.

---

## Changes Required

### File: `src/components/pulse/layout/PulseHeaderFirstTime.tsx`

**Before:**
```tsx
import { Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function PulseHeaderFirstTime() {
  const navigate = useNavigate();

  return (
    <header className="...">
      <div className="... justify-between">
        {/* Pulse branding */}
        ...
        
        {/* Build Profile CTA - REDUNDANT */}
        <Button onClick={() => navigate('/pulse/get-started')} ...>
          Build Profile
          <ArrowRight />
        </Button>
      </div>
    </header>
  );
}
```

**After:**
```tsx
import { Sparkles } from 'lucide-react';

export function PulseHeaderFirstTime() {
  return (
    <header className="...">
      <div className="... justify-center">
        {/* Center - Pulse branding only */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 ...">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold text-xl ...">
            Pulse
          </span>
        </div>
      </div>
    </header>
  );
}
```

---

## What Changes

| Item | Action |
|------|--------|
| Import `ArrowRight` | Remove |
| Import `useNavigate` | Remove |
| Import `Button` | Remove |
| `const navigate = useNavigate()` | Remove |
| Flex alignment | Change from `justify-between` to `justify-center` |
| "Build Profile" Button | Remove entirely |
| Pulse branding | Keep, center it |

---

## Result
- Cleaner header with just the Pulse branding centered
- Single CTA in the `ProfileBuildBanner` ("Let's Build Your Profile")
- No duplicate navigation options confusing users

