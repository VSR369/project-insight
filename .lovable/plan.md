

## Fix: Complexity Lock Button Shows on Empty AI Tab

### Problem
The "Lock Assessment" button appears when the AI review tab is active even if no AI values have been changed from the default (5). This lets curators lock an empty/default assessment.

### Change

**File: `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx`** (lines 104-108)

Replace the current `canLock` logic with value-aware checks:

```typescript
// Before (lines 104-108):
const canLock = hasExistingAssessment && !showActions && (
  (state.activeTab === 'ai_review') ||
  (state.activeTab === 'manual_params') ||
  (state.activeTab === 'quick_select' && currentLevel != null && state.overrideLevel !== null)
);

// After:
const hasAiValues = state.activeTab === 'ai_review' &&
  Object.values(state.aiDraft).some(v => v !== 5);
const hasManualValues = state.activeTab === 'manual_params' &&
  Object.values(state.manualDraft).some(v => v !== 5);
const hasQuickSelect = state.activeTab === 'quick_select' && state.overrideLevel !== null;

const canLock = hasExistingAssessment && !showActions && (
  hasAiValues || hasManualValues || hasQuickSelect
);
```

This ensures the lock button only appears when the active tab has meaningful (non-default) values.

### Files changed

| File | Action |
|------|--------|
| `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx` | Replace `canLock` with value-aware gating |

