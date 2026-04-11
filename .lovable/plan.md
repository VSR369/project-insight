

## Fix: Make `creator_references` Section Editable by Curator

### Problem
The `CreatorReferencesRenderer` is a read-only viewer. If the Creator uploads nothing, the Curator sees "No reference documents uploaded by Creator" with no way to add their own. This violates the principle that **every section must be editable by the Curator**.

### Root Cause
1. `creator_references` is **not** in `SECTION_UPLOAD_CONFIG` -- so `SectionReferencePanel` returns `null` for it
2. `CreatorReferencesRenderer` has no upload UI -- it only queries and displays existing attachments
3. The `renderOpsSections` case for `creator_references` renders `CreatorReferencesRenderer` without passing `isReadOnly` -- it's always display-only

### Fix (2 files)

**1. `src/lib/cogniblend/sectionUploadConfig.ts`** -- Add `creator_references` entry

Add a config entry so the existing `SectionReferencePanel` infrastructure works for this section:

```typescript
creator_references: {
  enabled: true, maxFiles: 5, maxUrls: 3, maxFileSizeMB: 25,
  acceptedFormats: DOC_IMG,
  uploadPrompt: 'Upload reference documents, research papers, or supporting materials',
  urlPrompt: 'Add link to external reference or resource',
  sharingDefault: false, sharingRecommendation: 'optional',
},
```

Also add sharing guidance in `SHARING_GUIDANCE`:
```typescript
creator_references: 'Share reference documents that help solvers understand the challenge context. Remove confidential internal materials.',
```

**2. `src/components/cogniblend/curation/renderers/CreatorReferencesRenderer.tsx`** -- Add Curator upload capability

Change the empty state from a dead-end message to include the upload form. Accept `isReadOnly` prop. When `!isReadOnly` and no Creator attachments exist, show a helpful message + the upload infrastructure. When Creator attachments exist, show them (as today) plus the upload area below.

The simplest approach: import and render `SectionReferencePanel` below the Creator attachments list (or in place of the empty message). This reuses all existing upload/URL/extraction infrastructure without duplication.

Updated component structure:
- Props: add `isReadOnly?: boolean` (default `true` for backward compat)
- Render: Creator attachments list (existing) + `SectionReferencePanel` when `!isReadOnly`
- Empty state: "No reference documents uploaded by Creator." + upload form (when editable)

**3. `src/components/cogniblend/curation/renderers/renderOpsSections.tsx`** -- Pass `isReadOnly`

Change line 142 from:
```typescript
return <CreatorReferencesRenderer challengeId={args.challengeId} />;
```
To:
```typescript
return <CreatorReferencesRenderer challengeId={args.challengeId} isReadOnly={isReadOnly} />;
```

### What stays the same
- All other sections' upload configs unchanged
- `SectionReferencePanel` logic unchanged -- it already handles `creator_references` once the config exists
- Creator-uploaded files still display with download buttons
- No migration needed

### Files changed
| File | Change |
|------|--------|
| `sectionUploadConfig.ts` | Add `creator_references` config + sharing guidance |
| `CreatorReferencesRenderer.tsx` | Add `isReadOnly` prop, render `SectionReferencePanel` for Curator |
| `renderOpsSections.tsx` (line 142) | Pass `isReadOnly` to renderer |

