

## Fix 3 — Move creator_references + reference_urls from Wave 6 to Wave 3

### What This Fixes
Creator reference documents and URLs should inform the AI review of deliverables and scope (Wave 3), not wait until the final presentation wave (Wave 6). Moving them earlier means the AI can use creator-provided references when reviewing specification sections.

### Changes

**`src/lib/cogniblend/waveConfig.ts`** — Two edits:

1. **Wave 3** (line ~67): Add `'creator_references'` and `'reference_urls'` to `sectionIds`
2. **Wave 6** (line ~89): Remove `'creator_references'` and `'reference_urls'` from `sectionIds`

No other files affected.

### Files Changed

| File | Action |
|------|--------|
| `src/lib/cogniblend/waveConfig.ts` | Move 2 sections from Wave 6 to Wave 3 |

