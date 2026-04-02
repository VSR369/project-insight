/**
 * aiCalls.ts — AI Two-Pass orchestrator + shared constants.
 * Pass 1 and Pass 2 implementations extracted to aiPass1.ts and aiPass2.ts.
 */

import { getSectionFormatType, type SectionConfig } from "./promptTemplate.ts";
import { callAIPass1Analyze } from "./aiPass1.ts";
import { callAIPass2Rewrite } from "./aiPass2.ts";

/* ── Clean literal escape sequences from AI output ── */
export function cleanAIOutput(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') return null;
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '\"')
    .replace(/\\\\/g, '\\')
    .trim();
}

/** Section keys that don't match their DB column names */
export const SECTION_FIELD_ALIASES: Record<string, string> = {
  solver_expertise: 'solver_expertise_requirements',
  eligibility: 'solver_eligibility_types',
  visibility: 'solver_visibility_types',
  submission_guidelines: 'description',
  solution_type: 'solution_types',
};

/* ── Cross-section dependency map ── */
export const SECTION_DEPENDENCIES: Record<string, string[]> = {
  problem_statement: [],
  scope: ['problem_statement'],
  expected_outcomes: ['problem_statement', 'scope'],
  context_and_background: ['problem_statement'],
  root_causes: ['problem_statement', 'context_and_background'],
  affected_stakeholders: ['problem_statement', 'scope'],
  current_deficiencies: ['problem_statement', 'root_causes'],
  preferred_approach: ['problem_statement', 'root_causes'],
  approaches_not_of_interest: ['preferred_approach'],
  solution_type: ['problem_statement', 'scope'],
  deliverables: ['problem_statement', 'scope', 'expected_outcomes', 'solution_type'],
  maturity_level: ['deliverables', 'scope'],
  data_resources_provided: ['deliverables', 'scope'],
  success_metrics_kpis: ['expected_outcomes', 'deliverables'],
  complexity: ['solution_type', 'deliverables', 'scope', 'maturity_level', 'data_resources_provided'],
  solver_expertise: ['solution_type', 'deliverables', 'scope', 'domain_tags'],
  eligibility: ['solver_expertise', 'maturity_level', 'complexity'],
  phase_schedule: ['deliverables', 'maturity_level', 'complexity'],
  evaluation_criteria: ['deliverables', 'expected_outcomes', 'scope'],
  submission_guidelines: ['deliverables', 'evaluation_criteria', 'phase_schedule'],
  reward_structure: ['complexity', 'maturity_level', 'deliverables', 'phase_schedule', 'solver_expertise'],
  ip_model: ['deliverables', 'maturity_level', 'reward_structure'],
  hook: ['problem_statement', 'scope', 'deliverables', 'reward_structure', 'domain_tags'],
  visibility: ['solver_expertise', 'eligibility'],
  domain_tags: ['problem_statement', 'scope', 'deliverables', 'solution_type'],
};

/** What to check FOR when reviewing a section against its dependencies */
export const DEPENDENCY_REASONING: Record<string, Record<string, string>> = {
  evaluation_criteria: {
    deliverables: 'VERIFY: Every criterion can be assessed from at least one deliverable. Every deliverable has at least one criterion evaluating it. Flag orphaned criteria or unevaluated deliverables.',
    expected_outcomes: 'VERIFY: Criteria weights reflect the relative importance of outcomes. The highest-weighted criterion should evaluate the most critical outcome.',
    scope: 'VERIFY: Criteria don\'t assess anything outside scope. No criterion should require deliverables not listed in scope.',
    submission_guidelines: 'VERIFY: Every criterion can be assessed from the submission format specified. If criterion requires a live demo but submission guidelines only mention PDF, flag the gap.',
  },
  reward_structure: {
    complexity: 'SCALE: Higher complexity (L4-L5) justifies higher rewards. L1-L2 challenges with $100K+ rewards are suspicious.',
    maturity_level: 'SCALE: Blueprint $5K-$25K, POC $25K-$100K, Pilot $100K-$500K. Significant deviations need justification.',
    deliverables: 'VERIFY: Reward proportional to deliverable effort. 10 complex deliverables at $5K total is inadequate.',
    phase_schedule: 'VERIFY: Compressed timelines justify premium rewards. 4-week sprints need higher per-week rates than 16-week projects.',
    solver_expertise: 'SCALE: Specialized expertise (niche certifications, PhD-level research) commands premium rewards. If requiring rare expertise at low reward, top solvers will skip this challenge.',
  },
  deliverables: {
    problem_statement: 'VERIFY: Every deliverable addresses some aspect of the problem. No deliverables that solve a different problem.',
    scope: 'VERIFY: Deliverables collectively cover the full scope. No scope items left unaddressed. No deliverables outside scope.',
    expected_outcomes: 'VERIFY: Deliverables, when completed, would achieve the expected outcomes. If outcome says "reduce cost by 30%" but no deliverable includes cost analysis, flag the gap.',
    solution_type: 'VERIFY: Deliverable types match solution type. AI/ML type → model deliverables. Process type → process map deliverables.',
  },
  solver_expertise: {
    solution_type: 'ALIGN: Required expertise must match solution type. AI/ML solutions need ML engineers, not just "data professionals".',
    deliverables: 'ALIGN: Expertise level must match deliverable complexity. Production Kubernetes deployment requires DevOps expertise, not just cloud familiarity.',
    scope: 'ALIGN: Breadth of expertise should match scope breadth. Multi-domain scope needs either broad expertise or team requirement.',
    domain_tags: 'ALIGN: Domain-specific expertise should match domain tags. Supply chain challenge needs supply chain domain knowledge, not just technical skills.',
  },
  phase_schedule: {
    deliverables: 'VERIFY: Total duration is sufficient for all deliverables. 5 complex deliverables in 4 weeks is unrealistic.',
    maturity_level: 'SCALE: Blueprint 4-8 weeks, POC 8-16 weeks, Pilot 16-32 weeks. Compressed schedules increase risk.',
    complexity: 'SCALE: Higher complexity needs longer timelines. L4-L5 complexity with L1-L2 timeline is a red flag.',
    evaluation_criteria: 'VERIFY: Evaluation phase duration is sufficient for the number and complexity of criteria. 5 criteria with expert panel review needs more eval time than 3 automated criteria.',
  },
  submission_guidelines: {
    deliverables: 'VERIFY: Every deliverable has a submission format specified. If deliverable includes code, submission must request repo access.',
    evaluation_criteria: 'VERIFY: Submission format enables assessment of every criterion. Can\'t evaluate "demo quality" without requesting a demo.',
    phase_schedule: 'VERIFY: Submission deadline has sufficient buffer after work period. Evaluation phase has sufficient time for the number of criteria.',
  },
  hook: {
    problem_statement: 'EXTRACT: Pull the most compelling aspect of the problem — the "so what" that makes a solver care.',
    scope: 'EXTRACT: Reference the most exciting or unique aspect of the scope.',
    deliverables: 'EXTRACT: Mention the most tangible deliverable to make the opportunity feel real.',
    reward_structure: 'EXTRACT: Reference the reward to create concrete motivation. "$75K for a working prototype" is better than "competitive rewards".',
    domain_tags: 'REFERENCE: Include domain-specific language that signals to the right solvers. "Edge ML for vibration analysis" attracts different solvers than "AI solution".',
  },
  ip_model: {
    deliverables: 'MATCH: Tangible IP (code, algorithms, designs) → IP-EA or IP-EL. Intangible (advice, analysis) → IP-NONE or IP-NEL.',
    maturity_level: 'MATCH: Blueprint rarely produces transferable IP (use IP-NONE). Pilot always does (use IP-EA or IP-EL).',
    reward_structure: 'BALANCE: Stronger IP transfer demands higher reward. IP-EA with low reward drives away top solvers.',
  },
  scope: {
    problem_statement: 'DERIVE: Every scope item should trace to the problem. If the problem is about customer churn, scope items about employee training are off-topic unless explicitly connected.',
  },
  expected_outcomes: {
    problem_statement: 'DERIVE: Outcomes should directly address the problem. If problem is "high defect rate", outcomes must include defect reduction targets.',
    scope: 'BOUND: Outcomes must be achievable within scope. Promising "50% cost reduction" when scope excludes process changes is misleading.',
  },
  success_metrics_kpis: {
    expected_outcomes: 'MAP: Every KPI must trace to an expected outcome. Orphaned KPIs (no matching outcome) are noise.',
    deliverables: 'FEASIBLE: KPI measurement methods must be implementable with the deliverables provided.',
  },
  root_causes: {
    problem_statement: 'DERIVE: Root causes must explain WHY the problem exists, not restate the problem. "High defect rate" is the problem; "No automated quality inspection at station 3" is a root cause.',
    context_and_background: 'CONSISTENT: Root causes should align with the operational context described. Technical root causes need technical context.',
  },
  maturity_level: {
    deliverables: 'MATCH: If deliverables include working code → not Blueprint. If deliverables are strategy documents → not Pilot.',
    scope: 'MATCH: Narrow, well-defined scope → POC appropriate. Broad, exploratory scope → Blueprint appropriate.',
  },
  visibility: {
    solver_expertise: 'MATCH: Highly specialized expertise → "named" may help evaluators assess credentials. General expertise → "anonymous" reduces bias.',
    eligibility: 'MATCH: Organization-tier eligibility → "named" enables team assessment. Individual-tier → "anonymous" preferred.',
  },
  eligibility: {
    solver_expertise: 'ALIGN: Eligibility tiers must match required expertise. Niche certifications may need TIER_2/TIER_3.',
    maturity_level: 'ALIGN: Pilot challenges typically need teams (TIER_2+). Blueprint can work with individuals (TIER_1).',
    complexity: 'MATCH: L4-L5 complexity typically needs TIER_2 or TIER_3 (teams/orgs). TIER_1 (individuals) for high complexity is risky unless the solver pool has exceptional specialists.',
  },
  data_resources_provided: {
    deliverables: 'VERIFY: Listed resources are sufficient for solvers to produce all deliverables. If deliverables require training data but no datasets are listed, flag the gap.',
    scope: 'VERIFY: Data resources cover the full scope of work. Missing resources for in-scope items block solver progress.',
    solver_expertise: 'MATCH: Data formats and tools should align with expected solver capabilities. Providing raw Spark datasets when targeting individual consultants (TIER_1) may be a mismatch.',
  },
};

// Re-export Pass 1 and Pass 2 for backward compatibility
export { callAIPass1Analyze } from "./aiPass1.ts";
export { callAIPass2Rewrite } from "./aiPass2.ts";

/* ══════════════════════════════════════════════════════════════
 * TWO-PASS ORCHESTRATOR
 * Calls Pass 1, filters, conditionally calls Pass 2, merges.
 * ══════════════════════════════════════════════════════════════ */

export async function callAIBatchTwoPass(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  sectionKeys: string[],
  challengeData: any,
  waveAction: string,
  clientContext?: any,
  sectionConfigs?: SectionConfig[],
  skipAnalysis?: boolean,
  providedComments?: any[],
  masterDataOptions?: Record<string, { code: string; label: string }[]>,
  orgContext?: any,
  attachmentsBySection?: Record<string, { name: string; sourceType: string; sourceUrl?: string; content: string; summary?: string; keyData?: Record<string, unknown>; resourceType?: string; sharedWithSolver: boolean }[]>,
  contextDigestText?: string,
  useContextIntelligence?: boolean,
): Promise<{ section_key: string; status: string; comments: any[]; reviewed_at: string; suggestion?: string | null; cross_section_issues?: any[]; guidelines?: string[] }[]> {

  let pass1Results: any[];

  if (skipAnalysis && providedComments && providedComments.length > 0) {
    pass1Results = providedComments;
    console.log(`Skip-analysis mode: using ${providedComments.length} provided comment(s) for Pass 2 only`);
  } else {
    pass1Results = await callAIPass1Analyze(apiKey, model, systemPrompt, userPrompt, sectionKeys);
  }

  let suggestionMap: Map<string, string>;
  try {
    suggestionMap = await callAIPass2Rewrite(apiKey, model, pass1Results, challengeData, waveAction, clientContext, sectionConfigs, masterDataOptions, orgContext, attachmentsBySection, contextDigestText, useContextIntelligence);
  } catch (err: any) {
    if (err.message === "RATE_LIMIT" || err.message === "PAYMENT_REQUIRED") throw err;
    console.error("Pass 2 failed, continuing with Pass 1 results:", err);
    suggestionMap = new Map();
  }

  return pass1Results.map((r: any) => {
    const suggestion = suggestionMap.get(r.section_key) || null;
    const cleanedComments = Array.isArray(r.comments)
      ? r.comments.map((c: any) => ({
          ...c,
          text: cleanAIOutput(c.text) || c.text,
          reasoning: cleanAIOutput(c.reasoning),
        }))
      : r.comments;
    const cleanedGuidelines = Array.isArray(r.guidelines)
      ? r.guidelines.map((g: string) => cleanAIOutput(g)).filter(Boolean)
      : r.guidelines;

    return {
      ...r,
      comments: cleanedComments,
      guidelines: cleanedGuidelines,
      suggestion: (() => {
        const fmt = getSectionFormatType(r.section_key);
        return (fmt === 'table' || fmt === 'schedule_table') ? suggestion : cleanAIOutput(suggestion);
      })(),
    };
  });
}
