

## Fix: Show Additional Context Tab for STRUCTURED Mode

### Problem
The "Additional Context" tab (line 228) is gated behind `isControlled`, meaning STRUCTURED governance users never see it. STRUCTURED mode has fields like stakeholders, root causes, and preferred approaches that belong in this tab.

### Fix (1 file)

**`src/components/cogniblend/creator/ChallengeCreatorForm.tsx` — line 228**

Change `{isControlled && (` to `{!isQuick && (`, and conditionally render the asterisk only for CONTROLLED:

```tsx
{!isQuick && (
  <TabsTrigger
    value="context"
    className="flex-1 gap-2 py-3 px-5 text-sm font-semibold rounded-lg border border-transparent data-[state=active]:border-accent/40 data-[state=active]:bg-background data-[state=active]:text-accent-foreground data-[state=active]:shadow-md transition-all duration-200"
  >
    📋 Additional Context
    {isControlled && <span className="text-destructive text-xs font-bold ml-0.5">*</span>}
  </TabsTrigger>
)}
```

### Fix 2 — referenceUrls
Already implemented and verified. No changes needed.

