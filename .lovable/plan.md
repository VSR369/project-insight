

# Final Cleanup: Migrate 3 Remaining Raw Role Checks

## Changes (3 files)

### File 1: `src/pages/cogniblend/ChallengeCreatePage.tsx`

Since `isAMorRQ` and `isCreatorRole` are referenced multiple times (11 occurrences), use the alias destructuring approach to avoid a large rename:

```typescript
// Add import:
import { useCogniPermissions } from '@/hooks/cogniblend/useCogniPermissions';

// Replace lines 399-400:
const { isBusinessOwner: isAMorRQ, isSpecRole: isCreatorRole } = useCogniPermissions();
```

### File 2: `src/components/cogniblend/dashboard/ActionItemsWidget.tsx`

```typescript
// Add import:
import { useCogniPermissions } from '@/hooks/cogniblend/useCogniPermissions';

// Add to component body:
const { isBusinessOwner } = useCogniPermissions();

// Replace line 53:
// FROM: ).length + ((!activeRole || ['AM', 'RQ'].includes(activeRole))
// TO:   ).length + (isBusinessOwner
```

### File 3: `src/components/cogniblend/dashboard/MyActionItemsSection.tsx`

```typescript
// Add import:
import { useCogniPermissions } from '@/hooks/cogniblend/useCogniPermissions';

// Add to component body:
const { isBusinessOwner } = useCogniPermissions();

// Replace line 179:
// FROM: const showSRs = !activeRole || ['AM', 'RQ'].includes(activeRole);
// TO:   const showSRs = isBusinessOwner;
```

## Result

Zero raw role-based permission checks remain. All permission gating flows through `useCogniPermissions`. Raw `activeRole` usage is limited to display labels, challenge-level filtering, and nav dimming.

**Files modified**: 3

