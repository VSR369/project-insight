

## Fix: Correct Phase Order in DemoWorkflowSteps and DemoLoginPage

The current code has Compliance and Curation swapped (showing LC before CU), contradicting the database phase order (Phase 2 = Curation, Phase 3 = Compliance).

---

### File 1: `src/components/cogniblend/demo/DemoWorkflowSteps.tsx`

**Replace `buildSteps` to return governance-specific step sets:**

- Remove the `ai/manual` variant distinction (the `aiNote`/`manualNote` split is no longer needed — use a single `description` field per step)
- QUICK: 3 steps (Create → Auto-Complete → Solver Submit)
- STRUCTURED: 5 steps (Create → Curation → Compliance → Publication → Solver Submit)
- CONTROLLED: 5 steps (Create → Curation → Compliance LC+FC → Publication → Solver Submit)
- Each step has `label`, `role`, `description` matching the exact DB phase descriptions provided
- Update the `Step` interface to use a single `description` instead of `aiNote`/`manualNote`
- Update the render to display `step.description` instead of the ai/manual conditional

### File 2: `src/pages/cogniblend/DemoLoginPage.tsx`

**Replace `buildDemoUsers` with governance-mode-conditional logic:**

- QUICK: Returns 1 user (Sam Solo, all 5 roles merged)
- STRUCTURED: Returns 4 users in order: CR → CU → LC → ER (no FC, no ER2, no Solo)
- CONTROLLED: Returns 6 users in order: CR → CU → LC → FC → ER1 → ER2 (no Solo)

**Update role description constants** (`CR_DESC`, `CU_DESC`, `LC_DESC`, `ER_DESC`) with the exact DB-aligned descriptions provided.

**Add a governance-mode-aware section heading** above the role cards:
- QUICK: "1 person — all roles merged (no role conflicts)"
- STRUCTURED: "4 roles — sequential handoff (CR≠CU, CR≠ER enforced)"
- CONTROLLED: "6 roles — full separation of duties (LC+FC parallel at Phase 3, dual blind ER at Phase 6)"

**Update the static export** to use STRUCTURED as default: `export const DEMO_USERS = buildDemoUsers('MP', 'STRUCTURED')`.

---

### No other files changed.

