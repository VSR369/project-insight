

# Plan: Admin Verification Knowledge Centre

## Overview
Add a "Knowledge Centre" item under the Verification section in the admin sidebar, linking to a new page at `/admin/verification-knowledge-centre`. The page will provide a user-manual-style guide covering every aspect of the verification workflow — written in plain language with expandable accordion sections for each topic.

## Design Approach
- Reuse the accordion pattern (Radix `Accordion`) for expandable topic sections — more practical than the card grid used in the SO Admin Knowledge Centre, since this content is denser and action-oriented
- Each topic: icon + title + detailed description covering what it is, how it works, and what to do
- Group topics into logical sections matching the verification workflow
- Fully static content, no DB calls

## Content Structure (13 topics across 4 groups)

**Getting Started**
1. **Verification Dashboard Overview** — My Assignments tab, Open Queue tab, count badges, what each shows
2. **Understanding SLA Tiers** — TIER1 (warning), TIER2/TIER3 (breach), amber/red banners, what action to take
3. **Team Overview Cards** — Supervisor-only KPI cards, what metrics they show

**Working a Verification**
4. **Claiming from the Open Queue** — How to claim, what happens after claim, assignment method badge
5. **The V1–V6 Checklist** — Each check explained: V1 Domain, V2 Identity, V3 Documents, V4 Compliance, V5 Admin Identity, V6 Final Review. V6 gate rule (requires V1-V5 complete)
6. **Terminal Actions: Approve, Reject, Return** — What each does, confirmation dialogs, when to use which, what happens to the org after each
7. **Registrant Communications** — How to use the comms thread, when to contact the registrant, email notifications

**Queue & Assignment Management**
8. **Releasing to Queue** — When and how to release, release window countdown
9. **Requesting Reassignment** — How to request, what the supervisor sees
10. **Supervisor Force Reassign** — Supervisor-only: how to reassign verifications between admins

**Administration**
11. **My Availability & Workload** — How availability affects queue assignment, workload bar meaning
12. **My Performance Metrics** — What the performance page tracks
13. **System Config & Permissions** — Supervisor-only: SLA thresholds, escalation contacts, permission management

## File Changes

| File | Action |
|------|--------|
| `src/pages/admin/verifications/VerificationKnowledgeCentrePage.tsx` | **Create** — Full knowledge centre page with accordion sections |
| `src/components/admin/AdminSidebar.tsx` | **Edit** — Add "Knowledge Centre" menu item under Verification group (line ~366, before the closing `</SidebarMenu>`) |
| `src/App.tsx` | **Edit** — Add lazy import + route for `/admin/verification-knowledge-centre` |
| `src/components/admin/AdminHeader.tsx` | **Edit** — Add `'verification-knowledge-centre': 'Knowledge Centre'` to `pathNames` map |

## UI Design
- Back button → `/admin/verifications`
- Page title: "Verification Knowledge Centre"
- Subtitle: "Step-by-step guides for every part of the verification workflow."
- Accordion groups with section headers, each item has icon + title + rich description paragraph
- Consistent with existing page patterns (p-6 spacing, text-2xl heading)

