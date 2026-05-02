## Goal

Eliminate the workaround for creating `RA_R2`, `CPA_QUICK`, `CPA_STRUCTURED`, `CPA_CONTROLLED`, and clarify in-UI that the single PWA template dynamically serves all 5 workforce roles.

## What's wrong today

- The Legal Documents list only renders **Platform Agreement cards** (SPA / SKPA / PWA / PRIVACY_POLICY / DPA). The remaining 4 required codes (`RA_R2`, `CPA_QUICK`, `CPA_STRUCTURED`, `CPA_CONTROLLED`) appear in the **Health card** as "Missing" but have **no Create button anywhere** — admins must guess to use generic "+ Add Document" and pick the code from a dropdown.
- The Health card's "Manage" button just sends the user back to the same page that lacks Create CTAs for these codes.
- There is no on-screen explanation that PWA = all 5 workforce roles via `{{user_role}}` interpolation, so it looks like Creator/Curator/Reviewer/FC/LC role agreements are missing when they aren't.

## Changes

### 1. New "Role Agreements" section on the Legal Documents page
Add `RoleAgreementsSection.tsx` that renders **one card for `RA_R2`** (using the existing `PlatformAgreementCard`) plus an explanatory banner:

> "All other workforce roles — Creator, Curator, Expert Reviewer, Finance Coordinator, Legal Coordinator — are covered by the single **PWA** template above. The role label is injected dynamically at signature time via `{{user_role}}`."

If `RA_R2` is missing, the card shows "Create" → routes to `/admin/legal-documents/new?code=RA_R2`.

### 2. New "Challenge Participation Agreements (CPA)" section
Add `CpaTemplatesSection.tsx` rendering 3 cards (one per governance mode) with mode-colored badges (reusing `CPA_MODE_COLORS`, `CPA_MODE_DESCRIPTIONS` from `cpaDefaults.constants.ts`). Each missing card has a "Create" button → `/admin/legal-documents/new?code=CPA_QUICK|STRUCTURED|CONTROLLED`.

### 3. Auto-seed default content for new CPAs and RA_R2
In `useLegalDocEditor.ts`, when on the `new` route AND `?code=CPA_*`, pre-fill the editor with `CPA_DEFAULT_TEMPLATES[mode]` (already defined in `src/constants/cpaDefaults.constants.ts`). For `?code=RA_R2`, seed a minimal Seeker-Admin role-agreement skeleton (new constant `RA_R2_DEFAULT_TEMPLATE` in `src/constants/legalDefaults.constants.ts`).

This means clicking "Create" lands the admin in the editor with a usable starting draft — they only need to review and Publish.

### 4. Health card "Manage" deep-links to the right card
Update `LegalSystemHealthCard.tsx` so each missing row's row-level action (or the bottom Manage button) anchors-scrolls to the relevant section (`#role-agreements`, `#cpa-templates`).

### 5. Sidebar dropdown polish
In `LegalDocConfigSidebar.tsx`, group the document code dropdown into sections (Platform / Role / CPA / Privacy) for clarity when the generic "+ Add Document" is used.

## Files

- **New:** `src/components/admin/legal/RoleAgreementsSection.tsx`
- **New:** `src/components/admin/legal/CpaTemplatesSection.tsx`
- **New:** `src/constants/legalDefaults.constants.ts` (RA_R2 skeleton)
- **Edit:** `src/pages/admin/legal/LegalDocumentListPage.tsx` — mount the two new sections
- **Edit:** `src/hooks/admin/useLegalDocEditor.ts` — seed default content by `?code=`
- **Edit:** `src/components/admin/legal/LegalSystemHealthCard.tsx` — anchor links
- **Edit:** `src/components/admin/legal/LegalDocConfigSidebar.tsx` — grouped dropdown

## Out of scope

- No DB schema changes. No changes to `roleToDocumentMap.ts` (the PWA-covers-5-roles model is correct).
- No changes to the signature/gate flow.

## Acceptance

1. Legal Documents page shows 3 sections: Platform Agreements, Role Agreements (with RA_R2 + explainer), CPA Templates (3 mode cards).
2. Each missing doc has a visible Create button on its own card.
3. Clicking Create lands in the editor with seeded default content for that code.
4. Publishing makes the Health card flip from "Missing" → "OK".
5. UI explains why only RA_R2 is listed and PWA serves the other 5 roles.
