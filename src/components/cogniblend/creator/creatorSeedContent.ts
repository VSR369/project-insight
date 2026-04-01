/**
 * creatorSeedContent — Realistic, curator-quality test data for the Challenge Creator form.
 * These represent original human-authored content (not AI-polished).
 * Two scenarios: Manufacturing/IoT (MP) and Healthcare/Automation (AGG).
 *
 * All fields match curator format alignment:
 *   - expected_outcomes, root_causes, current_deficiencies, preferred_approach,
 *     approaches_not_of_interest → string[] (line items)
 *   - affected_stakeholders → structured array
 *   - maturity_level → code from md_solution_maturity
 */

import type { CreatorFormValues } from './ChallengeCreatorForm';

type SeedContent = Omit<CreatorFormValues, 'domain_tags'> & { domain_tags?: string[] };

/**
 * MP scenario: Manufacturing plant wanting IoT predictive maintenance.
 * Budget-driven, specific systems, real stakeholder language.
 */
export const MP_SEED: SeedContent = {
  title: 'Predictive Maintenance for CNC Machining Line — Plant 7',
  problem_statement:
    'We run 48 CNC machines across 3 shifts at our Plant 7 facility in Pune. Unplanned downtime costs us roughly ₹18 lakh per hour in lost production. Right now maintenance is calendar-based — we replace spindle bearings every 2,000 hours regardless of condition, which means we either replace too early (wasting parts) or too late (causing crashes). We tried vibration sensors from a local vendor last year but the data sat in spreadsheets and nobody acted on it. We need a system that actually predicts failures 48-72 hours ahead so the night-shift supervisor can schedule repairs during planned changeovers. The solution must work with our existing Fanuc and Siemens controllers — we cannot replace the PLCs.',
  scope:
    'Phase 1 covers Plant 7 CNC line only (48 machines, Fanuc 0i-MF and Siemens 840D controllers). Must integrate with our SAP PM module for work order generation. Exclude foundry and heat treatment sections. Cloud hosting acceptable but data must stay within India (AWS Mumbai or Azure Central India). Pilot on 8 machines for 12 weeks, then scale to full line.',
  maturity_level: 'PILOT',
  currency: 'INR',
  budget_min: 2500000,
  budget_max: 7500000,
  ip_model: 'IP-NEL',
  expected_outcomes: [
    'Reduce unplanned downtime by 40% within 6 months of full deployment',
    'Achieve 72-hour advance warning for spindle and servo failures with at least 85% precision',
    'Cut spare parts inventory carrying cost by 20% through condition-based replacement',
    'Dashboard accessible to shift supervisors on shop-floor tablets',
  ],

  // Tab 2 — Additional Context
  context_background:
    'We are an auto-component Tier 1 supplier (annual revenue ~₹800 Cr). Plant 7 is our precision machining facility producing transmission housings for two major OEMs. We invested ₹12 Cr in new Fanuc machines in 2022. Our quality team flagged that 30% of rejection spikes correlate with machine health degradation that maintenance missed. The plant manager has executive sponsorship for this initiative — it is part of our FY26 operational excellence targets.',
  preferred_approach: [
    'Edge computing at machine level with central analytics server on-prem, syncing to cloud for long-term trends',
    'Python-based stack — IT team has basic ML experience (DataCamp-trained)',
    'Transfer learning — train on historical failure data then fine-tune per machine',
    'Open-source stack preferred (TensorFlow/PyTorch) to avoid vendor lock-in',
  ],
  approaches_not_of_interest: [
    'Fully cloud-dependent solution — shop floor has unreliable internet (goes down 2-3 times/week)',
    'Rules-based threshold system (tried Siemens MindSphere — too many false alarms, operators ignored alerts within a month)',
    'Replacing our existing PLCs or controllers',
  ],
  affected_stakeholders: [
    {
      stakeholder_name: 'Plant Manager',
      role: 'Budget owner & executive sponsor',
      impact_description: 'Directly accountable for OEE targets and downtime KPIs',
      adoption_challenge: 'Needs ROI proof within 2 quarters to justify continued investment',
    },
    {
      stakeholder_name: 'Maintenance Head + 3 Supervisors + 12 Technicians',
      role: 'Primary users across 3 shifts',
      impact_description: 'Will act on predictive alerts to schedule repairs during changeovers',
      adoption_challenge: 'Skeptical of technology after failed vibration sensor project — needs quick wins',
    },
    {
      stakeholder_name: 'Quality Head',
      role: 'Correlation analysis consumer',
      impact_description: 'Needs machine health data correlated with rejection rates',
      adoption_challenge: 'Uses separate SAP QM system — integration required',
    },
    {
      stakeholder_name: 'IT Manager + 1 Engineer',
      role: 'Deployment and infrastructure support',
      impact_description: 'Responsible for edge-to-cloud data pipeline and security',
      adoption_challenge: 'Small team with limited bandwidth — solution must be low-maintenance',
    },
    {
      stakeholder_name: '48 Machine Operators',
      role: 'End users of shop-floor dashboard',
      impact_description: 'Need simple red/amber/green status per machine',
      adoption_challenge: 'Low digital literacy — interface must be extremely simple',
    },
  ],
  current_deficiencies: [
    'Calendar-based maintenance wastes 35% of spindle bearing life',
    'No real-time visibility — maintenance head gets a WhatsApp message when something breaks',
    'SAP PM has historical work orders but nobody analyses the patterns',
    'Vibration sensors installed but collecting dust — no analytical layer exists',
    'No correlation between quality rejects and machine health — tracked in separate systems (SAP QM and paper logbooks)',
  ],
  root_causes: [
    'Sensors exist but do not feed into any decision system — missing data infrastructure',
    'Maintenance team is skilled at repair but has zero predictive analytics capability',
    'Management approved sensors but did not budget for the software/analytics layer',
    'IT team was not involved in sensor vendor selection — integration was never planned',
  ],
  expected_timeline: '16w',
  industry_segment_id: '',
};

/**
 * AGG scenario: Healthcare network wanting to automate patient intake.
 * No budget fields needed (AGG uses consulting fee model).
 */
export const AGG_SEED: SeedContent = {
  title: 'Automate Patient Intake and Insurance Pre-Auth — Multi-Hospital Network',
  problem_statement:
    'Our network of 6 hospitals and 14 clinics processes about 2,200 new patient registrations daily. The intake process takes 22 minutes on average — patients fill paper forms, front-desk staff re-enter data into our HIS (Hospital Information System), then a separate team manually checks insurance eligibility by logging into 8 different payer portals. We lose about 4% of patients who leave without completing registration (walkaways). Insurance pre-auth rejections due to data entry errors cost us roughly $3.2M annually in delayed or denied reimbursements. We need an end-to-end digital intake system that patients can start on their phone before arriving, with automated insurance verification that runs in under 60 seconds.',
  scope:
    'All 6 hospitals and 14 clinics across 3 states (Texas, Arizona, New Mexico). Must integrate with Epic EHR (we are on Epic 2024 — February release). Insurance verification must cover top 12 payers representing 89% of our patient volume. Must be HIPAA-compliant with BAA. Exclude dental and vision clinics (separate systems). Pilot at 2 hospitals for 8 weeks before network-wide rollout.',
  maturity_level: 'POC',
  currency: 'USD',
  budget_min: 0,
  budget_max: 0,
  ip_model: 'IP-JO',
  expected_outcomes: [
    'Reduce average intake time from 22 minutes to under 8 minutes',
    'Eliminate walkaway rate (target <1%)',
    'Achieve real-time insurance eligibility verification for 90%+ of encounters within 60 seconds',
    'Reduce pre-auth denial rate from 12% to under 3%',
    'Free up 40 FTE-equivalent front-desk staff hours daily across the network for patient engagement',
  ],

  // Tab 2 — Additional Context
  context_background:
    'We are a regional health system (NovaCare Health) with $1.8B annual revenue. We completed an Epic implementation 18 months ago — the system is stable but our registration workflows were lifted-and-shifted from the old Meditech system without redesign. Our CIO committed to a "digital front door" strategy in the board meeting last quarter. Two competitor systems in our market already offer online check-in and we are losing commercially insured patients to them. Our patient satisfaction scores for "registration experience" are in the 34th percentile nationally.',
  preferred_approach: [
    'Patient-facing mobile web app (no native app — patients will not download for a one-time visit)',
    'Integration with Epic via FHIR R4 APIs and Epic MyChart for existing patients',
    'Clearinghouse API (Availity or Change Healthcare) for insurance verification — not individual payer scraping',
    'OCR for insurance card capture on patient phone',
    'Must support English and Spanish (38% of patient population is Spanish-speaking)',
    'Epic integration team of 3 certified analysts available for HL7/FHIR work',
  ],
  approaches_not_of_interest: [
    'Kiosk-based solution — tried lobby kiosks in 2021, utilization <15% (confusing + hygiene concerns post-COVID)',
    'Replacing Epic or running a parallel registration system — everything must write back to Epic as system of record',
    'Blockchain-based identity verification — compliance team already rejected this approach',
  ],
  affected_stakeholders: [
    {
      stakeholder_name: 'CIO',
      role: 'Executive sponsor',
      impact_description: 'Driving "digital front door" strategy, board-level accountability',
      adoption_challenge: 'Needs visible patient satisfaction improvement within 6 months',
    },
    {
      stakeholder_name: 'VP of Revenue Cycle',
      role: 'Insurance verification process owner',
      impact_description: 'Owns $3.2M annual loss from pre-auth denials',
      adoption_challenge: 'Risk-averse — needs pilot proof before committing to full rollout',
    },
    {
      stakeholder_name: 'Director of Patient Access',
      role: 'Manages 120 registration staff across all sites',
      impact_description: 'Operational lead for intake workflow redesign',
      adoption_challenge: 'Staff turnover at 45% annually — training must be self-service',
    },
    {
      stakeholder_name: 'Epic Team Lead + 3 Analysts',
      role: 'EHR integration support',
      impact_description: 'Responsible for FHIR API configuration and data mapping',
      adoption_challenge: 'Already at capacity with clinical system requests',
    },
    {
      stakeholder_name: 'Patient Advisory Council (8 representatives)',
      role: 'Beta testers and UX feedback',
      impact_description: 'Represent diverse patient demographics including Spanish-speaking community',
      adoption_challenge: 'Varying digital literacy levels across age groups',
    },
  ],
  current_deficiencies: [
    'Paper forms create 6-8% data entry error rate',
    'Insurance verification is a manual 4-step process taking 7 minutes per patient',
    'No real-time eligibility check — staff discover coverage issues after the patient has already been seen',
    'Epic MyChart adoption is only 31% — cannot rely on it as sole intake channel',
    'Spanish-language support depends on bilingual staff availability, which varies by shift',
  ],
  root_causes: [
    'Registration workflow was never redesigned during Epic implementation — replicated paper processes digitally',
    'Insurance verification kept manual because revenue cycle vendor contract expired and was not renewed',
    'No mobile strategy exists — IT focused on clinical systems and neglected patient-facing tools',
    'Spanish forms translated once in 2019 and never updated to match current intake requirements',
    'Front-desk staff turnover at 45% annually — training investment does not stick',
  ],
  expected_timeline: '16w',
  industry_segment_id: '',
};
