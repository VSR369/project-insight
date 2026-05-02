/**
 * Default seed templates for legal docs created from the admin UI.
 *
 * All templates are authored in **Markdown** with a blank line between every
 * block (heading, paragraph, list). The seed loader in `useLegalDocEditor`
 * converts the Markdown to HTML via `markdownToHtml()` before injecting into
 * TipTap — never feed raw Markdown into the editor or it renders as plain text.
 */

import { CPA_DEFAULT_TEMPLATES, CPA_CODE_MAP } from './cpaDefaults.constants';

export const RA_R2_DEFAULT_TEMPLATE = `# Seeker Organization Admin — Role Agreement (RA_R2)

## 1. Parties

This Role Agreement is entered into between **{{platform_name}}** (the **"Platform"**) and the individual being granted the Seeker Organization Admin role (the **"Admin"**) on behalf of **{{organization_name}}** (the **"Organization"**).

## 2. Scope of Role

The Admin is authorised to manage the Organization's presence on the Platform, including:

- Inviting, granting and revoking workforce roles (Creator, Curator, Reviewer, Finance Coordinator, Legal Coordinator).
- Configuring challenges, governance modes and legal documents on behalf of the Organization.
- Approving budgets, escrow deposits and prize payouts within delegated limits.
- Acting as the primary point of contact between the Organization and the Platform for compliance and escalations.

## 3. Relationship to SKPA

This Agreement is **personal** to the Admin and is in addition to the Seeker Platform Agreement (SKPA) signed by the Organization. The SKPA governs the Organization's commercial relationship with the Platform; this Role Agreement governs the Admin's individual conduct, authority and obligations.

## 4. Confidentiality

The Admin shall keep confidential all non-public information accessed via the Platform, including challenge briefs, Solution Provider submissions, evaluation scores and financial records. Confidentiality obligations survive termination of the role for **3 years**.

## 5. Acceptable Use

The Admin shall not:

- Share login credentials or platform access with unauthorised persons.
- Use Platform data for purposes outside the Organization's challenge programme.
- Attempt to circumvent governance, escrow or evaluation controls.
- Engage in any activity that would breach the Platform's Acceptable Use Policy.

## 6. Data Protection

The Admin shall handle personal data in accordance with applicable data-protection law (including GDPR where relevant) and the Platform's Data Processing Agreement (DPA).

## 7. Termination

This Agreement terminates automatically when the Admin's role is revoked by the Organization or by the Platform. Confidentiality and data-protection obligations survive termination.

## 8. Governing Law

This Agreement is governed by **{{governing_law}}** with exclusive jurisdiction in **{{jurisdiction}}**.

## 9. Acceptance

By clicking **Accept**, the Admin confirms they have read, understood and agree to be bound by this Role Agreement.`;

export const PRIVACY_POLICY_DEFAULT_TEMPLATE = `# Privacy Policy

_Last updated: {{effective_date}}_

## 1. Introduction

**{{platform_name}}** (the **"Platform"**, **"we"**, **"us"**) respects your privacy. This Privacy Policy explains what personal data we collect, how we use it, the legal basis for processing, and your rights as a data subject.

## 2. Data Controller

The data controller for personal data processed via the Platform is **{{platform_name}}**. Contact: **privacy@{{platform_domain}}**.

## 3. Categories of Personal Data We Collect

- **Identity data:** name, job title, organization.
- **Contact data:** email address, phone number, business address.
- **Account data:** username, hashed password, role assignments, preferences.
- **Usage data:** logins, page views, actions performed on the Platform.
- **Submission data:** content you upload as part of challenges, applications or proposals.
- **Technical data:** IP address, browser type, device identifiers, cookies.

## 4. How We Use Personal Data (Lawful Basis)

| Purpose | Lawful basis |
| --- | --- |
| Operating the Platform and providing requested services | Contract |
| Account security, fraud prevention and audit logging | Legitimate interest |
| Sending transactional notifications | Contract |
| Sending marketing communications | Consent |
| Compliance with legal obligations | Legal obligation |

## 5. Sharing and Disclosure

We share personal data only with:

- **Other users** of the Platform, to the extent required for the challenge or workflow you participate in.
- **Sub-processors** (hosting, email, analytics, payment) under written data-processing agreements.
- **Authorities** where required by law or court order.

We do **not** sell personal data.

## 6. International Transfers

Where personal data is transferred outside the EEA / UK, we rely on Standard Contractual Clauses or other lawful transfer mechanisms.

## 7. Retention

- Account data is retained for the lifetime of your account plus **24 months**.
- Audit logs and legal-acceptance ledger entries are retained for **7 years**.
- Marketing data is retained until you withdraw consent.

## 8. Your Rights

You have the right to:

- Access the personal data we hold about you.
- Request correction of inaccurate data.
- Request erasure (right to be forgotten), subject to legal retention obligations.
- Object to or restrict processing.
- Data portability.
- Withdraw consent at any time.
- Lodge a complaint with your local supervisory authority.

To exercise these rights contact **privacy@{{platform_domain}}**.

## 9. Cookies

The Platform uses essential cookies for authentication and session management, and optional cookies for analytics. See our Cookie Notice for details and to manage preferences.

## 10. Security

We implement appropriate technical and organisational measures, including encryption in transit, access controls, audit logging and regular security reviews.

## 11. Changes to this Policy

We may update this Policy from time to time. Material changes will be notified in-Platform and by email where appropriate.

## 12. Governing Law

This Policy is governed by **{{governing_law}}** with exclusive jurisdiction in **{{jurisdiction}}**.`;

export const DPA_DEFAULT_TEMPLATE = `# Data Processing Agreement (DPA)

_Last updated: {{effective_date}}_

## 1. Parties

This Data Processing Agreement (the **"DPA"**) is entered into between the customer organization (the **"Controller"**) and **{{platform_name}}** (the **"Processor"**) and forms part of the agreement under which the Processor provides services to the Controller (the **"Principal Agreement"**).

## 2. Definitions

Terms such as **"Personal Data"**, **"Processing"**, **"Data Subject"**, **"Sub-processor"** and **"Supervisory Authority"** have the meanings given in the General Data Protection Regulation (GDPR) and equivalent applicable data-protection law.

## 3. Subject Matter and Duration

- **Subject matter:** Processing of Personal Data by the Processor on behalf of the Controller in connection with the Platform services.
- **Duration:** For the term of the Principal Agreement, plus the retention periods set out below.

## 4. Nature and Purpose of Processing

The Processor will process Personal Data for the purpose of providing, operating, securing and supporting the Platform services as described in the Principal Agreement.

## 5. Categories of Data Subjects and Personal Data

- **Data Subjects:** Controller's users, employees, contractors, challenge participants and contacts.
- **Personal Data:** Identity, contact, account, usage, submission and technical data as described in the Privacy Policy.

## 6. Obligations of the Processor

The Processor shall:

- Process Personal Data only on documented instructions from the Controller.
- Ensure persons authorised to process Personal Data are bound by confidentiality.
- Implement appropriate technical and organisational security measures (Annex A).
- Assist the Controller in responding to Data Subject requests.
- Notify the Controller of a Personal Data Breach without undue delay (and in any event within **72 hours** of becoming aware).
- Make available all information necessary to demonstrate compliance and contribute to audits.

## 7. Sub-processors

- The Controller authorises the Processor to engage Sub-processors listed in Annex B.
- The Processor will give the Controller prior notice of any intended changes and the Controller may object on reasonable grounds.
- The Processor remains liable for the acts and omissions of its Sub-processors.

## 8. International Transfers

Where Personal Data is transferred outside the EEA / UK, the Processor relies on Standard Contractual Clauses or other lawful transfer mechanisms.

## 9. Security Measures (Annex A)

- Encryption of Personal Data in transit (TLS 1.2+) and at rest.
- Role-based access control with least-privilege principle.
- Audit logging of administrative and security-relevant events.
- Regular vulnerability scanning and penetration testing.
- Documented incident-response and business-continuity procedures.
- Background checks for personnel with access to Personal Data.

## 10. Data Subject Rights

The Processor shall, to the extent legally permitted, promptly notify the Controller of any request received from a Data Subject and shall not respond except on the documented instructions of the Controller or as required by law.

## 11. Audits

The Controller may, on reasonable notice and no more than once per year (save where required by a Supervisory Authority), audit the Processor's compliance with this DPA, subject to confidentiality obligations.

## 12. Return or Deletion of Personal Data

On termination of the Principal Agreement, the Processor shall, at the Controller's choice, return or delete all Personal Data, save to the extent retention is required by law.

## 13. Liability

Each Party's liability under this DPA is subject to the limitations set out in the Principal Agreement.

## 14. Governing Law

This DPA is governed by **{{governing_law}}** with exclusive jurisdiction in **{{jurisdiction}}**.

## Annex B — Authorised Sub-processors

- Cloud hosting provider (compute, storage, database).
- Transactional email provider.
- Analytics provider.
- Payment processor.

The current list is maintained in the Trust Centre on the Platform.`;

/**
 * Resolve the seed content to pre-fill the editor for a given document code
 * on the "new" path. Returns null when no default is defined.
 */
export function getDefaultTemplateContent(code: string | null | undefined): string | null {
  if (!code) return null;
  if (code === 'RA_R2') return RA_R2_DEFAULT_TEMPLATE;
  if (code === 'PRIVACY_POLICY') return PRIVACY_POLICY_DEFAULT_TEMPLATE;
  if (code === 'DPA') return DPA_DEFAULT_TEMPLATE;
  if (code === CPA_CODE_MAP.QUICK) return CPA_DEFAULT_TEMPLATES.QUICK;
  if (code === CPA_CODE_MAP.STRUCTURED) return CPA_DEFAULT_TEMPLATES.STRUCTURED;
  if (code === CPA_CODE_MAP.CONTROLLED) return CPA_DEFAULT_TEMPLATES.CONTROLLED;
  return null;
}
