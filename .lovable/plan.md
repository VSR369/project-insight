

## Fix: Revert Additional Context Tab to CONTROLLED-Only

### Root Cause

The previous fix changed the Additional Context tab visibility from `isControlled` to `!isQuick`, which was wrong. This exposes all CONTROLLED-level fields (stakeholders, root causes, deficiencies, preferred approach, etc.) to STRUCTURED mode users — violating the 5-8-12 field rule.

STRUCTURED mode's 8 fields are: title, problem_statement, domain_tags, currency_code, platinum_award, scope, maturity_level, weighted_criteria. The two optional context fields (context_background, expected_timeline) already appear in a collapsible section inside the **Essential Details** tab (EssentialDetailsTab.tsx lines 109-145). STRUCTURED does NOT need the Additional Context tab at all.

### Fix (1 file, 1 line)

**`src/components/cogniblend/creator/ChallengeCreatorForm.tsx`**

Revert the tab trigger gate from `{!isQuick && (` back to `{isControlled && (`:

```tsx
{isControlled && (
  <TabsTrigger
    value="context"
    className="flex-1 gap-2 py-3 px-5 text-sm font-semibold rounded-lg border border-transparent data-[state=active]:border-accent/40 data-[state=active]:bg-background data-[state=active]:text-accent-foreground data-[state=active]:shadow-md transition-all duration-200"
  >
    📋 Additional Context
    <span className="text-destructive text-xs font-bold ml-0.5">*</span>
  </TabsTrigger>
)}
```

### Field visibility summary after fix

| Mode | Essential Details Tab | Additional Context Tab |
|------|----------------------|----------------------|
| QUICK | 5 required fields | Hidden |
| STRUCTURED | 8 fields + collapsible optional section (context_background, expected_timeline) | Hidden |
| CONTROLLED | 8 core fields | Visible with all 4 extra context fields required (12 total) |

