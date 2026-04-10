

## Fix: Creator Detail View — 5 Bugs in Governance-Aware Section Display

### Summary

The "My Version" and "Curator Version" tabs show incorrect/incomplete content because the section key lists don't match the authoritative `creatorReviewFields.ts` (5/8/12 rule), and several data types (title, reference URLs, uploaded files) are never rendered.

### Bug-by-Bug Fixes

**Bug 1 — CREATOR_SECTION_KEYS wrong counts (3/6/10 instead of 5/8/12)**

File: `src/components/cogniblend/challenges/CreatorSectionBuilders.tsx`

Update `CREATOR_SECTION_KEYS` to match `creatorReviewFields.ts`:
- QUICK: add `title`, `currency_code` → 5 keys
- STRUCTURED: add `title`, `currency_code` → 8 keys
- CONTROLLED: add `title`, `currency_code` → 12 keys

Also update the duplicate `creatorKeys` in `CreatorChallengeDetailView.tsx` (lines 48-55) to match.

**Bug 2 — buildAllSnapshotSections missing `title` and `currency_code` sections**

File: `src/components/cogniblend/challenges/CreatorSectionBuilders.tsx`

Add a `title` section (fieldKey: `'title'`) as the first entry in `buildAllSnapshotSections` — renders as a simple Card with the challenge title text. Add a `currency_code` section that displays the currency. Similarly add both to `buildAllCuratorSections`.

**Bug 3 — Curator `expected_timeline` reads wrong field**

File: `src/components/cogniblend/challenges/CreatorSectionBuilders.tsx`, line 255

Change from:
```
content: data.submission_deadline ? <BadgeSection ... value={data.submission_deadline} />
```
To:
```
content: phaseSchedule?.expected_timeline
  ? <BadgeSection ... value={String(phaseSchedule.expected_timeline)} />
  : null
```
`phaseSchedule` already exists (line 198). The `submission_deadline` is a date — not the timeline text.

**Bug 4 — Reference URLs never displayed**

File: `src/components/cogniblend/challenges/CreatorSectionRenderers.tsx`

Add a `ReferenceLinksSection` component that renders an array of URL strings as clickable links.

File: `src/components/cogniblend/challenges/CreatorSectionBuilders.tsx`

Add a `reference_urls` section to both `buildAllSnapshotSections` (reads from `eb.reference_urls`) and `buildAllCuratorSections` (reads from `extended_brief.reference_urls`). This section is not governance-gated — it renders whenever URLs exist, similar to how deliverables work in the curator view.

**Bug 5 — Creator-uploaded attachments never shown**

File: `src/components/cogniblend/challenges/CreatorAttachmentsSection.tsx` (new file)

Create a component that queries `challenge_attachments` for `section_key IN ('creator_reference', 'org_profile')` and displays filenames with type badges and download buttons (using signed URLs). Keep under 250 lines.

File: `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx`

Import and render `CreatorAttachmentsSection` between the tabs/content area and `ChallengeLegalDocsCard` (line 213).

### Files Changed (4 modified, 1 new)

| File | Change |
|------|--------|
| `src/components/cogniblend/challenges/CreatorSectionBuilders.tsx` | Fix CREATOR_SECTION_KEYS counts, add title/currency_code sections, fix expected_timeline source, add reference_urls sections |
| `src/components/cogniblend/challenges/CreatorSectionRenderers.tsx` | Add `ReferenceLinksSection` component |
| `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx` | Fix duplicate creatorKeys, add CreatorAttachmentsSection import and render |
| `src/components/cogniblend/challenges/CreatorAttachmentsSection.tsx` | **New** — queries and displays creator-uploaded files |

### No DB changes needed

All data already exists in the database. The bugs are purely in the frontend display layer.

