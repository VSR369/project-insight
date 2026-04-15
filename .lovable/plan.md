

# Fix: Diagnostics Status Labels + Pass 2 False Positives

## Changes

### 1. `DiagnosticsReviewPanel.tsx` — Update Pass 1 labels

Current labels: "Analysed" / "Drafted"

New labels:
| Scenario | Label |
|----------|-------|
| Success, action was `review` | **"Suggestion Ready"** |
| Success, action was `generate` | **"Drafted & Suggestion Ready"** |
| Error | "Error" |
| Skipped | "Skipped" |
| Not executed | "Not Run" |

Also update the wave summary badge from `"{n} analysed"` to `"{n} ready"`.

### 2. `DiagnosticsSuggestionsPanel.tsx` — Remove store fallback (PRIMARY BUG FIX)

When no `generateRecord` exists (Pass 2 never ran), the panel currently falls back to checking `entry?.aiSuggestion` from the section store — which Pass 1 populates. This causes false "Content Drafted" / "Suggestions Generated" statuses.

**Fix:** When `hasRecord` is false (no generate execution record), show a banner "Generate Suggestions has not been run yet" and mark ALL sections as "Not Run". Remove all fallback logic that reads from the section store.

When `hasRecord` is true, keep existing labels but standardize:
| Scenario | Label |
|----------|-------|
| Success, action was `generate` | "Content Drafted" |
| Success, action was `review` | "Suggestion Generated" |
| Error | "Error" |
| Skipped | "Skipped" |

## Files

| File | Change |
|------|--------|
| `src/components/cogniblend/diagnostics/DiagnosticsReviewPanel.tsx` | Update status labels at lines 118-126 and badge text at line 92 |
| `src/components/cogniblend/diagnostics/DiagnosticsSuggestionsPanel.tsx` | Remove store fallback at lines 73-78, 108-126, 130. Show "Not Run" banner when no record exists |

## No database changes

