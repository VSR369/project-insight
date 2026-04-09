/**
 * CPA default template content for each governance mode.
 */

export const CPA_GOVERNANCE_MODES = ['QUICK', 'STRUCTURED', 'CONTROLLED'] as const;
export type CpaGovernanceMode = typeof CPA_GOVERNANCE_MODES[number];

export const CPA_CODE_MAP: Record<CpaGovernanceMode, string> = {
  QUICK: 'CPA_QUICK',
  STRUCTURED: 'CPA_STRUCTURED',
  CONTROLLED: 'CPA_CONTROLLED',
};

export const CPA_MODE_COLORS: Record<CpaGovernanceMode, string> = {
  QUICK: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300',
  STRUCTURED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300',
  CONTROLLED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-300',
};

export const CPA_MODE_DESCRIPTIONS: Record<CpaGovernanceMode, string> = {
  QUICK: 'Lightweight agreement for fast-track challenges with minimal legal overhead.',
  STRUCTURED: 'Standard agreement with IP clauses, escrow terms, and evaluation criteria.',
  CONTROLLED: 'Full legal agreement with anti-disintermediation, detailed IP assignment, and jurisdiction-specific terms.',
};

export const CPA_TEMPLATE_VARIABLES = [
  { variable: '{{challenge_title}}', description: 'Title of the challenge' },
  { variable: '{{problem_statement}}', description: 'Problem statement text' },
  { variable: '{{scope}}', description: 'Challenge scope description' },
  { variable: '{{ip_model}}', description: 'IP ownership model (e.g., Full Transfer, Licensed)' },
  { variable: '{{governance_mode}}', description: 'Governance mode (QUICK/STRUCTURED/CONTROLLED)' },
  { variable: '{{total_fee}}', description: 'Total prize amount' },
  { variable: '{{currency}}', description: 'Currency code (e.g., USD, EUR)' },
  { variable: '{{submission_deadline}}', description: 'Submission deadline date' },
  { variable: '{{jurisdiction}}', description: 'Legal jurisdiction from geography context' },
  { variable: '{{governing_law}}', description: 'Governing law from geography context' },
] as const;

export const CPA_DEFAULT_TEMPLATES: Record<CpaGovernanceMode, string> = {
  QUICK: `# Challenge Participation Agreement (Quick Mode)

## 1. Parties
This agreement is between the Challenge Seeker organization and the participating Solver.

## 2. Challenge Details
- **Challenge:** {{challenge_title}}
- **Prize:** {{total_fee}} {{currency}}
- **Deadline:** {{submission_deadline}}

## 3. Scope
{{scope}}

## 4. IP Terms
{{ip_model}}

## 5. Acceptance
By participating, the Solver agrees to these terms.`,

  STRUCTURED: `# Challenge Participation Agreement (Structured Mode)

## 1. Parties
This agreement ("Agreement") is entered into between the Challenge Seeker organization ("Seeker") and the participating Solver ("Solver").

## 2. Challenge Details
- **Challenge:** {{challenge_title}}
- **Governance Mode:** {{governance_mode}}
- **Prize Pool:** {{total_fee}} {{currency}}
- **Submission Deadline:** {{submission_deadline}}

## 3. Problem Statement
{{problem_statement}}

## 4. Scope of Work
{{scope}}

## 5. Intellectual Property
{{ip_model}}

All IP created during the challenge shall be governed by the terms specified above.

## 6. Escrow & Payment
Prize funds are held in escrow and released upon winner confirmation.

## 7. Confidentiality
Both parties agree to maintain confidentiality of challenge materials.

## 8. Jurisdiction
This Agreement is governed by the laws of {{jurisdiction}} under {{governing_law}}.`,

  CONTROLLED: `# Challenge Participation Agreement (Controlled Mode)

## 1. Definitions and Parties
This Challenge Participation Agreement ("Agreement") is entered into by and between the Challenge Seeker organization ("Seeker") and the participating Solver ("Solver"), collectively the "Parties."

## 2. Challenge Specification
- **Challenge Title:** {{challenge_title}}
- **Governance Mode:** {{governance_mode}}
- **Total Prize Pool:** {{total_fee}} {{currency}}
- **Submission Deadline:** {{submission_deadline}}

## 3. Problem Statement
{{problem_statement}}

## 4. Scope and Deliverables
{{scope}}

## 5. Intellectual Property Assignment
{{ip_model}}

### 5.1 Pre-existing IP
Solver retains all pre-existing intellectual property.

### 5.2 Challenge-Created IP
IP created specifically for this challenge transfers per the model above.

## 6. Anti-Disintermediation
Neither party shall engage in direct commercial relationships bypassing the platform for a period of 24 months.

## 7. Escrow and Payment Terms
All prize funds are deposited in escrow prior to challenge publication.

## 8. Confidentiality and Data Protection
All challenge materials are confidential. GDPR and applicable data protection laws apply.

## 9. Dispute Resolution
Disputes shall be resolved through binding arbitration.

## 10. Jurisdiction and Governing Law
- **Jurisdiction:** {{jurisdiction}}
- **Governing Law:** {{governing_law}}

## 11. Termination
Either party may terminate with 30 days written notice through the platform.

## 12. General Provisions
This Agreement constitutes the entire agreement between the Parties.`,
};
