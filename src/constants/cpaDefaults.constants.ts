/**
 * CPA default template content for each governance mode.
 *
 * Templates are authored in **Markdown** with blank lines between every
 * block (heading, paragraph, list). The seed loader converts to HTML before
 * the editor receives them — see `useLegalDocEditor` + `markdownToHtml`.
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

import { ALL_TEMPLATE_VARIABLES } from '@/lib/cogniblend/legal/templateVariables';

export const CPA_TEMPLATE_VARIABLES = ALL_TEMPLATE_VARIABLES.map((v) => ({
  variable: `{{${v.name}}}`,
  description: v.description,
})) as ReadonlyArray<{ variable: string; description: string }>;

export const CPA_DEFAULT_TEMPLATES: Record<CpaGovernanceMode, string> = {
  QUICK: `# Challenge Participation Agreement — Quick Mode

## 1. Parties

This Agreement is entered into between the Challenge Seeker organization (the **"Seeker"**) and the participating Solution Provider (the **"Solution Provider"**) on the platform operated by **{{platform_name}}** (the **"Platform"**).

## 2. Challenge Details

- **Challenge Title:** {{challenge_title}}
- **Governance Mode:** Quick
- **Total Prize:** {{total_fee}} {{currency}}
- **Submission Deadline:** {{submission_deadline}}

## 3. Scope of Work

{{scope}}

## 4. Intellectual Property

{{ip_model}}

The IP terms above govern any deliverable produced under this challenge.

## 5. Confidentiality

Both parties agree to keep all non-public challenge materials, submissions and evaluation data confidential, both during the challenge and for **2 years** after its conclusion.

## 6. Payment

Prize funds are held in escrow by the Platform and released to the winning Solution Provider upon confirmation by the Seeker.

## 7. Governing Law

This Agreement is governed by **{{governing_law}}** with exclusive jurisdiction in **{{jurisdiction}}**.

## 8. Acceptance

By clicking **Accept**, the Solution Provider confirms they have read, understood and agree to be bound by the terms of this Agreement.`,

  STRUCTURED: `# Challenge Participation Agreement — Structured Mode

## 1. Parties

This Challenge Participation Agreement (the **"Agreement"**) is entered into between the Challenge Seeker organization (the **"Seeker"**) and the participating Solution Provider (the **"Solution Provider"**), each a **"Party"** and collectively the **"Parties"**, on the platform operated by **{{platform_name}}** (the **"Platform"**).

## 2. Challenge Details

- **Challenge Title:** {{challenge_title}}
- **Governance Mode:** {{governance_mode}}
- **Prize Pool:** {{total_fee}} {{currency}}
- **Submission Deadline:** {{submission_deadline}}

## 3. Problem Statement

{{problem_statement}}

## 4. Scope of Work

{{scope}}

The Solution Provider shall deliver work products that meet the requirements set out above and any acceptance criteria published by the Seeker.

## 5. Intellectual Property

{{ip_model}}

All intellectual property created during the challenge shall be governed by the model specified above. Pre-existing IP of either Party remains the property of that Party.

## 6. Escrow and Payment

- The total prize pool is deposited in escrow by the Seeker prior to publication.
- Escrow funds are released to the winning Solution Provider on Seeker's written confirmation of acceptance.
- Platform fees, if any, are deducted by the Platform in accordance with the published rate card.

## 7. Confidentiality

The Parties shall maintain in strict confidence all non-public materials shared during the challenge, including the brief, submissions, evaluation scores and reviewer identities. Confidentiality obligations survive termination for **3 years**.

## 8. Evaluation

Submissions shall be evaluated using the criteria published in the challenge brief. Decisions of the Seeker, supported by the Platform's evaluation framework, are final.

## 9. Termination

Either Party may withdraw from the challenge prior to the submission deadline subject to the rules published on the Platform. Withdrawal does not relieve the Solution Provider of confidentiality obligations.

## 10. Governing Law and Jurisdiction

This Agreement is governed by **{{governing_law}}** with exclusive jurisdiction in **{{jurisdiction}}**.

## 11. Acceptance

By clicking **Accept**, the Solution Provider confirms they have read, understood and agree to be bound by this Agreement.`,

  CONTROLLED: `# Challenge Participation Agreement — Controlled Mode

## 1. Definitions and Parties

This Challenge Participation Agreement (the **"Agreement"**) is entered into by and between the Challenge Seeker organization (the **"Seeker"**) and the participating Solution Provider (the **"Solution Provider"**), each a **"Party"** and collectively the **"Parties"**, on the platform operated by **{{platform_name}}** (the **"Platform"**).

## 2. Challenge Specification

- **Challenge Title:** {{challenge_title}}
- **Governance Mode:** {{governance_mode}}
- **Total Prize Pool:** {{total_fee}} {{currency}}
- **Submission Deadline:** {{submission_deadline}}

## 3. Problem Statement

{{problem_statement}}

## 4. Scope and Deliverables

{{scope}}

The Solution Provider shall deliver work products that meet the requirements above and any documented acceptance criteria.

## 5. Intellectual Property Assignment

{{ip_model}}

### 5.1 Pre-existing IP

The Solution Provider retains all pre-existing intellectual property used in the course of the challenge.

### 5.2 Challenge-Created IP

Intellectual property created specifically for this challenge transfers in accordance with the model above upon Seeker's acceptance and full payment.

### 5.3 Moral Rights

To the extent permitted by law, the Solution Provider waives any moral rights in challenge-created IP in favour of the Seeker.

## 6. Anti-Disintermediation

For a period of **24 months** following the close of the challenge, neither Party shall engage in direct commercial relationships with the other (or with their respective affiliates introduced via the Platform) bypassing the Platform, except with the Platform's prior written consent.

## 7. Escrow and Payment Terms

- The total prize pool is deposited in escrow prior to publication.
- Escrow funds are released to the winning Solution Provider only on Seeker's written confirmation of acceptance, subject to the dispute-resolution clause below.
- Platform fees are deducted in accordance with the published rate card.

## 8. Confidentiality and Data Protection

- All challenge materials are confidential.
- Personal data is processed in accordance with applicable data-protection law (including GDPR where relevant) and the Platform's Data Processing Agreement (DPA).
- Confidentiality obligations survive termination for **5 years**.

## 9. Warranties and Indemnities

Each Party warrants that it has the authority to enter into this Agreement. The Solution Provider warrants that the deliverables will not infringe any third-party rights and shall indemnify the Seeker against any claim to the contrary.

## 10. Dispute Resolution

Any dispute arising out of or in connection with this Agreement shall be resolved through binding arbitration administered by the institution and seat specified by **{{governing_law}}**.

## 11. Jurisdiction and Governing Law

- **Jurisdiction:** {{jurisdiction}}
- **Governing Law:** {{governing_law}}

## 12. Termination

Either Party may terminate participation by giving **30 days** written notice via the Platform. Termination does not affect rights or obligations accrued prior to termination, nor surviving clauses (Confidentiality, IP, Anti-Disintermediation).

## 13. General Provisions

This Agreement, together with the documents referenced herein, constitutes the entire agreement between the Parties in respect of its subject matter and supersedes all prior negotiations and understandings.

## 14. Acceptance

By clicking **Accept**, the Solution Provider confirms they have read, understood and agree to be bound by this Agreement.`,
};
