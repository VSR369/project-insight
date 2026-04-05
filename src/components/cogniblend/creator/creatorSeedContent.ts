/**
 * creatorSeedContent — 5IR business transformation challenge seed data.
 * These represent high-end strategic challenges involving Digital Workers (AI Agents),
 * ecosystem redesign, policy transformation, and cultural change.
 *
 * MP scenario: Supply Chain Digital Workforce Transformation
 * AGG scenario: Autonomous Enterprise Operations Platform
 *
 * All fields match curator format alignment:
 *   - expected_outcomes, root_causes, current_deficiencies, preferred_approach,
 *     approaches_not_of_interest → string[] (line items)
 *   - affected_stakeholders → structured array
 *   - maturity_level → normalized code (matched at runtime to md_solution_maturity)
 */

import type { CreatorFormValues } from './creatorFormSchema';

type SeedContent = Omit<CreatorFormValues, 'domain_tags' | 'hook'> & { domain_tags?: string[]; hook?: string };

/**
 * MP scenario: Supply Chain Digital Workforce Transformation
 * A manufacturing conglomerate deploying autonomous AI agents to redesign
 * supply chain workflows, roles, policies, and organizational ecosystem.
 */
export const MP_SEED: SeedContent = {
  title: 'Autonomous Digital Workforce for End-to-End Supply Chain Transformation',
  problem_statement:
    'Our multi-plant manufacturing conglomerate (12 facilities, 4 countries, ₹6,200 Cr revenue) operates a supply chain that was designed for a pre-digital era — linear, human-dependent, and reactive. We have 340+ people across procurement, logistics, demand planning, and supplier quality whose daily work consists of gathering data from 11 disconnected systems, making judgment calls based on incomplete information, and manually coordinating across time zones via email and WhatsApp. When a critical raw material shipment is delayed, it takes 48-72 hours for the information to cascade through the organization and trigger corrective action. By then, production schedules are disrupted, premium freight costs spike, and customer delivery commitments are broken. We need to fundamentally reimagine this supply chain by introducing Digital Workers — autonomous AI agents that can sense disruptions in real-time, make decisions within defined policy boundaries, coordinate across functions without human bottlenecks, and continuously learn from outcomes. This is not a technology project; it is an organizational transformation that will redefine roles, restructure decision-making authority, reshape policies, and require a cultural shift from "people doing tasks" to "people governing intelligent systems."',
  scope:
    'Phase 1: Demand sensing and procurement orchestration across 4 primary plants (Pune, Chennai, Manesar, and Pithampur). Must integrate with SAP S/4HANA (ECC migration completing Q3 FY26), Oracle Transportation Management, and 6 supplier collaboration portals. Digital Workers must operate within a governance framework approved by the Chief Supply Chain Officer — no autonomous decisions exceeding ₹50L without human escalation. Exclude finished goods distribution (separate project). The solution must define the new operating model including revised role descriptions, escalation matrices, and KPI frameworks for human-agent hybrid teams. Data residency within India mandatory.',
  maturity_level: 'PROTOTYPE',
  solution_maturity_id: '',
  currency_code: 'INR',
  platinum_award: 45000000,
  weighted_criteria: [
    { name: 'Technical Architecture & Agent Design', weight: 30 },
    { name: 'Organizational Transformation Blueprint', weight: 25 },
    { name: 'Change Management & Adoption Strategy', weight: 20 },
    { name: 'Implementation Feasibility & Timeline', weight: 15 },
    { name: 'Cost-Benefit Analysis & ROI Projection', weight: 10 },
  ],
  deliverables_list: [],
  ip_model: 'IP-JO',
  expected_outcomes: [
    'Deploy autonomous Digital Workers handling 70% of routine procurement decisions (PO generation, supplier selection for standard items, delivery rescheduling) within 9 months',
    'Reduce supply disruption response time from 48-72 hours to under 4 hours through real-time sensing and autonomous corrective action',
    'Deliver a comprehensive new operating model document covering revised org structure, role definitions, decision authority matrices, and governance policies for human-agent collaboration',
    'Achieve 25% reduction in premium freight costs through predictive disruption management and autonomous re-routing',
    'Establish a policy framework defining Digital Worker autonomy boundaries, escalation triggers, audit trails, and accountability structures approved by the board',
    'Create a cultural transformation roadmap with change management milestones, training curricula for "agent supervisors," and adoption metrics',
  ],

  // Tab 2 — Additional Context
  context_background:
    'We are a diversified industrial group (Vishwakarma Industries) producing automotive components, industrial fasteners, and precision machined parts. Our supply chain spans 1,200+ suppliers across India and Southeast Asia. The Group CEO announced a "Industry 5.0 Transformation" mandate at the annual leadership conference — the supply chain is the first domain targeted because it represents 62% of our cost structure. Two years ago we invested ₹45 Cr in an SAP S/4HANA migration (completing soon) but the CSCO openly admits that "we digitized our old processes instead of reimagining them." Our competitor Bharat Forge has already deployed AI-driven procurement bots and reduced their supplier lead time variance by 30% — our board is concerned about competitive displacement. The workforce is anxious about AI replacing jobs — the CHRO has insisted that any transformation must include a "people transition plan" that reskills rather than displaces.',
  preferred_approach: [
    'Multi-agent architecture where specialized Digital Workers handle distinct supply chain functions (demand sensing, procurement execution, logistics coordination, supplier quality monitoring) and collaborate through a shared orchestration layer',
    'Reinforcement learning for decision-making agents that improve through outcome feedback rather than purely rule-based automation',
    'Human-in-the-loop governance model where agents operate autonomously within defined policy boundaries but escalate edge cases to human "agent supervisors" — a new role to be defined',
    'Knowledge graph connecting supply chain entities (suppliers, materials, routes, contracts, quality records) to enable contextual reasoning by Digital Workers',
    'Change management framework based on Kotter\'s 8-step model adapted for AI transformation — must address fear of job loss, new skill requirements, and cultural shift from "doing" to "governing"',
  ],
  approaches_not_of_interest: [
    'Traditional RPA (robotic process automation) that simply mimics human clicks — we already have UiPath for that and it does not solve the decision-making problem',
    'Single monolithic AI system — we need modular agents that can be deployed incrementally and governed independently',
    'Solutions that require replacing SAP S/4HANA or Oracle TMS — these are non-negotiable enterprise systems',
    'Pure technology implementations without organizational design — any proposal that ignores roles, policies, and culture will be rejected',
    'Offshore-only delivery model — this transformation requires deep embedded engagement with our plant teams, union representatives, and leadership',
  ],
  affected_stakeholders: [
    {
      stakeholder_name: 'Chief Supply Chain Officer (CSCO)',
      role: 'Transformation sponsor and accountability owner',
      impact_description: 'Must redesign the entire supply chain operating model and defend the new human-agent structure to the board',
      adoption_challenge: 'Personally accountable for ₹3,800 Cr annual procurement — risk tolerance is low for autonomous agent failures',
    },
    {
      stakeholder_name: '340+ Supply Chain Professionals (Procurement, Logistics, Planning)',
      role: 'Current process executors transitioning to agent supervisors',
      impact_description: 'Their daily work will fundamentally change from executing transactions to governing AI agents and handling exceptions',
      adoption_challenge: 'Deep anxiety about job displacement — 60% have >15 years tenure and limited digital skills. Union has flagged concerns.',
    },
    {
      stakeholder_name: 'Chief Human Resources Officer (CHRO)',
      role: 'People transition and reskilling program owner',
      impact_description: 'Must design reskilling programs, new job descriptions, and manage workforce sentiment during transformation',
      adoption_challenge: 'No precedent in the organization for AI-driven role redesign — needs external frameworks and benchmarks',
    },
    {
      stakeholder_name: '1,200+ Suppliers (Tier 1 and Tier 2)',
      role: 'External ecosystem participants who will interact with Digital Workers',
      impact_description: 'Suppliers will receive automated POs, quality escalations, and delivery coordination from AI agents instead of human buyers',
      adoption_challenge: 'Many suppliers are SMEs with limited digital capability — need supplier enablement program',
    },
    {
      stakeholder_name: 'Group CIO and IT Team (45 members)',
      role: 'Technology infrastructure and integration owners',
      impact_description: 'Must provide integration layer between Digital Workers and enterprise systems (SAP, Oracle, supplier portals)',
      adoption_challenge: 'Team is consumed by SAP S/4HANA migration — bandwidth for new initiative is severely limited',
    },
    {
      stakeholder_name: 'Plant Heads (12 facilities)',
      role: 'Operational adoption leaders at each site',
      impact_description: 'Must champion the new operating model at facility level and manage local workforce transition',
      adoption_challenge: 'Each plant has different maturity levels — Pune is advanced, smaller facilities still rely on paper-based processes',
    },
  ],
  current_deficiencies: [
    'Demand sensing is a monthly spreadsheet exercise — by the time forecasts reach procurement, market conditions have changed',
    'Procurement decisions for 80% of standard items follow the same process as strategic purchases — no risk-based differentiation',
    'Supplier performance data exists in SAP but is never analysed proactively — quality issues are discovered at incoming inspection, not predicted',
    'Cross-functional coordination happens via email chains and WhatsApp groups with 200+ unread messages — critical signals get buried',
    'No decision audit trail — when a supply disruption occurs, nobody can trace who decided what, when, and based on what information',
    'Existing KPIs measure activity (POs raised, deliveries tracked) not outcomes (disruptions prevented, cost avoided, response time)',
  ],
  root_causes: [
    'Supply chain was designed around functional silos (procurement, logistics, quality) rather than end-to-end value streams — each function optimizes locally',
    'Decision-making authority is concentrated at senior levels — a ₹5L procurement decision requires the same approval as ₹5 Cr, creating bottlenecks',
    'Technology investments focused on systems of record (SAP, Oracle) but never built a decision intelligence layer on top',
    'Organizational culture rewards "firefighting heroes" who solve crises rather than "system thinkers" who prevent them — no incentive to automate away heroics',
    'No data architecture connecting supply chain signals — demand data, supplier data, logistics data, and quality data sit in separate systems with no real-time integration',
  ],
  expected_timeline: '24w',
  industry_segment_id: '',
};

/**
 * AGG scenario: Autonomous Enterprise Operations Platform
 * A financial services group deploying AI-powered digital workers across
 * compliance, risk assessment, and client advisory — transforming operations,
 * governance, and value delivery.
 */
export const AGG_SEED: SeedContent = {
  title: 'AI-Powered Digital Workforce for Autonomous Financial Services Operations',
  problem_statement:
    'Our financial services group (6 business units, $4.2B AUM, 2,800 employees across wealth management, commercial lending, insurance brokerage, and trade finance) operates with a workforce model designed in the 1990s. Every client interaction, risk assessment, compliance check, and advisory recommendation flows through layers of human processors who add latency, inconsistency, and cost without proportional value. Our compliance team of 180 people spends 70% of their time on routine surveillance and reporting that follows deterministic rules — yet we still miss 15% of flaggable transactions because humans cannot process the volume. Our client advisors spend 60% of their day on administrative tasks (data gathering, report formatting, compliance documentation) and only 40% on actual advisory conversations. Meanwhile, our competitors (Goldman Sachs, Morgan Stanley) are deploying AI agents that deliver institutional-quality research to retail clients in seconds. We need to deploy an autonomous Digital Workforce — AI agents that handle compliance surveillance, risk scoring, client portfolio analysis, and regulatory reporting — while fundamentally restructuring how our human workforce operates. This means new roles (Agent Supervisors, AI Ethics Officers, Human-AI Collaboration Designers), new policies (autonomous decision boundaries, algorithmic accountability, client consent frameworks), and a new organizational culture that treats AI agents as team members with defined responsibilities, performance metrics, and governance structures.',
  scope:
    'Phase 1 targets three functions: (1) Transaction surveillance and AML compliance across all 6 business units, (2) Client portfolio risk assessment and rebalancing recommendations for wealth management (1,200 client relationships), and (3) Regulatory report generation for SEC, FINRA, and state insurance commissioners. Must integrate with Bloomberg Terminal, Salesforce Financial Services Cloud, FIS banking core, and our proprietary risk engine (Python/PostgreSQL). All Digital Workers must operate within a compliance framework pre-approved by our Chief Compliance Officer and external counsel. Must deliver the organizational transformation blueprint including new job architectures, revised compliance policies for AI-assisted decisions, and a regulatory engagement strategy for discussing AI agent deployment with our primary regulators (SEC, FINRA, state insurance departments). Exclude retail banking operations (separate regulatory framework).',
  maturity_level: 'POC',
  solution_maturity_id: '',
  currency: 'USD',
  budget_min: 0,
  budget_max: 0,
  ip_model: 'IP-EL',
  expected_outcomes: [
    'Deploy autonomous compliance surveillance agents processing 100% of daily transactions (currently sampling 12%) with <0.1% false negative rate for flaggable events',
    'Reduce client advisory preparation time from 4.5 hours to 30 minutes per client review through AI-driven portfolio analysis, market research synthesis, and recommendation generation',
    'Deliver a comprehensive organizational transformation blueprint covering new role architectures (Agent Supervisor, AI Ethics Officer, Human-AI Collaboration Designer), revised decision authority matrices, and updated compliance policies for AI-assisted operations',
    'Automate 85% of routine regulatory report generation (currently requiring 22 FTE) while maintaining 100% accuracy and audit trail completeness',
    'Establish a regulatory engagement strategy and pre-approval framework for deploying AI agents in regulated financial services — including model risk management documentation per SR 11-7 (Federal Reserve guidance)',
    'Create measurable cultural transformation metrics tracking the shift from "humans doing compliance" to "humans governing AI compliance agents" — including adoption rates, trust scores, and intervention patterns',
  ],

  // Tab 2 — Additional Context
  context_background:
    'We are Meridian Capital Group, a mid-market financial services holding company. Our CEO presented a "5th Industrial Revolution Readiness" strategy to the board last quarter, positioning AI-driven autonomous operations as the primary competitive differentiator for the next decade. Two catalysts: (1) Our largest competitor just acquired an AI compliance startup for $340M, signaling industry direction. (2) Three senior compliance officers retired in Q4 with 90+ years of combined institutional knowledge that was never codified — we are bleeding expertise. Our CTO built a proof-of-concept transaction monitoring agent using GPT-4 and LangChain that flagged 23% more suspicious transactions than our current rule-based system in a 30-day test — but it also generated 40% more false positives, and our CCO shut it down because "we cannot explain to regulators how an LLM decided something was suspicious." We need a production-grade approach with explainability, governance, and regulatory defensibility built in from day one.',
  preferred_approach: [
    'Hybrid neuro-symbolic architecture combining LLM reasoning with deterministic compliance rules — every AI decision must produce a human-readable explanation chain that satisfies regulatory examination requirements',
    'Digital Worker taxonomy with distinct agent types: Surveillance Agents (transaction monitoring), Analytical Agents (portfolio analysis), Advisory Agents (research synthesis), and Reporting Agents (regulatory filings) — each with defined capability boundaries and governance frameworks',
    'Organizational design methodology that treats AI agent deployment as a sociotechnical system change — not a technology implementation — with equal emphasis on people, process, policy, and technology dimensions',
    'Federated deployment model where each business unit can configure agent behavior within group-wide policy guardrails — reflecting the reality that wealth management compliance differs from trade finance compliance',
    'Continuous regulatory dialogue framework — proactive engagement with SEC and FINRA to establish precedent for AI agent deployment rather than waiting for regulatory guidance',
  ],
  approaches_not_of_interest: [
    'Black-box ML models for compliance decisions — our CCO and external counsel have explicitly rejected any approach where we cannot produce a deterministic explanation for every flagged or cleared transaction',
    'Replacing Salesforce Financial Services Cloud or FIS core banking — these are multi-year, $50M+ investments that are non-negotiable infrastructure',
    'Chatbot-style client interfaces — our high-net-worth clients expect human relationship managers, not chatbots. AI should empower advisors, not replace them in client-facing interactions',
    'Generic enterprise AI platforms (e.g., Palantir, C3.ai) that require 18+ months of customization before delivering value — we need domain-specific financial services AI agents',
    'Approaches that treat organizational transformation as an afterthought — any proposal focused primarily on technology without equal depth on roles, policies, culture, and regulatory strategy will be rejected',
  ],
  affected_stakeholders: [
    {
      stakeholder_name: 'Chief Compliance Officer (CCO) and Compliance Team (180 people)',
      role: 'Primary function being transformed — from manual surveillance to AI governance',
      impact_description: 'Compliance analysts will transition from reviewing transactions to supervising AI surveillance agents and handling escalated edge cases',
      adoption_challenge: 'CCO is risk-averse and personally liable for compliance failures — needs ironclad explainability and regulatory defensibility before approving any AI agent deployment',
    },
    {
      stakeholder_name: 'Wealth Management Advisors (85 relationship managers)',
      role: 'Users of AI-generated portfolio analysis and advisory recommendations',
      impact_description: 'Will shift from 60% admin / 40% advisory to 15% oversight / 85% high-value client engagement',
      adoption_challenge: 'Senior advisors (avg 22 years experience) skeptical that AI can match their judgment — need to see AI as augmentation, not replacement',
    },
    {
      stakeholder_name: 'Chief Risk Officer (CRO)',
      role: 'Model risk management and AI governance framework owner',
      impact_description: 'Must establish model risk management (SR 11-7 compliance) for all AI agents and defend the framework during regulatory examinations',
      adoption_challenge: 'No existing framework for governing autonomous AI agents — must build from scratch while satisfying conservative board risk committee',
    },
    {
      stakeholder_name: 'External Regulators (SEC, FINRA, State Insurance Commissioners)',
      role: 'Regulatory oversight bodies who must be engaged proactively',
      impact_description: 'Will need to understand and accept AI agent deployment in regulated activities — no precedent exists for autonomous compliance agents in our regulatory jurisdiction',
      adoption_challenge: 'Regulators are cautious about AI in financial services — requires proactive engagement strategy, not reactive disclosure',
    },
    {
      stakeholder_name: 'Human Resources and Learning & Development',
      role: 'Workforce transition program owners',
      impact_description: 'Must design new career paths (Agent Supervisor, AI Ethics Officer), reskilling programs, and manage workforce anxiety about AI displacement',
      adoption_challenge: 'No internal expertise in AI-era workforce design — need external frameworks and industry benchmarks',
    },
  ],
  current_deficiencies: [
    'Transaction surveillance samples only 12% of daily volume — mathematically guaranteeing that suspicious activities in the remaining 88% go undetected until downstream consequences emerge',
    'Client advisors spend 4.5 hours preparing for each quarterly review — manually pulling data from Bloomberg, Salesforce, and proprietary systems, then formatting into PowerPoint presentations',
    'Regulatory report generation requires 22 FTE working the last 10 days of each quarter — a predictable, deterministic process that should be fully automated',
    'Compliance policies are written for human execution — no framework exists for defining what an AI agent is allowed to decide versus what requires human judgment',
    'Institutional knowledge exists only in senior employees\' heads — when three senior compliance officers retired, their pattern recognition capability left with them and was never captured',
    'No unified data layer — client data spans 7 systems with no single source of truth, causing AI proof-of-concepts to fail at the data integration stage',
  ],
  root_causes: [
    'Organizational structure mirrors 1990s functional design — compliance, advisory, risk, and operations are separate silos that do not share data, insights, or workflows',
    'Technology strategy focused on "systems of record" (CRM, core banking) but never invested in "systems of intelligence" that reason across data sources',
    'Regulatory conservatism created a culture where "doing it the old way" is safer than innovating — no incentive structure rewards process transformation',
    'Leadership treated AI as a technology initiative rather than an organizational transformation — resulting in disconnected proof-of-concepts that never scaled because roles, policies, and culture were not addressed',
    'Talent acquisition focused on domain expertise (finance, compliance) without building AI/ML capabilities — the organization lacks the hybrid skills needed to design and govern human-AI collaborative systems',
  ],
  expected_timeline: '20w',
  industry_segment_id: '',
};

/**
 * ORG_SEED — Mahindra & Mahindra sample org data for internal testing.
 * Used by "Fill Test Data" to populate the Organization Context card.
 */
export const ORG_SEED = {
  organization_description:
    'Mahindra & Mahindra Limited is a USD 21 billion multinational conglomerate headquartered in Mumbai, India. The Group operates across 20+ key industries including automotive, farm equipment, information technology, financial services, and real estate. With over 260,000 employees across 100+ countries, Mahindra is one of the largest vehicle manufacturers by production in India and the world\'s largest tractor company by volume. The company is a leader in utility vehicles, electric mobility, and sustainable business practices, driving innovation through its "Rise" philosophy.',
  website_url: 'https://www.mahindra.com',
  linkedin_url: 'https://www.linkedin.com/company/mahindra-and-mahindra',
  twitter_url: 'https://x.com/MahindraRise',
  tagline: 'Rise.',
};
