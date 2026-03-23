

# Add View Mode to ConversationalIntakeContent + Fix AMRequestViewPage Toggle

## What's Broken
1. `AMRequestViewPage` passes hardcoded `mode="edit"` to `ConversationalIntakeContent` (line 44) instead of the dynamic `pageMode` state — so the View/Edit toggle does nothing for CA/CR roles.
2. `ConversationalIntakeContent` only accepts `'create' | 'edit'` — it has no `'view'` mode, so even if `pageMode` were passed, fields would remain editable.

## What Will NOT Change
- AM/RQ flow (SimpleIntakeForm) — already working with view/edit toggle.
- No separate code for MP vs AGG — the same `ConversationalIntakeContent` component is reused; only a `mode` prop changes behavior.
- All existing create/edit functionality remains intact.

## Changes

### File 1: `src/pages/cogniblend/ConversationalIntakePage.tsx`

**Props**: Extend `mode` type from `'create' | 'edit'` to `'create' | 'edit' | 'view'`.

**Add `isViewMode` flag** (alongside existing `isEditMode`):
```
const isViewMode = mode === 'view';
```

**When `isViewMode` is true**:
- All `Input`, `Textarea`, `Select`, `Calendar` fields get `disabled` prop
- `MaturityCard` buttons get `disabled` / `pointer-events-none`
- `TemplateSelector` gets a `disabled` prop (or is hidden)
- `FileUploadArea` section is hidden
- "Expand Challenge Details" collapsible auto-opens if content exists, fields are disabled
- Governance Mode cards and Engagement Model selector are disabled
- "Advanced Editor" button is hidden
- Action buttons section (Generate/Update/Continue) is hidden entirely
- "AI-Assisted" info badge is hidden
- Dynamic brief fields from AM are shown as disabled textareas

This reuses the exact same layout/component — no duplicate code. Just conditional `disabled` attributes and a few `{!isViewMode && ...}` wrappers for action-only sections.

### File 2: `src/pages/cogniblend/AMRequestViewPage.tsx`

Single-line fix: change `mode="edit"` to `mode={pageMode}` so the toggle actually works for CA/CR:

```typescript
<ConversationalIntakeContent challengeId={id} mode={pageMode} hideSpecReview />
```

## Summary
- 2 files modified, 0 new files
- No code duplication between MP and AGG
- AM/RQ path untouched
- CA/CR get the same view/edit toggle behavior that AM/RQ already has

