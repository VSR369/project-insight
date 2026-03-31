/**
 * creatorSeedContent — Realistic, curator-quality test data for the Challenge Creator form.
 * These represent original human-authored content (not AI-polished).
 * Two scenarios: Manufacturing/IoT (MP) and Healthcare/Automation (AGG).
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
  maturity_level: 'pilot',
  currency: 'INR',
  budget_min: 2500000,
  budget_max: 7500000,
  ip_model: 'IP-NEL',
  expected_outcomes:
    'Reduce unplanned downtime by 40% within 6 months of full deployment. Achieve 72-hour advance warning for spindle and servo failures with at least 85% precision. Cut spare parts inventory carrying cost by 20% through condition-based replacement. Dashboard accessible to shift supervisors on shop-floor tablets.',

  // Tab 2 — Additional Context
  context_background:
    'We are an auto-component Tier 1 supplier (annual revenue ~₹800 Cr). Plant 7 is our precision machining facility producing transmission housings for two major OEMs. We invested ₹12 Cr in new Fanuc machines in 2022. Our quality team flagged that 30% of rejection spikes correlate with machine health degradation that maintenance missed. The plant manager has executive sponsorship for this initiative — it is part of our FY26 operational excellence targets.',
  preferred_approach:
    'We prefer edge computing at machine level with a central analytics server on-prem, syncing to cloud for long-term trend analysis. Our IT team is comfortable with Python and has basic ML experience (they completed a DataCamp course). We like the idea of transfer learning — train on our historical failure data then fine-tune per machine. Open-source stack preferred (TensorFlow/PyTorch) so we are not locked into a vendor platform.',
  approaches_not_of_interest:
    'We do not want a fully cloud-dependent solution — our shop floor has unreliable internet (goes down 2-3 times a week). We tried a rules-based threshold system from Siemens MindSphere and it generated too many false alarms — the operators started ignoring alerts within a month. Do not propose replacing our PLCs or controllers.',
  affected_stakeholders:
    'Plant Manager (budget owner), Maintenance Head (3 supervisors, 12 technicians across shifts), Quality Head (needs correlation with rejection data), IT Manager (1 engineer for deployment support), 2 OEM customers who audit our process capability quarterly, Shop floor operators (48 machine operators who need simple red/amber/green status).',
  current_deficiencies:
    'Calendar-based maintenance wastes 35% of spindle bearing life. No real-time visibility — maintenance head gets a WhatsApp message when something breaks. SAP PM has historical work orders but nobody analyses the patterns. The vibration sensors we installed are collecting dust because there is no analytical layer. No correlation between quality rejects and machine health — these are tracked in separate systems (SAP QM and paper logbooks).',
  root_causes:
    'Lack of data infrastructure — sensors exist but do not feed into any decision system. Maintenance team is skilled at repair but has zero predictive analytics capability. Management approved sensors but did not budget for the software/analytics layer. IT team was not involved in the sensor vendor selection so integration was never planned.',
  expected_timeline: '16w',
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
  maturity_level: 'poc',
  currency: 'USD',
  budget_min: 0,
  budget_max: 0,
  ip_model: 'IP-JO',
  expected_outcomes:
    'Reduce average intake time from 22 minutes to under 8 minutes. Eliminate walkaway rate (target <1%). Achieve real-time insurance eligibility verification for 90%+ of encounters within 60 seconds. Reduce pre-auth denial rate from 12% to under 3%. Free up 40 FTE-equivalent front-desk staff hours daily across the network for patient engagement instead of data entry.',

  // Tab 2 — Additional Context
  context_background:
    'We are a regional health system (NovaCare Health) with $1.8B annual revenue. We completed an Epic implementation 18 months ago — the system is stable but our registration workflows were lifted-and-shifted from the old Meditech system without redesign. Our CIO committed to a "digital front door" strategy in the board meeting last quarter. Two competitor systems in our market already offer online check-in and we are losing commercially insured patients to them. Our patient satisfaction scores for "registration experience" are in the 34th percentile nationally.',
  preferred_approach:
    'We want a patient-facing mobile web app (no native app — patients will not download an app for a one-time visit). Integration with Epic via FHIR R4 APIs and Epic MyChart for existing patients. For insurance verification, prefer a clearinghouse API (Availity or Change Healthcare) rather than individual payer portal scraping. OCR for insurance card capture on the patient phone. Must support English and Spanish (38% of our patient population is Spanish-speaking). We have an Epic integration team of 3 certified analysts who can support HL7/FHIR work.',
  approaches_not_of_interest:
    'We do not want a kiosk-based solution — we tried lobby kiosks in 2021 and utilization was under 15% (patients found them confusing and there were hygiene concerns post-COVID). Do not propose replacing Epic or running a parallel registration system — everything must write back to Epic as the system of record. We are not interested in blockchain-based identity verification — our compliance team already rejected this approach.',
  affected_stakeholders:
    'CIO (executive sponsor), VP of Revenue Cycle (owns insurance verification), Director of Patient Access (manages 120 registration staff across all sites), Epic team lead (3 analysts), Compliance Officer (HIPAA/security review), Patient Advisory Council (8 patient representatives who will beta-test), 12 major insurance payers for technical integration, Front-desk supervisors at each site (20 people).',
  current_deficiencies:
    'Paper forms create 6-8% data entry error rate. Insurance verification is a manual 4-step process taking 7 minutes per patient. No real-time eligibility check — staff discover coverage issues after the patient has already been seen, leading to surprise bills and patient complaints. Epic patient portal (MyChart) adoption is only 31% so we cannot rely on it as the sole intake channel. Spanish-language support is currently handled by bilingual staff availability, which varies by shift.',
  root_causes:
    'Registration workflow was never redesigned during Epic implementation — we replicated paper processes digitally. Insurance verification was kept manual because our revenue cycle vendor contract expired and was not renewed. No mobile strategy exists — IT has focused on clinical systems and neglected patient-facing tools. Spanish forms were translated once in 2019 and never updated to match current intake requirements. Front-desk staff turnover is 45% annually so training investment does not stick.',
  expected_timeline: '16w',
};
