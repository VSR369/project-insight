/**
 * contextIntelligence.ts — Context intelligence, domain frameworks, and
 * intelligence directive extracted from promptTemplate.ts.
 */

/* ── Intelligence Directive ── */

export const INTELLIGENCE_DIRECTIVE = `
## YOUR ROLE: DOMAIN EXPERT CONSULTANT (NOT TEMPLATE AUDITOR)

You are a PRINCIPAL CONSULTANT who has spent 15+ years in this domain. You have:
- Delivered 200+ similar engagements across multiple geographies
- Published industry benchmarks and best practice guides
- Advised C-suite executives on exactly this type of challenge
- Seen what works, what fails, and why — from direct experience

### PRIMARY MODE: THINK, THEN CHECK

Do NOT start by checking format rules and word counts. START by understanding the challenge:

1. **COMPREHEND**: Read the entire challenge. What is this organization trying to achieve? What are the real constraints (stated and unstated)? What does success look like?

2. **CONTEXTUALIZE**: How does this compare to similar challenges you've seen? What worked? What failed? What were the non-obvious risks? What did the best solutions look like?

3. **THEN CRITIQUE**: Now check quality, completeness, consistency — but through the lens of "would this challenge attract a winning solution from a top solver?" Not "does this meet a checklist."

### WHAT YOU KNOW — AND MUST USE:

**From your training on consulting engagements:**
- Standard project structures for this type of work (what deliverables are typically expected)
- Typical timelines and budget ranges for similar scope
- Common failure modes and how to prevent them
- Industry-specific regulatory and compliance requirements
- Framework applicability (not just naming TOGAF — knowing WHEN and HOW it applies)

**From your training on open innovation platforms:**
- What makes a challenge attractive to top solvers (specificity, fairness, interesting problem)
- What makes solvers SKIP a challenge (vague scope, unfair IP terms, unrealistic timeline, low reward-to-effort ratio)
- Typical submission quality distribution (expect 5-10% excellent, 20-30% good, rest mediocre)
- How challenge design affects submission count and quality

**From your training on industry data:**
- Benchmarks: cost structures, KPIs, performance metrics for this industry
- Technology maturity: what's proven vs experimental in this domain
- Market dynamics: competitive landscape, vendor ecosystem, talent availability
- Regulatory: compliance requirements by geography and industry

### HOW TO EXPRESS THIS KNOWLEDGE:

In EVERY comment, ground your observation in domain experience:
- BAD: "The problem statement could be more specific."
- GOOD: "In predictive maintenance challenges, the #1 reason for poor submissions is that the problem statement doesn't specify the failure mode taxonomy. Solvers need to know whether they're detecting bearing wear, thermal anomalies, vibration patterns, or electrical faults — each requires different sensor data and different ML approaches. This problem statement should specify which failure modes are in scope."

- BAD: "Consider adding more evaluation criteria."
- GOOD: "For a POC-level AI/ML challenge, the standard evaluation framework includes: (1) Model accuracy on held-out test set (30-40% weight), (2) Inference latency under production load (15-20%), (3) Data preprocessing robustness (10-15%), (4) Documentation and reproducibility (10-15%), (5) Scalability assessment (10-15%). This challenge only has 2 criteria covering (1) and (5). Adding the others would dramatically improve submission quality and evaluation fairness."

### CHALLENGE ARCHETYPE RECOGNITION:

Before reviewing any section, identify which archetype this challenge fits:
- **Data/ML Pipeline**: Needs training data specification, model evaluation metrics, MLOps deployment plan, bias/fairness considerations
- **Enterprise Integration**: Needs system landscape, API contracts, auth requirements, rollback plan, performance SLAs
- **Process Redesign**: Needs current-state process map reference, change management stakeholders, adoption metrics, quick-win vs long-term phases
- **Strategic Advisory**: Needs executive audience framing, decision framework, implementation roadmap with governance gates
- **Product/UX Innovation**: Needs user persona reference, journey mapping, prototype fidelity definition, user testing protocol
- **Cybersecurity Assessment**: Needs threat model scope, compliance mapping, risk quantification method, remediation prioritization

Your comments MUST reflect the archetype. For a Data/ML challenge, flag missing training data specs as an ERROR, not a suggestion. For Strategic Advisory, flag missing governance framework as an ERROR.

### MATURITY-APPROPRIATE DEPTH:

- **Blueprint reviews**: Focus on strategic framing, stakeholder alignment, feasibility assessment. Flag overly technical deliverables as errors.
- **POC reviews**: Focus on technical feasibility, data availability, integration points, demo-readiness. Flag missing test criteria as errors.
- **Pilot reviews**: Focus on production readiness, scalability, security, operations handover, training plan. Flag missing SLAs as errors.

The SAME deliverable phrased differently is appropriate at different maturity levels:
- Blueprint: "Architecture recommendation document covering data flow, component selection rationale, and estimated infrastructure costs"
- POC: "Working data pipeline processing 1000 records/minute with <500ms latency, deployed on Docker, with automated test suite achieving >80% coverage"
- Pilot: "Production-grade data pipeline processing 50K records/minute with <100ms P99 latency, deployed on Kubernetes with auto-scaling, monitoring dashboard, runbook, and SLA of 99.9% uptime"

### SOLVER-PERSPECTIVE THINKING:

Before concluding your review of any section, mentally become a solver:
- "Would I understand this problem well enough to propose a solution?"
- "Do I know exactly what to deliver, in what format, by when?"
- "Is the reward worth the effort for this complexity level?"
- "What risks do I face (IP, scope creep, unclear acceptance criteria)?"

Flag every uncertainty a solver would have as a [SOLVER VIEW] warning.

### GUARDRAILS (still apply):
- Use domain knowledge for CONTEXT and BENCHMARKS — never for fabricated specifics about THIS organization
- Never invent system names, cost figures, regulatory citations you're not confident about
- If unsure about a domain-specific claim, say "in my experience" rather than stating as fact
- THE TEST: "Would a Deloitte principal consultant with 15 years in this domain say this from experience?" Yes → include.

### VOICE AND PERSPECTIVE

All AI-generated challenge content MUST be written from the SEEKING ORGANIZATION'S perspective — first person plural ("we", "our", "us"). The challenge is the seeker's own document addressed to potential solvers.

- WRONG: "The organization requires a predictive maintenance solution."
- RIGHT: "We need a predictive maintenance solution for our manufacturing lines."

- WRONG: "Solvers should note that the seeker has legacy SCADA systems."
- RIGHT: "Our factory floor runs on legacy SCADA systems (Siemens S7-300) with limited API access."

EXCEPTIONS:
- evaluation_criteria and submission_guidelines use neutral procedural voice ("Submissions will be evaluated...", "Solvers must provide...")
- AI review comments (speaking TO the curator) use second person ("Your problem statement should...", "Consider adding...")
`;

/* ── Domain Frameworks ── */

const DOMAIN_FRAMEWORKS: Record<string, string[]> = {
  supply_chain: ['SCOR Model', 'APICS CPIM', 'Value Stream Mapping', 'Theory of Constraints', 'Demand-Driven MRP'],
  cybersecurity: ['NIST CSF', 'ISO 27001', 'MITRE ATT&CK', 'CIS Controls', 'Zero Trust Architecture'],
  ai_ml: ['ML Canvas', 'CRISP-DM', 'MLOps Maturity Model', 'Responsible AI Framework', 'Feature Store Pattern'],
  data_analytics: ['DAMA-DMBOK', 'Data Mesh', 'Medallion Architecture', 'Kimball Dimensional Modeling', 'Data Quality Framework'],
  cloud: ['Well-Architected Framework', 'Cloud Adoption Framework', '12-Factor App', 'Strangler Fig Pattern', 'TOGAF ADM'],
  digital_transformation: ['Digital Maturity Model', 'McKinsey 7-S', 'Kotter 8-Step', 'ADKAR', 'Business Model Canvas'],
  process_automation: ['Process Mining (Celonis)', 'Lean Six Sigma', 'RPA CoE Model', 'Intelligent Automation Framework', 'BPM Lifecycle'],
  product_innovation: ['Design Thinking (d.school)', 'Jobs To Be Done', 'Lean Startup', 'Stage-Gate Process', 'Value Proposition Canvas'],
  iot: ['IoT Reference Architecture', 'Edge Computing Framework', 'Digital Twin Pattern', 'OPC-UA Standard', 'MQTT Protocol Stack'],
  blockchain: ['Token Engineering', 'Smart Contract Audit Framework', 'DeFi Risk Assessment', 'Enterprise Blockchain Maturity'],
  healthcare: ['HL7 FHIR', 'HIPAA Security Rule', 'Clinical Decision Support Framework', 'FDA SaMD Classification'],
  finance: ['Basel III/IV', 'PCI DSS', 'Open Banking (PSD2)', 'IFRS 17', 'AML/KYC Framework'],
  sustainability: ['GHG Protocol', 'TCFD Recommendations', 'Science Based Targets', 'EU Taxonomy', 'Circular Economy Framework'],
  enterprise_architecture: ['TOGAF ADM', 'ArchiMate', 'Zachman Framework', 'Capability Maturity Model', 'Business Architecture Guild BIZBOK'],
  predictive_maintenance: ['P-F Curve Analysis', 'RCM (Reliability Centered Maintenance)', 'CBM+ Framework', 'ISO 55000 Asset Management'],
  nlp: ['Transformer Architecture', 'BERT/GPT Fine-tuning', 'RAG Pattern', 'Evaluation: BLEU/ROUGE/BERTScore', 'Prompt Engineering Framework'],
  computer_vision: ['YOLO Architecture', 'Transfer Learning Pipeline', 'Data Augmentation Strategy', 'mAP/IoU Evaluation', 'Edge Deployment Framework'],
  api_strategy: ['API Maturity Model', 'OpenAPI 3.0', 'API Gateway Pattern', 'Developer Experience (DX) Framework', 'API Versioning Strategy'],
  workforce: ['Skills Taxonomy Framework', 'Competency-Based Assessment', '70-20-10 Learning Model', 'HR Analytics Maturity', 'Employee Experience (EX) Design'],
};

export function detectDomainFrameworks(
  domainTags?: string[] | null,
  problemStatement?: string | null,
  scope?: string | null,
): string[] {
  const relevant = new Set<string>();

  if (domainTags?.length) {
    for (const tag of domainTags) {
      const tagLower = typeof tag === 'string' ? tag.toLowerCase() : '';
      for (const [domain, frameworks] of Object.entries(DOMAIN_FRAMEWORKS)) {
        if (tagLower.includes(domain) || domain.includes(tagLower)) {
          frameworks.forEach(f => relevant.add(f));
        }
      }
    }
  }

  if (relevant.size === 0 && (problemStatement || scope)) {
    const textToScan = [
      problemStatement || '',
      scope || '',
    ].join(' ').toLowerCase().replace(/<[^>]*>/g, ' ');

    const DOMAIN_KEYWORDS: Record<string, string[]> = {
      supply_chain: ['supply chain', 'logistics', 'procurement', 'warehouse', 'inventory', 'demand forecast', 'scm'],
      cybersecurity: ['cybersecurity', 'cyber security', 'information security', 'threat', 'vulnerability', 'penetration test', 'soc ', 'siem'],
      ai_ml: ['machine learning', 'artificial intelligence', ' ai ', ' ml ', 'deep learning', 'neural network', 'model training', 'llm', 'generative ai'],
      data_analytics: ['data analytics', 'data warehouse', 'business intelligence', ' bi ', 'data lake', 'data pipeline', 'etl', 'dashboard'],
      cloud: ['cloud migration', 'cloud native', 'aws', 'azure', 'gcp', 'kubernetes', 'containeriz', 'microservice', 'serverless'],
      digital_transformation: ['digital transformation', 'change management', 'organizational change', 'digital maturity', 'agile transformation'],
      process_automation: ['process automation', ' rpa ', 'robotic process', 'workflow automation', 'bpm', 'process mining', 'intelligent automation'],
      product_innovation: ['product innovation', 'product design', 'user experience', ' ux ', 'design thinking', 'customer journey', 'mvp'],
      iot: ['internet of things', ' iot ', 'sensor', 'edge computing', 'connected device', 'telemetry', 'scada'],
      blockchain: ['blockchain', 'distributed ledger', 'smart contract', 'token', 'web3', 'defi'],
      healthcare: ['healthcare', 'clinical', 'patient', 'medical', 'pharmaceutical', 'ehr', 'fhir', 'hipaa'],
      finance: ['financial', 'banking', 'fintech', 'payment', 'lending', 'insurance', 'aml', 'kyc', 'compliance'],
      sustainability: ['sustainability', 'esg', 'carbon', 'emissions', 'climate', 'renewable', 'circular economy'],
      enterprise_architecture: ['enterprise architecture', 'togaf', 'archimate', 'capability model', 'technology landscape'],
      predictive_maintenance: ['predictive maintenance', 'condition monitoring', 'vibration analysis', 'equipment failure', 'asset management'],
      nlp: ['natural language', ' nlp ', 'text mining', 'sentiment analysis', 'chatbot', 'language model', 'text classification'],
      computer_vision: ['computer vision', 'image recognition', 'object detection', 'video analytics', 'ocr'],
      api_strategy: ['api strategy', 'api gateway', 'api management', 'openapi', 'developer portal', 'api-first'],
      workforce: ['workforce', 'talent management', 'skills gap', 'reskilling', 'upskilling', 'employee experience', 'hr tech'],
    };

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      for (const keyword of keywords) {
        if (textToScan.includes(keyword)) {
          const frameworks = DOMAIN_FRAMEWORKS[domain];
          if (frameworks) {
            frameworks.forEach(f => relevant.add(f));
          }
          break;
        }
      }
    }
  }

  return [...relevant];
}

/* ── Context Intelligence Builder ── */

export function buildContextIntelligence(
  challengeData: any,
  clientContext: any,
  orgContext?: any,
): string {
  const orgName = orgContext?.orgName || '(not specified)';
  const websiteUrl = orgContext?.websiteUrl;
  const linkedinUrl = orgContext?.linkedinUrl;
  const country = orgContext?.hqCountry || '(infer from currency)';
  const city = orgContext?.hqCity;
  const orgType = orgContext?.orgType || 'Enterprise';
  const primaryIndustry = orgContext?.industries?.find((i: any) => i.isPrimary)?.name
    || (Array.isArray(challengeData.domain_tags) && challengeData.domain_tags.length > 0 ? challengeData.domain_tags[0] : '(infer from problem statement)');

  const currency = challengeData.currency_code || clientContext?.currency || 'USD';
  const CURRENCY_GEO: Record<string, string> = { USD:'United States', EUR:'European Union', GBP:'United Kingdom', INR:'India', AED:'UAE/Gulf', SGD:'Singapore', AUD:'Australia', JPY:'Japan', CNY:'China', CAD:'Canada', BRL:'Brazil', ZAR:'South Africa', CHF:'Switzerland', KRW:'South Korea' };
  const geography = orgContext?.hqCountry || CURRENCY_GEO[currency] || 'Global';

  const opModel = challengeData.operating_model || 'marketplace';
  const maturity = clientContext?.maturityLevel || challengeData.maturity_level || 'not set';
  const complexity = clientContext?.complexityLevel || challengeData.complexity_level || 'not set';
  const solutionType = clientContext?.solutionType || challengeData.solution_type || 'not set';

  const tagline = orgContext?.tagline;
  const twitterUrl = orgContext?.twitterUrl;
  const functionalAreas = orgContext?.functionalAreas;

  return `
## CONTEXT INTELLIGENCE — KNOW THE SEEKER, KNOW THE DOMAIN

### ORGANIZATION (THE SEEKER — "WE" IN ALL CONTENT)
- **We are**: ${orgName}${orgContext?.tradeBrand ? ` (${orgContext.tradeBrand})` : ''} — ${orgType}${orgContext?.isEnterprise ? ' (Enterprise)' : ''}
${tagline ? `- **Our tagline**: "${tagline}"` : ''}
${orgContext?.orgDescription ? `- **About us**: ${orgContext.orgDescription.substring(0, 400)}` : ''}
${websiteUrl ? `- **Website**: ${websiteUrl}` : ''}
${linkedinUrl ? `- **LinkedIn**: ${linkedinUrl}` : ''}
${twitterUrl ? `- **Twitter/X**: ${twitterUrl}` : ''}
- **HQ**: ${city ? city + ', ' : ''}${geography}
${orgContext?.annualRevenue ? `- **Revenue**: ${orgContext.annualRevenue}` : ''}
${orgContext?.employeeCount ? `- **Team**: ${orgContext.employeeCount}` : ''}
${functionalAreas?.length ? `- **Functions**: ${functionalAreas.join(', ')}` : ''}
- **Industry**: ${primaryIndustry}

${websiteUrl || orgName !== '(not specified)' ? `**YOU KNOW THIS ORGANIZATION** from your training (website, LinkedIn, press, industry reports). Use that knowledge:
- What do we do? Core products/services? Market position? Key competitors?
- Technology stack, infrastructure, strategic priorities?
- Regulatory environment in ${geography}?
GUARDRAIL: Only use what you confidently know. Never fabricate org-specific claims.` : ''}

### GEOGRAPHY: ${geography}
You KNOW: data privacy laws, industry regulations for ${primaryIndustry}, tech infrastructure maturity, talent market, business culture norms. Reference SPECIFIC regulations for ${geography}, not generic advice. Currency: ${currency}.

### INDUSTRY: ${primaryIndustry}
You KNOW: standard KPIs, benchmarks, frameworks, competitive dynamics, technology adoption curves, typical project budgets/timelines. Benchmark THIS challenge against industry norms.

### OPERATING MODEL: ${opModel.toUpperCase()}
${opModel === 'aggregator' ? 'Internal Challenge Creator. May use insider jargon. Budget flexible. Review for external solver accessibility.' : 'AM/CA pre-defined parameters. Budget constraints MUST be respected. Challenge must be 100% self-contained for open competitive submissions.'}

### CHALLENGE PROFILE: ${solutionType} | ${maturity} | ${complexity}
${maturity === 'BLUEPRINT' || maturity === 'blueprint' ? 'Blueprint = strategic documents. Focus on framing and stakeholder alignment.' : maturity === 'POC' || maturity === 'poc' ? 'POC = working prototype. Focus on feasibility, data, demo-readiness.' : maturity === 'PILOT' || maturity === 'pilot' ? 'Pilot = production deployment. Focus on scalability, security, SLAs, operations.' : 'Assess depth from deliverables.'}

### HOW TO APPLY THIS KNOWLEDGE:

1. **In COMMENTS**: When you identify an issue, don't just say "this needs improvement." Say WHY it's a problem using your domain knowledge. Example: "In ${geography}'s ${primaryIndustry} sector, [specific regulatory requirement] means this deliverable needs [specific addition]."

2. **In BEST PRACTICES**: Don't cite generic frameworks. Apply them to THIS challenge. Example: "For a ${maturity}-level ${solutionType} challenge in ${primaryIndustry}, the standard approach is [specific methodology]."

3. **In SUGGESTIONS**: Recommend improvements that a principal consultant in this domain would make. Not "add more detail" but "add a data quality assessment framework covering completeness, accuracy, and timeliness metrics."

4. **In WARNINGS**: Flag domain-specific risks. "In my experience with ${maturity} ${primaryIndustry} challenges, the #1 failure mode is [specific risk]. This challenge should address it by [specific mitigation]."

**COMPETITIVE INTELLIGENCE**: Benchmark THIS challenge against similar challenges on InnoCentive/Wazoku, HeroX, Kaggle, TopCoder. Is the scope, timeline, reward, and deliverables competitive?
`;
}

/* ── Section Wave Context ── */

export const SECTION_WAVE_CONTEXT: Record<string, {
  wave: number;
  waveName: string;
  strategicRole: string;
  upstreamSections: string[];
  downstreamSections: string[];
}> = {
  problem_statement: {
    wave: 1, waveName: 'Foundation',
    strategicRole: 'THE ANCHOR — everything flows from this. If the problem is vague, every downstream section will be misaligned. This must be crystal clear to a solver who has never heard of this organization.',
    upstreamSections: [],
    downstreamSections: ['scope', 'deliverables', 'expected_outcomes', 'root_causes', 'hook', 'solver_expertise', 'solution_type'],
  },
  scope: {
    wave: 1, waveName: 'Foundation',
    strategicRole: 'THE BOUNDARY — defines what solvers should and should NOT address. Every downstream section must fit within scope. If scope is ambiguous, solvers waste effort on out-of-scope work.',
    upstreamSections: ['problem_statement'],
    downstreamSections: ['deliverables', 'solver_expertise', 'eligibility', 'submission_guidelines', 'domain_tags', 'complexity'],
  },
  expected_outcomes: {
    wave: 1, waveName: 'Foundation',
    strategicRole: 'THE MEASURE OF SUCCESS — these are what the seeker will use to judge whether the challenge was worth it. Must be SMART. Directly drives evaluation_criteria and success_metrics_kpis.',
    upstreamSections: ['problem_statement', 'scope'],
    downstreamSections: ['evaluation_criteria', 'deliverables', 'success_metrics_kpis'],
  },
  context_and_background: {
    wave: 1, waveName: 'Foundation',
    strategicRole: 'THE EQUALIZER — gives external solvers the same contextual understanding that internal teams have. Without this, solvers from outside the organization are at a massive disadvantage.',
    upstreamSections: ['problem_statement'],
    downstreamSections: ['root_causes', 'affected_stakeholders', 'current_deficiencies'],
  },
  success_metrics_kpis: {
    wave: 1, waveName: 'Foundation',
    strategicRole: 'THE SCORECARD — quantitative measures that make outcomes tangible and verifiable. These become the basis for evaluation criteria.',
    upstreamSections: ['expected_outcomes', 'deliverables'],
    downstreamSections: ['evaluation_criteria'],
  },
  solution_type: {
    wave: 2, waveName: 'Enrichment',
    strategicRole: 'THE SOLVER FILTER — determines which solver pool this challenge reaches. Wrong type = wrong solvers = poor submissions.',
    upstreamSections: ['problem_statement', 'scope', 'deliverables'],
    downstreamSections: ['complexity', 'solver_expertise', 'domain_tags', 'deliverables'],
  },
  root_causes: {
    wave: 2, waveName: 'Enrichment',
    strategicRole: 'THE DIAGNOSTIC — tells solvers WHY the problem exists so they can address causes not symptoms.',
    upstreamSections: ['problem_statement', 'context_and_background'],
    downstreamSections: ['preferred_approach', 'current_deficiencies', 'deliverables'],
  },
  affected_stakeholders: {
    wave: 2, waveName: 'Enrichment',
    strategicRole: 'THE ADOPTION MAP — tells solvers who will use their solution and what resistance to expect. Adoption challenges are the #1 reason innovation projects fail post-delivery.',
    upstreamSections: ['problem_statement', 'scope'],
    downstreamSections: [],
  },
  current_deficiencies: {
    wave: 2, waveName: 'Enrichment',
    strategicRole: 'THE BASELINE — establishes the measurable current state so solvers know what "improvement" means and can quantify their impact.',
    upstreamSections: ['problem_statement', 'root_causes'],
    downstreamSections: ['deliverables', 'preferred_approach'],
  },
  preferred_approach: {
    wave: 2, waveName: 'Enrichment',
    strategicRole: 'THE SEEKER VOICE — human-authored strategic direction. AI must NEVER override this. It represents organizational knowledge the AI cannot have.',
    upstreamSections: ['problem_statement', 'root_causes', 'deliverables'],
    downstreamSections: ['approaches_not_of_interest'],
  },
  approaches_not_of_interest: {
    wave: 2, waveName: 'Enrichment',
    strategicRole: 'THE GUARDRAIL — prevents solvers from wasting time on approaches the seeker has already rejected or that violate organizational constraints.',
    upstreamSections: ['preferred_approach'],
    downstreamSections: [],
  },
  deliverables: {
    wave: 3, waveName: 'Complexity',
    strategicRole: 'THE CONTRACT — the most important section after problem_statement. This is what solvers COMMIT to produce. Vague deliverables = disputes, scope creep, and failed evaluations.',
    upstreamSections: ['problem_statement', 'scope', 'expected_outcomes', 'solution_type'],
    downstreamSections: ['complexity', 'solver_expertise', 'submission_guidelines', 'evaluation_criteria', 'maturity_level', 'data_resources_provided'],
  },
  maturity_level: {
    wave: 3, waveName: 'Complexity',
    strategicRole: 'THE CALIBRATOR — sets the depth expectation. Blueprint solvers write documents. POC solvers build prototypes. Pilot solvers deploy systems. Mismatched maturity = wrong deliverable quality.',
    upstreamSections: ['deliverables', 'scope'],
    downstreamSections: ['complexity', 'phase_schedule', 'reward_structure'],
  },
  complexity: {
    wave: 3, waveName: 'Complexity',
    strategicRole: 'THE RESOURCE CALIBRATOR — drives timeline, reward, and expertise requirements. Over-estimated complexity = over-scoped challenge that attracts no solvers. Under-estimated = under-funded, poor quality submissions.',
    upstreamSections: ['deliverables', 'maturity_level', 'scope'],
    downstreamSections: ['phase_schedule', 'reward_structure', 'solver_expertise'],
  },
  data_resources_provided: {
    wave: 3, waveName: 'Complexity',
    strategicRole: 'THE ENABLER — solvers cannot produce results without data and resources. Incomplete or unclear data documentation is the #2 reason open innovation challenges fail.',
    upstreamSections: ['deliverables', 'scope'],
    downstreamSections: ['submission_guidelines'],
  },
  solver_expertise: {
    wave: 4, waveName: 'Targeting',
    strategicRole: 'THE TALENT FILTER — determines which solvers can participate. Too narrow = too few submissions. Too broad = irrelevant submissions. Must match complexity and deliverable requirements exactly.',
    upstreamSections: ['deliverables', 'complexity', 'solution_type'],
    downstreamSections: ['eligibility'],
  },
  eligibility: {
    wave: 4, waveName: 'Targeting',
    strategicRole: 'THE ACCESS GATE — defines which solver tiers can participate. Individual vs Team vs Organization. Must match challenge complexity and collaboration requirements.',
    upstreamSections: ['solver_expertise', 'complexity'],
    downstreamSections: [],
  },
  phase_schedule: {
    wave: 5, waveName: 'Evaluation & Commercial',
    strategicRole: 'THE TIMELINE — drives urgency and feasibility assessment by solvers. Too short = only low-quality submissions. Too long = solver attention drift. Must align with complexity.',
    upstreamSections: ['complexity', 'maturity_level', 'deliverables'],
    downstreamSections: ['submission_guidelines'],
  },
  submission_guidelines: {
    wave: 5, waveName: 'Evaluation & Commercial',
    strategicRole: 'THE INSTRUCTIONS — tells solvers exactly what to submit and how. Ambiguous guidelines = inconsistent submissions that are impossible to compare fairly.',
    upstreamSections: ['deliverables', 'evaluation_criteria', 'phase_schedule', 'data_resources_provided'],
    downstreamSections: [],
  },
  evaluation_criteria: {
    wave: 5, waveName: 'Evaluation & Commercial',
    strategicRole: 'THE JUDGE — weights must sum to 100%. Each criterion must map to at least one deliverable. Each deliverable must be assessed by at least one criterion. Poorly designed criteria = disputed results.',
    upstreamSections: ['deliverables', 'expected_outcomes', 'scope'],
    downstreamSections: [],
  },
  reward_structure: {
    wave: 5, waveName: 'Evaluation & Commercial',
    strategicRole: 'THE MOTIVATOR — must be proportional to complexity, competitive in the market, and fair given the IP model. Low rewards for high complexity = no top-tier submissions.',
    upstreamSections: ['complexity', 'maturity_level', 'deliverables', 'phase_schedule'],
    downstreamSections: [],
  },
  ip_model: {
    wave: 5, waveName: 'Evaluation & Commercial',
    strategicRole: 'THE VALUE EXCHANGE — defines who owns what. Stronger IP transfer demands higher rewards. Must match deliverable nature (can\'t transfer IP that doesn\'t exist in a Blueprint).',
    upstreamSections: ['deliverables', 'maturity_level', 'reward_structure'],
    downstreamSections: [],
  },
  hook: {
    wave: 6, waveName: 'Presentation',
    strategicRole: 'THE FIRST IMPRESSION — solvers see this first. 3 seconds to decide if they read further. Must communicate the "so what" — why THIS challenge is worth their time over alternatives.',
    upstreamSections: ['problem_statement', 'scope', 'deliverables', 'reward_structure'],
    downstreamSections: [],
  },
  visibility: {
    wave: 6, waveName: 'Presentation',
    strategicRole: 'THE FAIRNESS SETTING — anonymous evaluation reduces bias but prevents team assessment. Named visibility enables credential review but introduces institutional bias.',
    upstreamSections: ['solver_expertise', 'eligibility'],
    downstreamSections: [],
  },
  domain_tags: {
    wave: 6, waveName: 'Presentation',
    strategicRole: 'THE DISCOVERY ENGINE — how solvers find this challenge. Wrong tags = invisible to the right solvers. Generic tags = drowned in noise.',
    upstreamSections: ['problem_statement', 'scope', 'deliverables', 'solution_type'],
    downstreamSections: [],
  },
  creator_references: {
    wave: 6, waveName: 'Presentation',
    strategicRole: 'THE EVIDENCE BASE — Creator-provided documents and materials. Verify they are relevant to the refined specification, accessible to solvers, and do not contradict scope or deliverables.',
    upstreamSections: ['problem_statement', 'scope', 'deliverables'],
    downstreamSections: [],
  },
  reference_urls: {
    wave: 6, waveName: 'Presentation',
    strategicRole: 'THE EXTERNAL CONTEXT — Creator-provided URLs for background reading. Verify they are active, domain-relevant, and appropriately scoped for solvers.',
    upstreamSections: ['problem_statement', 'scope', 'domain_tags'],
    downstreamSections: [],
  },
  solver_audience: {
    wave: 6, waveName: 'Presentation',
    strategicRole: 'THE POOL SELECTOR — for AGG model challenges, controls whether internal-only, external-only, or all solvers see the challenge. Must be consistent with operating model and solver expertise requirements.',
    upstreamSections: ['solver_expertise', 'eligibility'],
    downstreamSections: [],
  },
  evaluation_config: {
    wave: 6, waveName: 'Presentation',
    strategicRole: 'THE GOVERNANCE SETTING — evaluation method (single evaluator vs Delphi panel) and blind review toggle. Delphi panel size must match complexity level. Blind review must align with eligibility and visibility settings.',
    upstreamSections: ['complexity', 'evaluation_criteria', 'eligibility', 'visibility'],
    downstreamSections: [],
  },
};
