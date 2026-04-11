

## Fix D: DigestPanel — Editable with Save + Confirm

### What This Fixes
The DigestPanel currently shows the AI-generated digest as read-only text. Curators need to edit the digest before it feeds into Pass 2 suggestions. This fix adds Edit/Save/Confirm flow and persists edits to the database.

### Changes

**1. Database migration — add curator edit tracking columns + UPDATE RLS policy**

Add `curator_edited` (boolean), `curator_edited_at` (timestamptz), and `original_digest_text` (text) columns to `challenge_context_digest`. Create an UPDATE RLS policy allowing curators (CU/SA/PA roles) to edit digests for their assigned challenges.

**2. `src/hooks/cogniblend/useContextLibrary.ts`**

- Update `ContextDigest` interface to include `curator_edited`, `curator_edited_at`, `original_digest_text`
- Update `useContextDigest` to select the new columns explicitly (replace `select('*')` per workspace rules)
- Add `useSaveDigest(challengeId)` mutation hook that:
  - Fetches existing digest to preserve `original_digest_text` on first edit
  - Updates `digest_text`, `curator_edited`, `curator_edited_at`, `original_digest_text`
  - Invalidates digest query key on success

**3. `src/components/cogniblend/curation/context-library/DigestPanel.tsx`** — Full replacement

Replace the read-only panel with an editable version featuring:
- Read mode: digest text in a styled container, key facts display, "Confirm Digest" button
- Edit mode: textarea for editing, Save/Cancel buttons, "Restore AI original" option
- Badges for "Edited" and "Confirmed" states
- Props: `onSave`, `isSaving`, `onConfirm` (in addition to existing props)
- Stays under 250 lines

**4. `src/components/cogniblend/curation/ContextLibraryDrawer.tsx`**

- Import and call `useSaveDigest`
- Wire `onSave`, `isSaving`, `onConfirm` props to `DigestPanel`
- `onConfirm` calls `handleClose` (closing drawer sets `contextLibraryReviewed = true` via existing orchestrator logic)

### Files Changed

| File | Action |
|------|--------|
| `supabase/migrations/[ts]_digest_curator_edit.sql` | Add columns + UPDATE RLS policy |
| `src/hooks/cogniblend/useContextLibrary.ts` | Update interface, query, add `useSaveDigest` |
| `src/components/cogniblend/curation/context-library/DigestPanel.tsx` | Full rewrite with edit/save/confirm |
| `src/components/cogniblend/curation/ContextLibraryDrawer.tsx` | Wire save + confirm props |

