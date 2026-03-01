

## Compliance Audit: Seeker Org Approvals Module

### Gaps Found & Fixes

**1. RejectOrgDialog & RejectDocumentDialog — Missing Zod + React Hook Form (Section 8.1)**
Both dialogs use raw `useState` for form state instead of mandatory React Hook Form + Zod validation. Rejection reason has no max length constraint.

**Fix:** Convert both dialogs to use `useForm` with Zod schema (`reason: z.string().min(1).max(500).trim()`).

---

**2. Duplicate `Field` component across 3 files (Section 25 Anti-Patterns)**
`Field` helper is defined identically in `OrgDetailCard.tsx`, `ComplianceDetailCard.tsx`, and `SubscriptionDetailCard.tsx` — violates DRY and component reuse standards.

**Fix:** Extract to a shared `ReviewField.tsx` component in the module directory and import everywhere.

---

**3. `useSeekerOrgApprovals.ts` — `SELECT *` usage (Section 25 Anti-Patterns)**
The `useSeekerOrgDetail` hook uses `SELECT *` on `seeker_organizations` instead of specifying columns.

**Fix:** Replace `*` with explicit column list.

---

**4. Missing `tenantId` in ErrorContext (Section 11.1)**
All `handleMutationError` calls use only `{ operation }` without `component` context, making debugging harder.

**Fix:** Add `component: 'seeker-org-approvals'` to all error contexts in the hooks file.

---

**5. `AdminCredentialsCard` — Client-side password generation (Section 18)**
Temporary passwords are generated client-side with `Math.random()`, which is cryptographically insecure and violates security hardening standards. The TODO comment acknowledges this.

**Fix:** Replace `Math.random()` with `crypto.getRandomValues()` for stronger temp passwords. Add a comment that server-side generation is the long-term target.

---

**6. Missing `as const` on status color maps (Section 22.3)**
`statusColors` maps in `DocumentReviewCard.tsx` and `SeekerOrgApprovalsPage.tsx` lack `as const` for type safety.

**Fix:** Add `as const satisfies Record<string, string>` to status color maps.

---

**7. `DocumentReviewCard` — Excessive `useState` calls for preview state (Section 6.2)**
Six separate `useState` calls manage preview state. Should be consolidated into a single `useReducer` or a grouped state object per state management standards.

**Fix:** Consolidate preview-related state into a single `useState` with an object shape `{ doc, blobUrl, pdfData, fileData, loading }`.

---

**8. Missing JSDoc on public functions (Section 20.2)**
None of the exported components or hook functions have JSDoc documentation.

**Fix:** Add JSDoc to all exported components and hook functions.

---

### Implementation Plan (5 files)

| # | File | Change |
|---|------|--------|
| 1 | `ReviewField.tsx` (new) | Shared `Field` component with JSDoc |
| 2 | `OrgDetailCard.tsx` | Import shared `ReviewField`, remove local `Field`, add JSDoc |
| 3 | `ComplianceDetailCard.tsx` | Same as above |
| 4 | `SubscriptionDetailCard.tsx` | Same as above |
| 5 | `RejectOrgDialog.tsx` | Convert to RHF + Zod |
| 6 | `RejectDocumentDialog.tsx` | Convert to RHF + Zod |
| 7 | `DocumentReviewCard.tsx` | Consolidate preview state, add `as const` |
| 8 | `AdminCredentialsCard.tsx` | Use `crypto.getRandomValues()` for temp password |
| 9 | `useSeekerOrgApprovals.ts` | Replace `SELECT *`, add `component` to error contexts |
| 10 | `SeekerOrgApprovalsPage.tsx` | Add `as const` to status map |

### What Is NOT Changing
- Database schema, RLS policies, migrations — all correct
- Navigation and routing — intact
- API response shapes — already standard
- Existing UX flow (gates, tooltips, workflow instructions) — preserved
- Hook ordering — already compliant

