

# Fix 7 Gaps — All 10 Admin Items Fully Wired

## Status After Review

- **GAP 4 (Sidebar)**: Already fixed — `Legal Thresholds` is in AdminSidebar line 120 and route exists in App.tsx line 780. No action needed.
- **GAP 5 & 6 (complete_phase backend)**: Require SQL migration to update the `complete_phase` function.
- **GAP 1, 2, 3, 7**: Frontend wiring changes.

---

## Changes

### 1. Wire EscrowCalculationDisplay into Creator Form (GAP 1)

**File:** `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`

After the `</Tabs>` closing tag (line 180) and before the button bar (line 181), add the EscrowCalculationDisplay for MP model when governance is not QUICK:

```tsx
import { EscrowCalculationDisplay } from '@/components/cogniblend/EscrowCalculationDisplay';

// After </Tabs>, before button bar:
{engagementModel === 'MP' && governanceMode !== 'QUICK' && (
  <EscrowCalculationDisplay
    prizePlatinum={form.watch('platinum_award')}
    currencyCode={form.watch('currency_code')}
    governanceMode={governanceMode}
  />
)}
```

### 2. Wire LegalDocUploadSection into AdditionalContextTab (GAP 2)

**File:** `src/components/cogniblend/creator/AdditionalContextTab.tsx`

Add new props `engagementModel` and `draftChallengeId` to the interface. At the bottom of the component (before the closing `</div>`), render LegalDocUploadSection for MP model when a draft exists:

```tsx
import { LegalDocUploadSection } from '@/components/cogniblend/LegalDocUploadSection';

// New props added to interface:
engagementModel?: string;
draftChallengeId?: string;

// At bottom of render, before closing </div>:
{engagementModel === 'MP' && draftChallengeId && (
  <LegalDocUploadSection
    challengeId={draftChallengeId}
    governanceMode={governanceMode}
  />
)}
```

**File:** `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`

Pass the new props to AdditionalContextTab:

```tsx
<AdditionalContextTab
  governanceMode={governanceMode}
  fieldRules={fieldRules}
  attachedFiles={attachedFiles}
  onFilesChange={setAttachedFiles}
  referenceUrls={referenceUrls}
  onUrlsChange={setReferenceUrls}
  engagementModel={engagementModel}
  draftChallengeId={draftSave.draftChallengeId ?? undefined}
/>
```

### 3. Wire GovernanceOverridesSection into GovernanceProfileTab (GAP 3)

**File:** `src/components/org-settings/GovernanceProfileTab.tsx`

Import and render at the bottom of CardContent, before the supervisor notice:

```tsx
import { GovernanceOverridesSection } from './GovernanceOverridesSection';

// Before the supervisor notice div:
<GovernanceOverridesSection organizationId={organizationId} />
```

### 4. Fix Curator Checklist Labels (GAP 7)

**File:** `src/pages/cogniblend/CurationChecklistPanel.tsx`

Change line 157: `"Maturity level + legal match"` to `"Maturity level confirmed"`

Change line 157: The escrow item — use governance-aware label:
- STRUCTURED: `"Fee calculation verified"`
- CONTROLLED: `"Escrow funding confirmed"`

```tsx
const CHECKLIST_LABELS: string[] = [
  "Problem Statement present", "Scope defined", "Deliverables listed",
  "Evaluation criteria weights = 100%", "Reward structure valid", "Phase schedule defined",
  "Submission guidelines provided", "Eligibility configured", "IP model confirmed",
  "Complexity parameters entered", "Maturity level confirmed", "Artifact types configured",
  isControlledMode(governanceMode) ? "Escrow funding confirmed" : "Fee calculation verified",
];
```

### 5. Update complete_phase — AGG Org Templates + Legal Threshold Logic (GAP 5 & 6)

**Migration:** New SQL migration to update `complete_phase` function.

Add logic after the compliance gate_flags block (around line 56-65) to:

1. **AGG org templates**: When entering a compliance phase with `manual_review` legal mode, check `operating_model`. If AGG, insert from `org_legal_document_templates`; if MP, insert from platform `legal_document_templates`.

2. **Legal threshold check**: For STRUCTURED mode with `manual_review`, compare prize pool against the effective threshold (org override first, then `md_legal_review_thresholds`, then $50K fallback). If below threshold, auto-set `lc_compliance_complete = TRUE`.

```sql
-- After gate_flags compliance block, before advancing to next phase:
IF v_next_config.gate_flags IS NOT NULL AND 'lc_compliance_complete' = ANY(v_next_config.gate_flags) THEN
  IF v_legal_doc_mode = 'manual_review' THEN
    -- Get operating model and org_id
    SELECT operating_model, organization_id, 
      COALESCE((reward_structure->>'platinum_award')::numeric, 0)
    INTO v_operating_model, v_org_id, v_prize_pool
    FROM challenges WHERE id = p_challenge_id;

    -- Insert legal docs from appropriate source
    IF v_operating_model = 'AGG' THEN
      INSERT INTO challenge_legal_docs (challenge_id, document_type, document_name, tier, status, lc_status, created_by)
      SELECT p_challenge_id, document_code, document_name, 'TIER_1', 'pending_review', 'pending', p_user_id
      FROM org_legal_document_templates
      WHERE organization_id = v_org_id AND is_active = true AND version_status = 'ACTIVE'
      ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO challenge_legal_docs (challenge_id, document_type, document_name, tier, status, lc_status, created_by)
      SELECT p_challenge_id, document_code, document_name, tier, 'pending_review', 'pending', p_user_id
      FROM legal_document_templates WHERE is_active = true AND version_status = 'ACTIVE'
      ON CONFLICT DO NOTHING;
    END IF;

    -- Threshold check for STRUCTURED
    IF v_gov_mode = 'STRUCTURED' THEN
      SELECT COALESCE(ogo.legal_review_threshold_override, mlrt.threshold_amount, 50000)
      INTO v_threshold
      FROM challenges c
      LEFT JOIN org_governance_overrides ogo ON ogo.organization_id = c.organization_id
        AND ogo.governance_mode = v_gov_mode AND ogo.is_active = true
      LEFT JOIN seeker_organizations so ON so.id = c.organization_id
      LEFT JOIN md_legal_review_thresholds mlrt ON mlrt.country_id = so.hq_country_id::text
        AND mlrt.governance_mode = v_gov_mode AND mlrt.is_active = true
      WHERE c.id = p_challenge_id;

      IF v_prize_pool <= COALESCE(v_threshold, 50000) THEN
        UPDATE challenges SET lc_compliance_complete = TRUE WHERE id = p_challenge_id;
      END IF;
    END IF;
  END IF;
END IF;
```

New variables declared: `v_operating_model TEXT; v_org_id UUID; v_prize_pool NUMERIC; v_threshold NUMERIC;`

---

## File Summary

| Action | File | Gap |
|--------|------|-----|
| Edit | `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` | 1, 2 |
| Edit | `src/components/cogniblend/creator/AdditionalContextTab.tsx` | 2 |
| Edit | `src/components/org-settings/GovernanceProfileTab.tsx` | 3 |
| Edit | `src/pages/cogniblend/CurationChecklistPanel.tsx` | 7 |
| Migration | `complete_phase` function update | 5, 6 |

All components remain under 200 lines. GAP 4 already resolved.

