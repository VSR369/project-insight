

# Fix Expected Outcomes Badge Status + AI Format Issues

## Changes

### 1. `src/pages/cogniblend/CurationReviewPage.tsx` (line 2107)
Add `addressed` check before status mapping:

```typescript
else if (aiReview) {
  if (aiReview.addressed) panelStatus = "accepted";
  else if (aiReview.status === "pass") panelStatus = "pass";
  else if (aiReview.status === "warning") panelStatus = "warning";
  else if (aiReview.status === "needs_revision") panelStatus = "needs_revision";
}
```

### 2. `src/components/cogniblend/curation/renderers/DeliverableCardRenderer.tsx` (line 32)
Always use `badgePrefix` for consistent labeling:

```typescript
const badgeId = `${badgePrefix}${i + 1}`;
```

Two single-line fixes. No new files or dependencies.

