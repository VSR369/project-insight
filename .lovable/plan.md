

# Fix: AI Review Button Disabled in QUICK Mode — UX Clarity

## Root Cause

The AI Review button on the Creator form (line 193 of `ChallengeCreatorForm.tsx`) is **not mode-gated** — it renders for all governance modes including QUICK. However, it is disabled when `!draftSave.draftChallengeId`, meaning the user must click "Save Draft" first. The button provides no tooltip or visual hint explaining this prerequisite, making it appear broken or intentionally disabled for QUICK mode.

**AI Review is designed to work for all modes** (per governance policy: "AI Review is advisory for all modes"). The 5 Creator-owned fields in QUICK are reviewed just like the 8/12 fields in other modes.

## Fix

### Step 1: Add disabled-state tooltip to AI Review button

Wrap the AI Review button in a `Tooltip` when disabled, showing "Save draft first to enable AI Review". This applies to all modes, not just QUICK.

**File:** `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` (line 193)

```tsx
// Wrap AI Review button with Tooltip when no draftChallengeId
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <span> {/* span wrapper needed for disabled button tooltip */}
        <Button
          type="button"
          variant={isControlled ? 'default' : 'outline'}
          onClick={async () => {
            await draftSave.handleSaveDraft();
            setShowAIReview(true);
          }}
          disabled={isBusy || !draftSave.draftChallengeId}
          className="gap-1.5"
        >
          <Sparkles className="h-4 w-4" />
          AI Review
          {isControlled && <Badge variant="secondary" className="ml-1 text-[10px]">Advisory</Badge>}
          {!isControlled && !isQuick && <Badge variant="outline" className="ml-1 text-[10px]">Recommended</Badge>}
        </Button>
      </span>
    </TooltipTrigger>
    {!draftSave.draftChallengeId && (
      <TooltipContent>Save draft first to enable AI Review</TooltipContent>
    )}
  </Tooltip>
</TooltipProvider>
```

### Step 2: Add QUICK-mode badge for consistency

Currently QUICK mode shows no badge on the AI Review button (CONTROLLED shows "Advisory", STRUCTURED shows "Recommended"). Add an "Optional" badge for QUICK to signal the feature is available but not required.

```tsx
{isQuick && <Badge variant="outline" className="ml-1 text-[10px]">Optional</Badge>}
```

### Files Changed
- `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` — tooltip on disabled AI Review button + QUICK badge

