-- Update remaining 8 sections with Claude's detailed prompt engineering content
-- Legal: ip_clause_completeness, compliance_terms
-- Finance: escrow_configuration, reward_structure_viability, payment_terms
-- Evaluation: scoring_rubric, evaluation_methodology, conflict_of_interest

-- 29. legal / ip_clause_completeness
UPDATE public.ai_review_section_config SET
  review_instructions = 'IP clauses must cover every deliverable type and every edge case that could arise from this specific challenge. Check: (1) IP assignment covers all deliverable types listed — code, documentation, data models, algorithms, trade secrets, (2) the treatment of derivative works is addressed — if a solver builds on open source, who owns the modifications, (3) the moral rights waiver is present where applicable (UK, EU challenges), (4) warranty of originality is required from solvers, (5) the clause is consistent between the challenge description, the NDA, and the participation agreement — no contradictions across documents. Flag any deliverable type not covered by the IP clause.',
  dos = 'List each deliverable type and confirm it is covered by the IP clause. Note cross-document consistency explicitly.',
  donts = 'Do not redraft clauses. Do not approve clauses with contradictions across documents.',
  required_elements = ARRAY['all deliverable types covered explicitly', 'derivative works treatment stated', 'moral rights addressed for applicable jurisdictions', 'solver warranty of originality required', 'consistency across NDA, participation agreement, and challenge description'],
  example_good = 'IP clause covers: software code, technical documentation, exception rulesets, algorithms, and data models. Derivative works: solver retains pre-existing IP, all modifications and integrations assign to seeker. Moral rights waiver: included for UK/EU submissions. Warranty of originality: required at submission. Consistent with NDA and participation agreement reviewed 12 Jan 2026.',
  example_poor = 'IP assignment covers the winning solution. Details to be confirmed with the winner based on what they submit.',
  updated_at = now()
WHERE role_context = 'legal' AND section_key = 'ip_clause_completeness';

-- 30. legal / compliance_terms
UPDATE public.ai_review_section_config SET
  review_instructions = 'Compliance terms ensure the challenge and its outcomes meet applicable legal and regulatory requirements. Check: (1) applicable data protection requirements are addressed — if the challenge involves personal data, GDPR or equivalent compliance is stated, (2) export control restrictions are addressed for any technology that may be subject to export regulation, (3) the governing law and dispute resolution mechanism are stated, (4) platform terms of service compliance is confirmed, (5) any sector-specific regulation relevant to the challenge domain is acknowledged (financial services, healthcare, defence). Flag the absence of data protection terms for any challenge involving personal data.',
  dos = 'Identify the challenge domain and cross-reference against relevant sector regulation. Note when compliance terms are comprehensive.',
  donts = 'Do not assess whether the challenge is legally compliant — flag structural gaps only. Do not require compliance terms for areas clearly not applicable to the challenge.',
  required_elements = ARRAY['data protection compliance stated if personal data involved', 'export control addressed for regulated technology', 'governing law and dispute resolution stated', 'platform terms of service compliance confirmed', 'sector-specific regulation acknowledged where applicable'],
  example_good = 'Governing law: England and Wales. Dispute resolution: ICC arbitration, London. Data protection: no personal data shared — GDPR not applicable. Export control: solution involves no controlled technology. Platform ToS: confirmed compliant 12 Jan 2026.',
  example_poor = 'All legal requirements will be followed. Participants must comply with applicable laws.',
  updated_at = now()
WHERE role_context = 'legal' AND section_key = 'compliance_terms';

-- 31. finance / escrow_configuration
UPDATE public.ai_review_section_config SET
  review_instructions = 'Escrow must be configured correctly before the challenge can be published. Check: (1) escrow status is funded — not pending or draft, (2) total deposit amount equals the total prize pool including all tiers (first, second, third prizes), (3) currency of escrow matches currency of stated reward, (4) rejection fee percentage is set and within platform policy limits, (5) the bank name and account reference are recorded in the FC notes for audit trail. If escrow is not funded, this is a hard block on publication — do not approve.',
  dos = 'Compute total prize pool from the reward structure and compare explicitly to the deposit amount. State the comparison in your review comment.',
  donts = 'Do not approve if escrow is not funded. Do not override escrow configuration.',
  required_elements = ARRAY['escrow status funded', 'deposit amount equals total prize pool across all tiers', 'currency match between escrow and reward', 'rejection fee within policy limits', 'bank and account reference in FC notes'],
  example_good = 'Escrow status: funded 14 Jan 2026. Deposit: $100,000 USD. Prize pool: $75,000 (1st) + $25,000 (2nd) = $100,000. Match: confirmed. Currency: USD — matches reward structure. Rejection fee: 5% (within 2–8% policy band). Bank: Barclays. Account ref: ESC-2026-0047.',
  example_poor = 'Escrow: will be funded before the challenge goes live. Finance team is processing.',
  updated_at = now()
WHERE role_context = 'finance' AND section_key = 'escrow_configuration';

-- 32. finance / reward_structure_viability
UPDATE public.ai_review_section_config SET
  review_instructions = 'Assess whether the reward structure is financially sound and will produce the intended participation outcome. Check: (1) total prize pool is proportionate to the expected work — compare to market rates for equivalent professional services, (2) if tiered, the prize distribution is reasonable — a first prize that is less than 50% of total pool disincentivises serious effort on the top prize, (3) milestone payments, if used, have clear trigger events, (4) the reward is consistent with the escrow deposit, (5) any contingency or partial award provisions are stated. Flag structures where the prize is unlikely to attract qualified solvers given the deliverable complexity.',
  dos = 'Compare prize to approximate market cost of equivalent professional services. Note when the structure is well-designed for participation. Cross-reference with escrow deposit.',
  donts = 'Do not suggest specific amounts. Do not approve structures where escrow does not cover the stated prize.',
  required_elements = ARRAY['total prize proportionate to deliverable complexity', 'tiered distribution first prize minimum 50% of total', 'milestone payment triggers stated if applicable', 'consistency with escrow deposit confirmed', 'partial award provisions stated'],
  example_good = 'Total prize: $100,000 USD. Market equivalent for 8-week middleware integration: $60,000–$120,000. Prize within range — viable for attracting qualified solvers. Distribution: $75,000 first (75%), $25,000 second (25%) — incentive structure appropriate. No milestones. Consistent with escrow deposit.',
  example_poor = 'Prize: $5,000 for a working integration of two enterprise ERP systems. This may not attract qualified submissions given the complexity.',
  updated_at = now()
WHERE role_context = 'finance' AND section_key = 'reward_structure_viability';

-- 33. finance / payment_terms
UPDATE public.ai_review_section_config SET
  review_instructions = 'Payment terms define when and how winners receive their prizes — ambiguity creates disputes. Check: (1) payment timeline is stated — number of days after which trigger event, (2) payment trigger is stated — IP transfer signature, acceptance test pass, or announcement date, (3) currency and payment method are stated, (4) tax treatment is addressed — is the prize subject to withholding, is a tax declaration required from solvers, (5) payment terms are consistent with IP model — payment should not precede IP transfer for full-transfer models. Flag any payment that is triggered by announcement rather than IP transfer completion.',
  dos = 'Cross-reference payment trigger against IP model. Note when terms are clear and solver-friendly.',
  donts = 'Do not suggest changing payment amounts. Do not approve terms that trigger payment before IP transfer for full-transfer models.',
  required_elements = ARRAY['payment timeline in days stated', 'payment trigger event explicitly defined', 'currency and payment method stated', 'tax treatment addressed', 'payment trigger consistent with IP transfer model'],
  example_good = 'Payment: within 30 days of IP assignment agreement signing and acceptance test confirmation. Currency: USD. Method: bank transfer. Tax: prizes may be subject to withholding tax — solvers responsible for own tax obligations. Invoicing required from company submitters.',
  example_poor = 'Payment will be made to the winner after we confirm everything is in order. Details to be arranged.',
  updated_at = now()
WHERE role_context = 'finance' AND section_key = 'payment_terms';

-- 34. evaluation / scoring_rubric
UPDATE public.ai_review_section_config SET
  review_instructions = 'The scoring rubric is what evaluators use to score submissions — it must be objective enough to produce consistent scores across multiple independent evaluators. Check: (1) each evaluation criterion has a defined scoring band — for example, 0–5 or 0–10 with descriptions for each band level, (2) the rubric covers all criteria listed in the evaluation criteria section, (3) pass thresholds are stated — what minimum score must a submission achieve to qualify for prize consideration, (4) the rubric is calibrated with examples — what does a score of 3 look like versus a score of 5, (5) inter-rater reliability guidance is present — what should evaluators do when their scores diverge by more than 2 points. Flag any criterion with no rubric.',
  dos = 'Test each rubric band for objectivity — could two independent evaluators apply the same band to the same submission and reach the same score. Note when calibration examples are particularly strong.',
  donts = 'Do not add rubric bands. Do not lower scoring standards to make qualification easier.',
  required_elements = ARRAY['scoring band defined per criterion', 'rubric covers all evaluation criteria', 'pass threshold stated', 'calibration examples per band', 'inter-rater divergence protocol stated'],
  example_good = 'Technical performance rubric (40%): Score 5 — discrepancy rate under 5/week. Score 4 — 5–10/week. Score 3 — 10–20/week. Score 2 — 20–35/week. Score 1 — above 35/week. Pass threshold: minimum aggregate score 3.5 across all criteria. Inter-rater protocol: if scores diverge by more than 1.5, third evaluator arbitrates.',
  example_poor = 'Evaluators will score each submission and the best one wins. Please be fair and consistent.',
  updated_at = now()
WHERE role_context = 'evaluation' AND section_key = 'scoring_rubric';

-- 35. evaluation / evaluation_methodology
UPDATE public.ai_review_section_config SET
  review_instructions = 'The methodology defines how the evaluation process runs — unclear methodology produces inconsistent results and disputes. Check: (1) the evaluation stages are described in sequence — initial screening, detailed evaluation, final scoring, (2) evaluator assignments are stated — who evaluates which criteria, (3) the consensus mechanism is defined — how is a final score reached when multiple evaluators score the same submission, (4) the timeline for each evaluation stage is consistent with the challenge timeline, (5) the blind evaluation policy is stated — do evaluators see solver identities during scoring. Flag any evaluation stage with no assigned evaluator role.',
  dos = 'Cross-reference evaluator roles against the evaluation criteria to confirm coverage. Note when the methodology is unusually rigorous.',
  donts = 'Do not suggest additional evaluation stages. Do not flag necessary complexity as overhead.',
  required_elements = ARRAY['evaluation stages described in sequence', 'evaluator assignments per criterion', 'consensus mechanism defined', 'evaluation timeline consistent with challenge timeline', 'blind evaluation policy stated'],
  example_good = 'Stage 1 — initial screen (IT Architect): confirm deliverables submitted, minimum word count met. Stage 2 — technical scoring (IT Architect + AP Manager): independent scoring using rubric, blind to solver identity. Stage 3 — consensus: average of two independent scores; if divergence exceeds 1.5, IT Director arbitrates. Stage 4 — final ranking and winner selection. Timeline: 3 weeks total — consistent with challenge schedule.',
  example_poor = 'The evaluation team will review all submissions and select the best one. We will be in touch with the winner.',
  updated_at = now()
WHERE role_context = 'evaluation' AND section_key = 'evaluation_methodology';

-- 36. evaluation / conflict_of_interest
UPDATE public.ai_review_section_config SET
  review_instructions = 'Conflict of interest in evaluation is a legal and reputational risk — an evaluator scoring a submission from a company they are affiliated with can invalidate the result. Check: (1) a conflict of interest declaration process is defined — evaluators must declare before reviewing submissions, (2) the definition of a conflict is stated — employment, ownership, financial interest, close personal relationship, (3) the recusal process is defined — what happens when a conflict is declared, (4) the platform has a mechanism to detect undeclared conflicts — at minimum, solver organisation names should be checked against evaluator employment records, (5) the conflict review records are retained for audit. If no conflict process is defined, flag as a critical gap.',
  dos = 'Verify the recusal process produces a resolution — not just the evaluator steps aside but who replaces them. Note when the process is unusually thorough.',
  donts = 'Do not flag the existence of declared conflicts as a problem — a working declaration process is a feature, not a failure. Do not suggest specific conflict rules.',
  required_elements = ARRAY['conflict declaration process defined', 'definition of conflict stated', 'recusal process with replacement mechanism', 'detection mechanism for undeclared conflicts', 'conflict records retained for audit trail'],
  example_good = 'Conflict declaration: all evaluators complete platform CoI form before submission names are revealed. Definition: employment, directorship, financial stake over 1%, close family relationship. Recusal: declared evaluator removed from scoring for that submission; reserve evaluator (pre-nominated) replaces them. Detection: solver org names cross-checked against evaluator LinkedIn profiles by platform admin. Records: all declarations retained in audit trail for 5 years.',
  example_poor = 'Evaluators should declare any conflicts. If there is a conflict, they should not evaluate that submission.',
  updated_at = now()
WHERE role_context = 'evaluation' AND section_key = 'conflict_of_interest';