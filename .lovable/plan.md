

# Update Demo Login Page — Governance-Aware Role Descriptions

## Problem

The `buildDemoUsers()` function in `DemoLoginPage.tsx` has **static descriptions** that don't reflect:
1. **Governance mode differences** — Creator behavior varies significantly across QUICK/STRUCTURED/CONTROLLED
2. **AI Review integration** — The Creator form now has an AI Review drawer (required for CONTROLLED, recommended for STRUCTURED)
3. **Configuration panel** — The creation flow now includes Industry + Governance + Engagement configuration

The descriptions are hardcoded regardless of the selected governance mode, giving users an outdated impression of the workflow.

## Fix

**File:** `src/pages/cogniblend/DemoLoginPage.tsx`

Modify `buildDemoUsers()` to accept `governanceMode` and produce governance-aware descriptions for each role card:

### Creator (CR) descriptions by mode:
- **QUICK:** "Creates challenge with 5 required fields, auto-published on submit"
- **STRUCTURED:** "Configures industry & governance, fills 8 fields, AI Review recommended, submits to Curator"
- **CONTROLLED:** "Configures full challenge settings, fills 12 fields, AI Review required before submit to Curator"

### Legal Compliance (LC) descriptions by mode:
- **QUICK:** "Auto-applied legal defaults — no manual review needed"
- **STRUCTURED:** "Reviews legal docs, optional escrow setup"
- **CONTROLLED:** "Full legal review with mandatory escrow gate"

### Curator (CU) descriptions by mode:
- **QUICK:** "Auto-completed quality check with simplified checklist"
- **STRUCTURED:** "AI-assisted quality review with 14-point checklist"
- **CONTROLLED:** "Formal compliance gate with full dual-curation checklist"

### Other roles (ER, FC, Solo) — minor description updates to mention governance context.

### Additional change:
- Pass `governanceMode` into `buildDemoUsers(engagementModel, governanceMode)` at line 199
- Update the static export `DEMO_USERS` to also accept a default mode (or keep as-is for backward compat)

**No new files. Single file modified. ~30 lines changed inside `buildDemoUsers()`.**

