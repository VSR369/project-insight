

# Plan: Group-Specific Knowledge Centre Pages for All 8 Admin Sidebar Groups

## What Exists Today
- One detailed Knowledge Centre page at `/admin/verification-knowledge-centre` covering Operations/Verification topics (575 lines, accordion-based, tier-filtered content)
- It lives under the "Operations" sidebar group
- Pattern: static content arrays → accordion groups → tier-filtered visibility

## What We'll Build
7 new Knowledge Centre pages (one per remaining group), plus convert the existing Verification KC into the Operations group KC. Each page covers **only** the screens within its sidebar group.

### The 8 Knowledge Centres

| # | Group | Route | Covers |
|---|-------|-------|--------|
| 1 | Dashboard | `/admin/kc/dashboard` | Dashboard overview, navigation, tier badges |
| 2 | Reference Data | `/admin/kc/reference-data` | Countries, Industry Segments, Org Types, Participation Modes, Expertise Levels, Departments, Functional Areas, Proficiency Taxonomy |
| 3 | Interview & Review | `/admin/kc/interview-review` | Interview KIT, Quorum Requirements, Reviewer Availability, Reviewer Approvals |
| 4 | Operations | existing `/admin/verification-knowledge-centre` | Keep existing content + add Org Approvals, Enterprise Agreements, Notification Audit, Team Performance articles |
| 5 | Marketplace | `/admin/kc/marketplace` | Dashboard, Resource Pool, Solution Requests, Assignment History, Admin Contact, Email Templates |
| 6 | Seeker Config | `/admin/kc/seeker-config` | Pricing Overview, Subscription Tiers, Membership Tiers, Engagement Models, Challenge Complexity, Base Fees, Platform Fees, Challenge Statuses, Platform Terms, Tax Formats, Subsidized Pricing, Postal Formats, Billing Cycles, Payment Methods, Shadow Pricing, Compliance (Export Control, Data Residency, Blocked Domains) |
| 7 | Content & Invitations | `/admin/kc/content-invitations` | Question Bank, Capability Tags, Solution Provider Invitations, Panel Reviewer Invitations |
| 8 | My Workspace | `/admin/kc/my-workspace` | My Profile, My Performance, My Availability, Settings, Platform Admins, Assignment Audit Log, System Config, Permissions, Dev Tools |

## Implementation Approach

### Architecture (follows existing VerificationKnowledgeCentrePage pattern exactly)
- Each page: static `GROUPS` array → `Accordion` component → tier-filtered sections
- Each article: icon, title, plain-language content with real-life examples, no jargon
- Back button navigates to the group's primary screen
- Wrapped in `FeatureErrorBoundary`

### Files Created (7 new pages)
```
src/pages/admin/knowledge-centre/DashboardKCPage.tsx
src/pages/admin/knowledge-centre/ReferenceDataKCPage.tsx
src/pages/admin/knowledge-centre/InterviewReviewKCPage.tsx
src/pages/admin/knowledge-centre/MarketplaceKCPage.tsx
src/pages/admin/knowledge-centre/SeekerConfigKCPage.tsx
src/pages/admin/knowledge-centre/ContentInvitationsKCPage.tsx
src/pages/admin/knowledge-centre/MyWorkspaceKCPage.tsx
```

### Files Modified
1. **`src/App.tsx`** — Add 7 new lazy-loaded routes under `/admin/kc/*`
2. **`src/components/admin/AdminSidebar.tsx`** — Add a small "?" or `BookOpen` icon link next to each group label that navigates to that group's KC page (non-intrusive, does not disrupt existing navigation)
3. **`src/pages/admin/verifications/VerificationKnowledgeCentrePage.tsx`** — Expand with articles for the additional Operations items (Org Approvals, Enterprise Agreements, Notification Audit, Team Performance)
4. **`src/components/admin/AdminHeader.tsx`** — Add breadcrumb mappings for the new KC routes

### Sidebar Integration (minimal, non-disruptive)
Each group label gets a small help icon (BookOpen, 14px) that links to that group's KC. This is purely additive — no existing menu items move, no routes change, no permissions change.

```text
Reference Data  📖    ← clicking 📖 opens /admin/kc/reference-data
  Countries
  Industry Segments
  ...
```

### Content Style (consistent across all pages)
- Plain language, no acronyms without explanation
- Real-life examples (e.g., "If your organization operates in India, you'd see 'IN' with phone code '+91'")
- Step-by-step instructions for common tasks
- "When to use" and "How it works" sections
- Tier-filtered: supervisor-only content hidden from basic admins

## Zero Breakage Guarantee
- No existing routes change
- No existing components modified (except adding KC links to sidebar group labels)
- No permission logic changes
- No database changes
- All new pages are independent — if one fails, nothing else is affected
- Existing Verification KC stays at its current URL

## Execution Order
1. Create the 7 new KC page files with full content
2. Add routes in App.tsx
3. Add help icon links in AdminSidebar.tsx group labels
4. Expand Operations KC with missing articles
5. Update AdminHeader breadcrumbs

