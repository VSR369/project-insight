

## Fix: Make `industry_segment_id` mandatory for ALL governance modes

### Current behavior
Lines 90-92 of `creatorFormSchema.ts` make `industry_segment_id` optional for QUICK mode:
```typescript
industry_segment_id: isQuick
  ? z.string().optional().default('')
  : z.string().min(1, 'Please select an industry segment'),
```

### Change
Replace lines 90-92 with a single mandatory rule for all modes:
```typescript
industry_segment_id: z.string().min(1, 'Please select an industry segment'),
```

### Files changed
| File | Change |
|------|--------|
| `src/components/cogniblend/creator/creatorFormSchema.ts` (line 90-92) | Remove QUICK conditional, make mandatory for all modes |

One line change. No other files affected.

