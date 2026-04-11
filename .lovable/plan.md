

## Fix: QUICK Mode Demo Card — Remove Individual Role Badge Display

### Problem

In QUICK governance mode, all 5 roles (CR, CU, ER, LC, FC) are system-automated artifacts — the single user never manually performs curation, evaluation, legal, or escrow. Displaying 5 separate role badges is misleading and contradicts the "merged roles / no role conflicts" heading. The user's screenshot confirms the current display shows all 5 badges individually.

### Design Decision

For QUICK mode, Sam Solo's card should show a single consolidated badge like "All Roles (Auto)" instead of 5 individual role badges. This aligns with:
- Memory: QUICK mode = "merged roles, auto-curation, auto-completes legal"
- Memory: `nonQuickRoleCodes` concept — system-assigned roles from QUICK mode are workflow artifacts, not actionable roles
- The heading already says "1 person — all roles merged (no role conflicts)"

### Changes

**File 1: `src/pages/cogniblend/DemoLoginPage.tsx`**
- Change QUICK mode Sam Solo's `roles` array from `['CR', 'CU', 'ER', 'LC', 'FC']` to just `['CR']` — Creator is the only role the user actually performs
- Update description to emphasize the single-actor automated flow

**File 2: `src/components/cogniblend/demo/DemoUserCard.tsx`**
- Add a `governanceMode` prop (optional)
- When `governanceMode === 'QUICK'` and user has `stepLabel === 'All Steps'`, render a single "Creator (Auto-Publish)" badge instead of iterating individual role badges
- Below it, show a muted note: "CU, ER, LC, FC auto-completed by platform"

**File 3: `src/pages/cogniblend/DemoLoginPage.tsx` (render section)**
- Pass `governanceMode` to each `DemoUserCard`

### Result

QUICK mode card will show:
- Name: "Sam Solo" with "All Steps" badge
- Single badge: "CR — Challenge Creator"
- Muted text: "CU, LC, FC, ER auto-completed by platform"
- Description unchanged

STRUCTURED and CONTROLLED modes remain unaffected — they display individual role badges as before since those represent real human-actor assignments.

