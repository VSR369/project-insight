

# Add Org Profile Document Upload to Creator's Organization Context Card

## What
The Curation side already supports org profile document uploads (via `OrgAttachmentList` + `useOrgContextData` using `challenge_attachments` with `section_key='org_profile'`). The Creator's `CreatorOrgContextCard` currently only has text fields. We will add the same document upload capability so Creators can share org/department profile documents (annual reports, capability decks, department overviews) alongside their challenge — these are about the **organization**, not the challenge itself.

## Approach

Since `CreatorOrgContextCard` does its own direct Supabase calls (no hook extraction), we will add a lightweight upload section at the bottom of the card. The upload will store files to `challenge_attachments` with `section_key='org_profile'` — the same table/key the Curation side reads — so documents flow through seamlessly.

**However**, there is a subtlety: the Creator card does not have a `challengeId` prop (it only has `organizationId`). Org profile uploads currently go into `challenge_attachments` which requires a `challengeId`. Two options:

1. Pass `challengeId` into `CreatorOrgContextCard` and use the existing pattern
2. Store org docs at the organization level (a new approach)

Option 1 is simpler and consistent with how Curation already works. We will pass the `challengeId` through.

## Files Modified

| File | Change |
|------|--------|
| `src/components/cogniblend/creator/CreatorOrgContextCard.tsx` | Add `challengeId` prop, add file upload query/handlers, render `OrgAttachmentList` at bottom |
| `src/pages/cogniblend/ChallengeCreatePage.tsx` | Pass `challengeId` (from draft) to `CreatorOrgContextCard` |

## Technical Detail

### CreatorOrgContextCard changes
- Add `challengeId?: string` to props interface
- Add a query for existing org profile attachments: `challenge_attachments` where `section_key='org_profile'` and `challenge_id=challengeId`
- Add upload handler (upload to `challenge-attachments` storage bucket, insert row with `section_key='org_profile'`)
- Add delete handler
- Render `OrgAttachmentList` (reuse existing component from curation) below the editable fields, inside the collapsible content
- Only show the upload section when `challengeId` is available (draft must be saved first)
- Show a small hint: "Upload org or department profile documents — these help AI understand your organization, not the specific challenge"

### ChallengeCreatePage changes
- Pass the current `challengeId` (from saved draft state) to `CreatorOrgContextCard`
- If no draft exists yet, the upload section will be hidden with a note: "Save draft first to upload documents"

