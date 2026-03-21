

## Plan: Make LC Workspace Path-Aware — Show Only AI-Path Data

### Problem
The LC Legal Workspace shows reward structure, payment milestones, and other Manual Editor wizard-specific data regardless of which creation path was used. In the AI-Assisted path, the Creator only provides a 6-field intake (Problem, Outcomes, Maturity, Prize, Deadline, Files) and the AI generates spec fields (title, scope, description, deliverables, evaluation criteria, solver eligibility, hook, IP model). Reward tiers, payment milestones, and detailed reward configuration are **wizard-only** (Step 3: Rewards & IP) and should not appear on the AI path.

### What AI Path Actually Produces
- Title, Problem Statement, Scope, Description, Hook
- Deliverables, Evaluation Criteria
- Solver Eligibility & Visibility types
- IP Model
- Maturity level (from intake), Governance (from org)

### What Manual Editor Wizard Adds (NOT in AI path)
- Reward tiers with amounts
- Payment milestones (name, trigger, pct)
- Payment mode configuration
- Detailed reward structure (currency, num_rewarded, total_pool)

### Changes — Single File: `src/pages/cogniblend/LcLegalWorkspacePage.tsx`

**1. Detect creation path**
Read `sessionStorage.getItem('cogni_demo_path')` to determine if this is the AI path or manual path. Store as `isAiPath` boolean.

**2. Conditionally hide reward structure section**
Wrap the entire reward structure block (lines 499-555) in a path check:
- AI path: hide the reward structure/milestones/tiers section entirely
- Manual path: show as currently rendered

**3. Keep IP, Governance, Maturity badges visible on both paths**
These are relevant regardless of path — IP model comes from AI, governance from org, maturity from intake. Only the reward subsection is path-specific.

**4. Cancel previous plan**
Do NOT add reward_structure/milestones to `AISpecReviewPage.tsx` — that page correctly shows only AI-generated SPEC_SECTIONS content.

### Technical Details
- Single variable: `const isAiPath = sessionStorage.getItem('cogni_demo_path') === 'ai';`
- Conditional render: `{!isAiPath && (() => { const reward = parseRewardStructure(...); ... })()}`
- No database or API changes needed
- The `parseRewardStructure` helper and its code remain for use in the manual path

