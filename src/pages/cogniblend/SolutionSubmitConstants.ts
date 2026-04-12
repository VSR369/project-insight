/**
 * SolutionSubmitPage constants — legal docs, schema, config.
 */

import { z } from 'zod';

export const MAX_TOTAL_FILE_SIZE = 50 * 1024 * 1024;

export const FILE_UPLOAD_CONFIG = {
  maxSizeBytes: 10 * 1024 * 1024,
  maxSizeMB: 10,
  allowedTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
  ] as const,
  allowedExtensions: ['.pdf', '.doc', '.docx', '.jpg', '.png', '.webp'] as const,
  label: '10MB per file',
};

export const TIMELINE_OPTIONS = [
  { value: '1-2_weeks', label: '1–2 Weeks' },
  { value: '2-4_weeks', label: '2–4 Weeks' },
  { value: '1-2_months', label: '1–2 Months' },
  { value: '2-3_months', label: '2–3 Months' },
  { value: '3-6_months', label: '3–6 Months' },
  { value: '6+_months', label: '6+ Months' },
];

export const abstractFormSchema = z.object({
  abstractText: z.string().min(200, 'Approach Summary must be at least 200 characters'),
  methodology: z.string().min(100, 'Proposed Methodology must be at least 100 characters'),
  timeline: z.string().min(1, 'Please select an estimated timeline'),
  experience: z.string().min(1, 'Relevant Experience is required'),
  aiUsageDeclaration: z.string().min(4, 'AI Usage Declaration is required (min 4 characters)'),
});

export type AbstractFormValues = z.infer<typeof abstractFormSchema>;

export const TIER_2_DOCUMENTS = [
  {
    type: 'SOLUTION_EVALUATION_CONSENT',
    name: 'Solution Evaluation Consent',
    content: `SOLUTION EVALUATION CONSENT AGREEMENT

By submitting a solution abstract to this challenge, you consent to the following evaluation process:

1. EVALUATION SCOPE
Your submitted abstract and supporting materials will be reviewed by qualified evaluators selected by the platform. Evaluation criteria include originality, feasibility, methodology, and alignment with the challenge requirements.

2. CONFIDENTIALITY OF EVALUATION
Evaluator identities remain anonymous to Solution Providers. Evaluation scores and commentary are confidential until officially released by the challenge owner.

3. MULTI-ROUND REVIEW
Solutions may undergo multiple rounds of evaluation including automated screening, peer review, and expert panel assessment. You consent to your submission being evaluated across all applicable rounds.

4. FEEDBACK AND SCORING
Aggregate scores and optional written feedback may be shared with you after evaluation is complete. Individual evaluator scores are not disclosed.

5. NO GUARANTEE OF SELECTION
Submission and evaluation do not guarantee selection, award, or compensation. The challenge owner retains sole discretion in final selection decisions.

6. DATA RETENTION
Your submission data will be retained for the duration of the challenge lifecycle plus 12 months for audit purposes.`,
  },
  {
    type: 'AI_USAGE_POLICY',
    name: 'AI Usage Policy',
    content: `AI USAGE POLICY FOR SOLUTION SUBMISSIONS

This policy governs the use of artificial intelligence tools in preparing and submitting solutions.

1. DISCLOSURE REQUIREMENT
All Solution Providers MUST declare any AI tools used in the preparation of their solution. This includes but is not limited to: large language models (ChatGPT, Claude, Gemini), code generation tools (GitHub Copilot), image generators, and research assistants.

2. PERMITTED USES
AI tools may be used for: research assistance, grammar and writing refinement, code scaffolding (where applicable), data analysis support, and visualization generation.

3. PROHIBITED USES
The following AI uses are prohibited: submitting AI-generated content as entirely original work without disclosure, using AI to circumvent plagiarism detection, automated mass-submission of solutions, and using AI to reverse-engineer or plagiarize other submissions.

4. VERIFICATION
The platform reserves the right to verify AI usage declarations through technical analysis. Undisclosed AI usage may result in disqualification.

5. PENALTIES FOR NON-COMPLIANCE
First offense: Warning and mandatory revised declaration.
Second offense: Solution disqualification from the current challenge.
Third offense: Account suspension and platform review.`,
  },
  {
    type: 'DISPUTE_AGREEMENT',
    name: 'Dispute Resolution Agreement',
    content: `DISPUTE RESOLUTION AGREEMENT

This agreement establishes the framework for resolving disputes arising from challenge participation.

1. SCOPE
This agreement covers disputes related to: evaluation fairness, intellectual property claims, payment processing, eligibility decisions, and challenge rule interpretation.

2. INFORMAL RESOLUTION (FIRST STEP)
Parties shall first attempt to resolve disputes through the platform's messaging system within 14 days of the dispute arising.

3. MEDIATION (SECOND STEP)
If informal resolution fails, either party may request platform-mediated resolution. A neutral platform mediator will be assigned within 5 business days.

4. BINDING ARBITRATION (FINAL STEP)
Unresolved disputes after mediation proceed to binding arbitration. The arbitrator's decision is final and enforceable.

5. TIMELINE
All disputes must be raised within 30 days of the triggering event. Failure to raise a dispute within this period constitutes waiver of the claim.

6. COSTS
Each party bears their own costs. Platform mediation is provided at no charge. Arbitration fees are split equally unless the arbitrator determines otherwise.`,
  },
  {
    type: 'WITHDRAWAL_TERMS',
    name: 'Withdrawal Terms',
    content: `SOLUTION WITHDRAWAL TERMS

These terms govern the process and implications of withdrawing a submitted solution.

1. WITHDRAWAL WINDOW
Solution Providers may withdraw their submission without penalty during the Screening phase (Phase 7). Once the submission advances to Evaluation (Phase 8), withdrawal restrictions apply.

2. POST-EVALUATION WITHDRAWAL
Withdrawing after evaluation begins may result in: forfeiture of any evaluation feedback, notation on the Solution Provider's platform record, and temporary cooldown period before submitting to new challenges.

3. IP IMPLICATIONS
Upon withdrawal: all IP rights revert to the Solution Provider, the platform retains no license to the withdrawn submission, and all copies in the evaluation system are purged within 30 days.

4. PARTIAL WITHDRAWAL
In team submissions, individual members may withdraw their contribution. The remaining team must confirm they can proceed without the withdrawn contribution.

5. RE-SUBMISSION
A withdrawn solution may be re-submitted if the challenge deadline has not passed and the submission limit has not been reached.

6. NOTIFICATION
Withdrawal notifications are sent to the challenge owner and any assigned evaluators. The Solution Provider's identity in connection with the withdrawal remains confidential.`,
  },
];
