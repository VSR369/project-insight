
# Batch E Implementation Plan

6 large files targeted for decomposition toward ≤200 lines. Safety rules: move code only, no logic rewrites, no interface changes, hook order preserved.

| # | File | Lines | Extraction Plan |
|---|------|:-----:|-----------------|
| 1 | `Register.tsx` | 992 | Extract `RegisterFormFields.tsx` (form field groups), `RegisterTermsSection.tsx` (terms/agreement UI), and `registerSchema.ts` (Zod schema + types) |
| 2 | `PlanSelectionForm.tsx` | 915 | Extract `PlanCard.tsx` (individual plan display), `planSelectionConstants.ts` (plan data/config) |
| 3 | `StepProblem.tsx` | 878 | Extract `ProblemStatementFields.tsx` (core fields), `ProblemScopeFields.tsx` (scope/geography/domain) |
| 4 | `BillingForm.tsx` | 864 | Extract `BillingAddressFields.tsx` (address inputs), `BillingPaymentFields.tsx` (payment method UI), `billingSchema.ts` (Zod schema) |
| 5 | `SolutionSubmitPage.tsx` | 856 | Extract `SolutionSubmitForm.tsx` (form content), `SolutionFileUpload.tsx` (file handling), `solutionSubmitSchema.ts` |
| 6 | `Dashboard.tsx` | 787 | Extract `DashboardStatsCards.tsx` (stat cards), `DashboardRecentActivity.tsx` (activity feed) |
