

# Challenge Preview Page — Implementation Plan

## Overview
Build a new seamless document-style preview page at `/cogni/curation/:id/preview` that renders all challenge data as one continuous professional report with inline editing, scroll-spy navigation, and business-rule-driven editability.

## Architecture

The preview page is a NEW route and page — it does not modify existing curation workspace components. It reuses existing renderers (`SECTIONS` array, `AiContentRenderer`, `DeliverableCardRenderer`, `RewardStructureDisplay`, etc.) but composes them into a document layout instead of the tabbed/grouped curation workspace.

```text
Route: /cogni/curation/:id/preview
Access: Right rail button, header button, Accept All auto-nav, direct URL
Data: Fresh from DB (staleTime: 0, refetchOnWindowFocus: true)
```

## File Structure (13 files)

```text
src/pages/cogniblend/ChallengePreviewPage.tsx         — Route page (composition)
src/components/cogniblend/preview/
  usePreviewData.ts           — Combined data loading (challenge, legal, escrow, digest, attachments, field rules)
  usePreviewEditability.ts    — Business rule evaluation (isGlobalReadOnly, canEditSection)
  PreviewDocument.tsx         — Scrollable document body rendering all groups/sections
  PreviewTopBar.tsx           — Sticky header (back, title, read-only badge)
  PreviewSideNav.tsx          — Sticky left scroll-spy navigation
  PreviewBottomBar.tsx        — Sticky footer (progress count, back, submit button)
  PreviewGroupHeader.tsx      — Group divider (icon + title + horizontal rule)
  PreviewSection.tsx          — Individual section: view/edit toggle, edit icon, lock icon
  PreviewOrgSection.tsx       — Organization context (name, type, description, preferences, attachments)
  PreviewLegalSection.tsx     — Conditional LC rendering (pending placeholder vs full doc list)
  PreviewEscrowSection.tsx    — Conditional FC rendering (pending placeholder vs escrow details)
  PreviewDigestSection.tsx    — Context digest with edit capability
  SectionEditSwitch.tsx       — Routes section key → correct editor component
```

## Key Technical Decisions

### 1. Data Loading (`usePreviewData.ts`)
- Single hook combining 6 queries: challenge (with org join), legal docs, escrow, digest, attachments, governance field rules
- All queries use `staleTime: 0` — always fresh
- Returns typed composite object + loading/error states

### 2. Editability (`usePreviewEditability.ts`)
- Computes `isGlobalReadOnly` from phase, lock status, master status, phase status
- `canEditSection(key)` checks global read-only, locked sections (legal/escrow), field visibility rules
- Returns both + a `sectionEditability` map for all section keys

### 3. Document Layout (`PreviewDocument.tsx`)
- Renders sections in spec order: Org → Foundation → Analysis → Specification → Assessment → Execution → Publish Settings → Legal & Compliance → Context Digest
- Uses `SECTIONS` array renderers for standard sections
- Special components for Org, Legal, Escrow, Digest
- Single `editingSection` state — only one section editable at a time
- No card borders between sections — subtle dividers, group headers as visual breaks

### 4. Inline Editing (`PreviewSection.tsx` + `SectionEditSwitch.tsx`)
- Edit icon visible only when `canEditSection(key)` is true
- Click toggles inline editor (reuses existing `TextSectionEditor`, `DeliverablesEditor`, etc.)
- Save triggers mutation → query invalidation → section re-renders
- Cancel reverts without saving
- Switching sections auto-cancels current edit

### 5. Organization Section (`PreviewOrgSection.tsx`)
- Renders org name, type, website, LinkedIn, description, tagline from `seeker_organizations` join
- Embeds `ChallengePreferencesInfo` for creator preferences
- Embeds `OrgAttachmentList` for org documents (download links)

### 6. Legal & Escrow (`PreviewLegalSection.tsx`, `PreviewEscrowSection.tsx`)
- Conditional rendering based on `lc_compliance_complete` / `fc_compliance_complete`
- Pending: shows placeholder with clock icon and explanation text
- Complete: shows full document list / escrow details
- Always displays lock icon — never editable by curator

### 7. Access Points (2 existing files to modify)
- `CurationRightRail.tsx`: Add "Preview Document" button linking to `/cogni/curation/:id/preview`
- `CurationHeaderBar.tsx`: Add "Preview" icon button in header actions

### 8. Route Registration (`App.tsx`)
- Add lazy import for `ChallengePreviewPage`
- Add route: `/cogni/curation/:id/preview`

## Styling Approach
- No card borders between sections — sections separated by subtle `border-border/50` dividers
- Group headers: bold visual break with `border-t-2`, larger spacing
- Document max-width ~800px centered for readability
- Print-friendly: hide interactive elements via `@media print`
- Left nav: 200px sticky sidebar with scroll-spy using `IntersectionObserver`

## Reused Components
- `SECTIONS` array (renderers for all standard sections)
- `AiContentRenderer` (rich text display)
- `DeliverableCardRenderer` (deliverables, outcomes, guidelines)
- `RewardStructureDisplay` (reward tiers)
- `ChallengePreferencesInfo` (challenge preferences)
- `OrgAttachmentList` (org documents)
- `LcStatusBadge` (legal doc status)
- `TextSectionEditor` / `DeliverablesEditor` etc. (inline editing)
- `useGovernanceFieldRules` (field visibility)
- `isFieldVisible` (field rule checks)

## Implementation Order
1. `usePreviewData.ts` + `usePreviewEditability.ts` (data + rules)
2. `PreviewTopBar.tsx` + `PreviewBottomBar.tsx` + `PreviewSideNav.tsx` (shell)
3. `PreviewGroupHeader.tsx` + `PreviewSection.tsx` + `SectionEditSwitch.tsx` (section rendering)
4. `PreviewOrgSection.tsx` + `PreviewLegalSection.tsx` + `PreviewEscrowSection.tsx` + `PreviewDigestSection.tsx` (special sections)
5. `PreviewDocument.tsx` (composition)
6. `ChallengePreviewPage.tsx` (route page)
7. Route registration in `App.tsx` + access buttons in `CurationRightRail.tsx` and `CurationHeaderBar.tsx`

