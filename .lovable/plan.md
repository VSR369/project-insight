

## Plan: Fix IP, Governance, Maturity & Milestone Display in LC Workspace

### Issues Found

1. **IP Model** (line 469): Shows raw DB code `IP-NEL` — should show "Non-Exclusive License — Solver retains rights, seeker gets license"
2. **Governance** (line 470): Shows raw DB value `ENTERPRISE` — should resolve via `resolveGovernanceMode()` to `STRUCTURED` and use the `GOVERNANCE_MODE_CONFIG` label/badge
3. **Maturity** (line 471): Shows "Not specified" for null — should use `getMaturityLabel()` from `maturityLabels.ts` for non-null values and show a clear fallback
4. **Milestone percentages** (line 523): Reads `m.percentage ?? m.percent` but DB stores the field as `pct` — all milestones display as `0%`

### Milestone Data Origin

The payment milestones are configured in **Step 3 (Rewards & IP)** of the Challenge Wizard (`StepRewards.tsx`). They are stored inside `reward_structure.payment_milestones` as `[{name, pct, trigger}]`. This data was present in previous screens — specifically the wizard's review/submit step shows "3 milestones" — but the detailed table was only in the rewards step itself.

### Changes — Single File: `src/pages/cogniblend/LcLegalWorkspacePage.tsx`

**1. Add imports** (top of file):
- `import { resolveGovernanceMode, GOVERNANCE_MODE_CONFIG } from '@/lib/governanceMode';`
- `import { getMaturityLabel } from '@/lib/maturityLabels';`

**2. Add IP model label map** (near helpers section):
```ts
const IP_MODEL_LABELS: Record<string, string> = {
  'IP-EA': 'Exclusive Assignment — Full IP transfer to seeker',
  'IP-NEL': 'Non-Exclusive License — Solver retains rights, seeker gets license',
  'IP-EL': 'Exclusive License — Seeker gets exclusive usage rights',
  'IP-JO': 'Joint Ownership — Shared IP between solver and seeker',
  'IP-NONE': 'No Transfer — Solver retains all IP rights',
};
```

**3. Fix IP & Governance section** (lines 468-474):
- IP badge: Show `IP_MODEL_LABELS[challenge.ip_model]` instead of raw code
- Governance badge: Use `resolveGovernanceMode(challenge.governance_profile)` → show resolved mode label with the correct color from `GOVERNANCE_MODE_CONFIG`
- Maturity: Use `getMaturityLabel(challenge.maturity_level)` for proper display

**4. Fix milestone percentage** (line 523):
- Change `m.percentage ?? m.percent ?? 0` to `m.pct ?? m.percentage ?? m.percent ?? 0`

### Technical Details
- Reuses existing centralized utilities (`resolveGovernanceMode`, `getMaturityLabel`) already used by other pages
- IP label map matches the one in `AISpecReviewPage.tsx`
- The `pct` field name matches the schema in `challengeFormSchema.ts` and the actual DB response data

