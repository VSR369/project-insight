

# Repurpose Org Contact Profile as SOA's Own Profile

## Problem
The current `/org/contact-profile` page edits the **Platform Admin's** contact details (`rbac_admin_contact` table) — which makes no sense for an SOA. The SOA's own data lives in `seeking_org_admins` (full_name, email, phone, title).

## Plan

### 1. Rewrite `src/pages/org/OrgContactProfilePage.tsx`
- Replace `useAdminContact` / `useUpsertAdminContact` with a new hook that reads/updates the current SOA's own record from `seeking_org_admins`
- Form fields: **Full Name**, **Email** (read-only — tied to auth), **Phone**, **Designation / Job Title**
- Use `useCurrentSeekerAdmin` pattern but select more fields (phone, title) and allow updates
- Header: "My Contact Profile" with subtitle "Your contact details visible to team members and in role assignments"

### 2. Create `src/hooks/queries/useSoaProfile.ts`
- `useSoaProfile(organizationId)` — queries `seeking_org_admins` for the current user's record, selecting `id, full_name, email, phone, title, admin_tier, updated_at`
- `useUpdateSoaProfile()` — mutation to update `full_name`, `phone`, `title` on the SOA's own record (email stays read-only since it's auth-linked)

### 3. Update sidebar label
- In `OrgSidebar.tsx` line 83: rename "Contact Profile" to "My Profile"

### 4. Validation schema
- Add a new `soaProfileSchema` to `src/lib/validations/roleAssignment.ts` with fields: `full_name` (required), `phone` (optional, E.164), `title` (optional, max 150)

### Files to modify
| File | Action |
|------|--------|
| `src/pages/org/OrgContactProfilePage.tsx` | Rewrite — use SOA's own data |
| `src/hooks/queries/useSoaProfile.ts` | Create — read/update SOA record |
| `src/lib/validations/roleAssignment.ts` | Add `soaProfileSchema` |
| `src/components/org/OrgSidebar.tsx` | Rename sidebar link |

