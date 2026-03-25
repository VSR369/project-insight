

# Use "Reviewed ✓" instead of "Accepted" for addressed AI reviews

## Problem
When AI review comments are addressed (accepted), the panel shows an "Accepted" badge (with ShieldCheck icon). Every other section that passes AI review shows "Reviewed ✓" (green, with CheckCircle2). There's no reason for a separate "Accepted" status — it should be consistent.

## Fix
One-line change in `src/pages/cogniblend/CurationReviewPage.tsx` (line 2101):

```typescript
// Current:
if (aiReview.addressed) panelStatus = "accepted";

// Fixed:
if (aiReview.addressed) panelStatus = "pass";
```

This makes addressed sections show the same green "Reviewed ✓" badge as sections that passed AI review cleanly. No new statuses, no inconsistency.

Also apply the same fix in `src/components/cogniblend/curation/ExtendedBriefDisplay.tsx` — add the `addressed` check there too (it's currently missing), mapping to `"pass"`.

## Files
| File | Change |
|------|--------|
| `CurationReviewPage.tsx` | Change `"accepted"` → `"pass"` on line 2101 |
| `ExtendedBriefDisplay.tsx` | Add `if (aiReview.addressed) panelStatus = "pass";` before the status checks (line ~316) |

