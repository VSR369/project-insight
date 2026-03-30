

# Insert Content Templates for 3 Generation-Critical Sections

## Current State

- `success_metrics_kpis` — already has content templates (blueprint/poc/pilot)
- `root_causes` — empty `content_templates` (`{}`)
- `current_deficiencies` — empty `content_templates` (`{}`)
- `affected_stakeholders` — empty `content_templates` (`{}`)

## What to Do

Create a single database migration that UPDATEs `content_templates` (JSONB) for these 3 sections in `ai_review_section_config` where `role_context = 'curation'`.

### Data to Insert

**`root_causes`:**
```json
{
  "blueprint": "Generate 4-6 root causes using 5-Whys methodology. Each: (a) phrase label not full sentence, (b) structural/systemic not symptomatic, (c) evidence-grounded where possible. Categorize each as: Process, Technology, Organizational, or Data. For blueprint-level, focus on strategic and organizational root causes.",
  "poc": "Generate 4-6 root causes using 5-Whys methodology. Each: (a) phrase label not full sentence, (b) structural/systemic not symptomatic, (c) evidence-grounded where possible. Categorize each as: Process, Technology, Organizational, or Data. For POC-level, emphasize technical and data-related root causes that the proof of concept must address.",
  "pilot": "Generate 4-6 root causes using 5-Whys methodology. Each: (a) phrase label not full sentence, (b) structural/systemic not symptomatic, (c) evidence-grounded where possible. Categorize each as: Process, Technology, Organizational, or Data. For pilot-level, include operational and change-management root causes relevant to scaled deployment."
}
```

**`current_deficiencies`:**
```json
{
  "blueprint": "Generate 5-8 factual observations. Format: '[System/Process] lacks/fails/cannot [capability], resulting in [impact].' Each must be factual not aspirational, name specific tools or processes where known, and be distinct from root causes. For blueprint-level, focus on strategic capability gaps and decision-making deficiencies.",
  "poc": "Generate 5-8 factual observations. Format: '[System/Process] lacks/fails/cannot [capability], resulting in [impact].' Each must be factual not aspirational, name specific tools or processes where known, and be distinct from root causes. For POC-level, emphasize technical limitations, data gaps, and integration deficiencies the prototype must overcome.",
  "pilot": "Generate 5-8 factual observations. Format: '[System/Process] lacks/fails/cannot [capability], resulting in [impact].' Each must be factual not aspirational, name specific tools or processes where known, and be distinct from root causes. For pilot-level, include operational, scalability, and adoption deficiencies relevant to production deployment."
}
```

**`affected_stakeholders`:**
```json
{
  "blueprint": "Generate 4-6 stakeholder entries. Each: Name/Role (with approximate count), Impact (quantified where possible), Adoption Challenge (specific barrier). Include at least one Primary, one Secondary, and one Tertiary stakeholder. For blueprint-level, focus on strategic decision-makers and sponsors.",
  "poc": "Generate 4-6 stakeholder entries. Each: Name/Role (with approximate count), Impact (quantified where possible), Adoption Challenge (specific barrier). Include at least one Primary, one Secondary, and one Tertiary stakeholder. For POC-level, emphasize technical teams, data owners, and integration partners who must participate in the proof of concept.",
  "pilot": "Generate 4-6 stakeholder entries. Each: Name/Role (with approximate count), Impact (quantified where possible), Adoption Challenge (specific barrier). Include at least one Primary, one Secondary, and one Tertiary stakeholder. For pilot-level, include end-users, change management leads, and operational teams affected by scaled deployment."
}
```

## Technical Details

- Single migration file with 3 UPDATE statements
- Target: `ai_review_section_config` WHERE `role_context = 'curation'` AND `section_key = X`
- Also increment `version` column: `version = COALESCE(version, 0) + 1`
- Set `updated_at = NOW()`
- JSONB format matches existing pattern (key-per-maturity object)

