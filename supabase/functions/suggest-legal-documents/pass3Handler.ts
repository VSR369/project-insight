/**
 * Pass 3 — Legal AI Review Handler
 *
 * Generates a single UNIFIED Solution Provider Agreement (SPA) for a challenge,
 * grounded in the full unified context (org, industry, geo, legal docs, etc.)
 * and per-section AI prompt configuration from ai_legal_review_config.
 *
 * Persists result as a single row in challenge_legal_docs with
 *   document_type='UNIFIED_SPA', status='ai_suggested', ai_review_status='ai_suggested'.
 *
 * Imported by index.ts only when request body contains pass3_mode: true.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithFallback } from "../_shared/aiModelConfig.ts";
import { buildUnifiedContext } from "../_shared/buildUnifiedContext.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DOCUMENT_TYPE = "UNIFIED_SPA";
const DOCUMENT_NAME = "Solution Provider Agreement";
const TIER = "TIER_1";

type Confidence = "high" | "medium" | "low";

interface SectionConfigRow {
  section_key: string;
  section_title: string;
  section_order: number;
  system_prompt: string;
  section_instructions: string | null;
  section_instructions_by_tier: Record<string, string> | null;
  max_tokens: number | null;
  reasoning_effort: string | null;
  tier_complexity: string | null;
  required_context_keys: string[];
  regulatory_frameworks: string[];
  anti_disintermediation_required: boolean;
  applies_to_engagement: "MARKETPLACE" | "AGGREGATOR" | "BOTH";
  applies_to_governance: "QUICK" | "STRUCTURED" | "CONTROLLED" | "ALL";
  is_active: boolean;
}

type TierComplexity = "standard" | "premium" | "enterprise";

async function resolveOrgTier(
  supabaseAdmin: SupabaseClient,
  orgId: string | null | undefined,
): Promise<TierComplexity> {
  if (!orgId) return "standard";
  try {
    const { data } = await supabaseAdmin
      .from("seeker_memberships")
      .select("status")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    return data ? "premium" : "standard";
  } catch {
    return "standard";
  }
}

function pickTierInstructions(
  section: SectionConfigRow,
  tier: TierComplexity,
): string | null {
  const byTier = section.section_instructions_by_tier;
  if (byTier && typeof byTier === "object" && byTier[tier]) {
    return String(byTier[tier]);
  }
  return section.section_instructions;
}

interface SectionAIResult {
  section_key: string;
  section_html: string;
  changes_summary: string;
  confidence: Confidence;
  regulatory_flags: string[];
  requires_human_review: boolean;
}

interface UnifiedAIResult {
  unified_document_html: string;
  sections: SectionAIResult[];
  overall_summary: string;
}

interface HandlePass3Args {
  supabaseAdmin: SupabaseClient;
  userId: string;
  challengeId: string;
  lovableApiKey: string;
  /** Organize-only mode: AI dedupes + harmonises uploaded source clauses into the
   *  11 sections WITHOUT generating new substantive content. Empty sections get
   *  a placeholder. Lower temperature, deterministic output. */
  organizeOnly?: boolean;
}

/** Per-document content cap (chars) — generous to preserve full source clauses. */
const PER_DOC_CONTENT_CAP = 60_000;
/** Aggregate cap across ALL source docs (chars) — drop oldest overflow. */
const TOTAL_SOURCE_CAP = 180_000;

const ORIGIN_LABELS: Record<string, string> = {
  creator: "Creator",
  curator: "Curator",
  lc: "Legal Coordinator",
  platform_template: "Platform default template",
};

const CONFIDENCE_RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function lowestConfidence(sections: SectionAIResult[]): Confidence {
  if (sections.length === 0) return "low";
  let lowest: Confidence = "high";
  for (const s of sections) {
    if (CONFIDENCE_RANK[s.confidence] < CONFIDENCE_RANK[lowest]) lowest = s.confidence;
  }
  return lowest;
}

function dedupeFlags(sections: SectionAIResult[]): string[] {
  const set = new Set<string>();
  for (const s of sections) for (const f of s.regulatory_flags ?? []) set.add(f);
  return [...set];
}

function resolveEngagement(operatingModel: unknown): "MARKETPLACE" | "AGGREGATOR" {
  const v = String(operatingModel ?? "").toUpperCase();
  if (v.includes("AGG")) return "AGGREGATOR";
  return "MARKETPLACE";
}

function resolveGovernance(profile: unknown): "QUICK" | "STRUCTURED" | "CONTROLLED" {
  const raw = String(profile ?? "").toUpperCase().trim();
  if (raw === "QUICK" || raw === "LIGHTWEIGHT") return "QUICK";
  if (raw === "CONTROLLED" || raw === "ENTERPRISE") return "CONTROLLED";
  return "STRUCTURED";
}

function buildSystemPrompt(
  sections: SectionConfigRow[],
  engagement: "MARKETPLACE" | "AGGREGATOR",
  governance: "QUICK" | "STRUCTURED" | "CONTROLLED",
  tier: TierComplexity,
  organizeOnly: boolean,
): string {
  const sectionInstructions = sections
    .map((s, idx) => {
      const tierInstructions = pickTierInstructions(s, tier);
      return `### Section ${idx + 1}: ${s.section_title} (key: ${s.section_key})\n${s.system_prompt}${
        tierInstructions ? `\n\nAdditional instructions: ${tierInstructions}` : ""
      }${
        s.regulatory_frameworks.length > 0
          ? `\n\nApplicable regulatory frameworks: ${s.regulatory_frameworks.join(", ")}`
          : ""
      }`;
    })
    .join("\n\n");

  if (organizeOnly) {
    // ORGANIZE MODE — Merge & deduplicate uploaded source clauses into the
    // configured sections WITHOUT generating new substantive content.
    const sectionList = sections
      .map((s, i) => `${i + 1}. ${s.section_title} [key: ${s.section_key}]`)
      .join("\n");
    return `You are a senior legal document organizer. You will receive source documents uploaded by Creator, Curator, and/or Legal Coordinator, and a fixed list of section_keys for the unified Solution Provider Agreement.

Engagement model: ${engagement}
Governance mode: ${governance}

Your job: produce ONE clean, integrated, professional legal document with the sections below — by reorganizing, deduplicating, and harmonizing what was uploaded. NEVER generate new substantive content.

## ORGANIZE MODE — Mandatory rules
1. Read every clause/paragraph from ALL source documents.
2. For each clause, identify the BEST-FIT section_key from the list and place it there.
3. When MULTIPLE source documents contain clauses covering the SAME topic (e.g., two confidentiality clauses from two uploads): MERGE them into ONE coherent clause that preserves the strongest protections from each source. Use the wording from the most recent / most detailed source as the base. Do NOT include both versions side-by-side.
4. HARMONIZE language across sections so the document reads as ONE professional legal document, not a patchwork of writing styles.
5. Maintain proper legal numbering (1.1, 1.2, etc.) across the entire document.
6. Do NOT generate new substantive content. Only reorganize, merge, and harmonize what was uploaded.
7. If NO source content exists for a section, include the section heading with this exact placeholder paragraph: <p><em>(No source content provided for this section. Add content manually or run AI Pass 3 to generate.)</em></p>
8. Do NOT duplicate content across sections. Pick the single best fit.
9. Do NOT invent new sections beyond the configured list.
10. The output must read as a FINAL terms sheet a Solution Provider would sign — professional, clean, seamless.

## Output formatting (MANDATORY)
- Wrap the entire document in: <div class="legal-doc">...</div>
- Each section uses: <h2>{Section Title}</h2>
- Numbered clauses use: <ol><li>...</li></ol>

## Sections (in order)
${sectionList}

## Output schema
Call the generate_unified_spa tool with:
- unified_document_html: the COMPLETE merged HTML, sections in the order above, with the placeholder paragraph for any section that has no source content.
- sections[]: one entry per section_key with section_html (just that section), changes_summary (e.g. "Merged from {source A} and {source B}" or "(no source content — placeholder)"), confidence (medium|low — never high; this is organize mode, not legal drafting), regulatory_flags ([]), requires_human_review (true if multiple sources were merged or the section is empty).
- overall_summary: 2-3 sentences listing which source documents were merged and which sections remain placeholder-only.`;
  }

  return `You are a senior legal counsel drafting a unified Solution Provider Agreement (SPA) for a global open innovation platform.

Engagement model: ${engagement}
Governance mode: ${governance}
Pricing tier: ${tier} — apply the tier-specific drafting depth in each section's instructions.

You will produce a SINGLE unified HTML document containing every section listed below, in the exact order given.

## Output formatting rules (MANDATORY)
- Wrap the entire document in: <div class="legal-doc">...</div>
- Each section uses: <h2>{Section Title}</h2>
- Numbered clauses use: <ol><li>...</li></ol> (use nested <ol> for sub-clauses)
- Definitions use: <p><strong>"Term"</strong> means ...</p>
- No <html>, <head>, or <body> tags. No markdown. HTML only.

## Source-document merge rules (MANDATORY)
1. Source documents (uploaded by Creator/Curator/LC/Platform) are AUTHORITATIVE — PREFER their wording verbatim where they overlap with what AI would generate. Source content represents the organization's preferred terms.
2. For each clause in a source document, place it in the best-fit section_key from the list below.
3. When source content and AI-generated content cover the same topic, PREFER the source content. Supplement with AI content only for gaps.
4. MERGE overlapping clauses from multiple sources into ONE coherent version — keep the strongest protections, harmonize wording.
5. NEVER duplicate the same topic across sections — pick the single best fit.
6. HARMONIZE language so the document reads as one seamless professional agreement, not a patchwork.
7. Where a source clause overlaps with the section's system_prompt requirements, MERGE intelligently — keep source wording, fill gaps with section requirements.
8. Where source documents conflict, prefer the most recent (later created_at) and flag the conflict in changes_summary.
9. Sections with no relevant source content: generate fresh from the section system_prompt, grounded in challenge facts. The final document must be a complete, signeable terms sheet with ZERO gaps.
10. Reference the SPECIFIC challenge facts (title, IP model, reward amounts and currency, data resources, phase schedule, organization name) — never use generic placeholders like [INSERT NAME].

## Grounding rules (MANDATORY)
- Where a section's required_context_keys are not present in the challenge context, state the assumption explicitly inside the clause.
- Do NOT invent regulatory frameworks. Only cite frameworks listed for that section's applicable jurisdiction.
${
  engagement === "AGGREGATOR"
    ? "- The Anti-Disintermediation section is MANDATORY. Include strong non-circumvention obligations (12 months post-completion, referral fees, audit rights, liquidated damages)."
    : "- Do NOT include an Anti-Disintermediation section (engagement is MARKETPLACE)."
}

## Sections to generate (in order)
${sectionInstructions}

## Output schema
Call the generate_unified_spa tool with:
- unified_document_html: the COMPLETE unified HTML document containing every section above, ready for legal review.
- sections[]: one entry per section with section_key, section_html (just that section's HTML fragment), changes_summary (1-3 sentences), confidence (high|medium|low), regulatory_flags (array of citations actually referenced), and requires_human_review (true if confidence is low or critical assumptions were made).
- overall_summary: 2-4 sentences describing the document's posture and any cross-cutting risks.`;
}

function buildUserPrompt(
  context: Awaited<ReturnType<typeof buildUnifiedContext>>,
  sections: SectionConfigRow[],
  existingDocs: Record<string, unknown>[],
): string {
  const challengeSlim = {
    title: context.challenge.title,
    problem_statement: context.challenge.problem_statement,
    scope: context.challenge.scope,
    deliverables: context.challenge.deliverables,
    ip_model: context.challenge.ip_model,
    maturity_level: context.challenge.maturity_level,
    eligibility: context.challenge.eligibility,
    governance_profile: context.challenge.governance_profile,
    operating_model: context.challenge.operating_model,
    reward_structure: context.challenge.reward_structure,
    evaluation_criteria: context.challenge.evaluation_criteria,
    submission_guidelines: context.challenge.submission_guidelines,
    phase_schedule: context.challenge.phase_schedule,
    data_resources_provided: context.challenge.data_resources_provided,
    solver_eligibility_types: context.challenge.solver_eligibility_types,
  };

  const orgSlim = {
    name: context.org.orgName,
    type: context.org.orgType,
    hqCountry: context.org.hqCountry,
    hqCountryCode: context.org.hqCountryCode,
    industries: context.org.industries,
    operatingModel: context.org.operatingModel,
  };

  // Source documents — apply per-doc cap and aggregate budget. Drop oldest overflow.
  // Sort by created_at ascending (oldest first) so we can drop oldest from the front.
  const sourcesSorted = [...(existingDocs ?? [])].sort((a, b) => {
    const ta = String(a.created_at ?? "");
    const tb = String(b.created_at ?? "");
    return ta.localeCompare(tb);
  });

  const sourceSlim: Array<Record<string, unknown>> = [];
  let runningBytes = 0;
  // Walk newest-first so we keep the most recent uploads when budget runs out.
  for (let i = sourcesSorted.length - 1; i >= 0; i--) {
    const d = sourcesSorted[i];
    const html = typeof d.content_html === "string" ? d.content_html.slice(0, PER_DOC_CONTENT_CAP) : null;
    const summary = typeof d.content_summary === "string" ? d.content_summary.slice(0, PER_DOC_CONTENT_CAP) : null;
    const sizeOf = (html?.length ?? 0) + (summary?.length ?? 0);
    if (runningBytes + sizeOf > TOTAL_SOURCE_CAP && sourceSlim.length > 0) break;
    runningBytes += sizeOf;
    const originRaw = String(d.source_origin ?? "");
    sourceSlim.unshift({
      document_type: d.document_type,
      document_name: d.document_name,
      tier: d.tier,
      source_origin: originRaw,
      uploaded_by: ORIGIN_LABELS[originRaw] ?? "Unknown",
      content_summary: summary,
      content_html: html,
    });
  }

  return `Generate the unified Solution Provider Agreement for the following challenge.

## Challenge
${JSON.stringify(challengeSlim, null, 2)}

## Seeker organization
${JSON.stringify(orgSlim, null, 2)}

## Industry pack (sector intelligence)
${context.industryPack ? JSON.stringify(context.industryPack, null, 2) : "(none)"}

## Geographic / regulatory context
${context.geoContext ? JSON.stringify(context.geoContext, null, 2) : "(none)"}

## Source documents (uploaded by Creator / Curator / Legal Coordinator)
${
  sourceSlim.length > 0
    ? sourceSlim
        .map(
          (d) =>
            `### ${String(d.document_name ?? "(untitled)")} (uploaded by: ${String(d.uploaded_by ?? "Unknown")})\n${
              String(d.content_html ?? d.content_summary ?? "(content pending extraction)")
            }`,
        )
        .join("\n\n---\n\n")
    : "(none — generate from scratch using the section system prompts)"
}

## Section list (in order)
${sections.map((s, i) => `${i + 1}. ${s.section_title} [${s.section_key}]`).join("\n")}

Generate a single unified HTML document covering every section above, in order, grounded in the challenge facts.`;
}

export async function handlePass3({
  supabaseAdmin,
  userId,
  challengeId,
  lovableApiKey,
  organizeOnly = false,
}: HandlePass3Args): Promise<Response> {
  try {
    // 1) Build unified context
    const correlationId = `pass3-${Date.now()}`;
    const context = await buildUnifiedContext(challengeId, correlationId);

    // 2) Resolve engagement & governance from challenge fields
    const engagement = resolveEngagement(context.challenge.operating_model);
    const governance = resolveGovernance(context.challenge.governance_profile);

    // 3) Load section configs (incl. tier columns)
    const { data: configRows, error: configErr } = await supabaseAdmin
      .from("ai_legal_review_config")
      .select(
        "section_key, section_title, section_order, system_prompt, section_instructions, section_instructions_by_tier, max_tokens, reasoning_effort, tier_complexity, required_context_keys, regulatory_frameworks, anti_disintermediation_required, applies_to_engagement, applies_to_governance, is_active",
      )
      .eq("is_active", true)
      .order("section_order", { ascending: true });

    if (configErr) {
      return jsonResponse(
        { success: false, error: { code: "DB_ERROR", message: `Failed to load section config: ${configErr.message}` } },
        500,
      );
    }

    const allSections = (configRows ?? []) as SectionConfigRow[];
    const sections = allSections.filter((s) => {
      const eng = s.applies_to_engagement === "BOTH" || s.applies_to_engagement === engagement;
      const gov = s.applies_to_governance === "ALL" || s.applies_to_governance === governance;
      // Drop anti-disintermediation when engagement is not AGGREGATOR (defense-in-depth on top of applies_to_engagement)
      if (s.section_key === "anti_disintermediation" && engagement !== "AGGREGATOR") return false;
      return eng && gov;
    });

    if (sections.length === 0) {
      return jsonResponse(
        { success: false, error: { code: "NO_SECTIONS", message: "No applicable legal sections for this engagement/governance combination." } },
        400,
      );
    }

    // 4) Load source documents — broadened to include all non-UNIFIED_SPA rows
    //    (SOURCE_DOC uploads from Creator/Curator/LC/Platform).
    const { data: existingDocs } = await supabaseAdmin
      .from("challenge_legal_docs")
      .select("document_type, document_name, tier, content_summary, content_html, status, source_origin, created_at")
      .eq("challenge_id", challengeId)
      .neq("document_type", DOCUMENT_TYPE)
      .order("created_at", { ascending: true });

    if (organizeOnly && (!existingDocs || existingDocs.length === 0)) {
      return jsonResponse(
        { success: false, error: { code: "NO_SOURCE_DOCS", message: "Organize mode requires at least one uploaded source document." } },
        400,
      );
    }

    // 5) Resolve org pricing tier and build prompts.
    const tier = await resolveOrgTier(
      supabaseAdmin,
      (context.challenge.organization_id as string | null | undefined) ?? null,
    );
    const systemPrompt = buildSystemPrompt(sections, engagement, governance, tier, organizeOnly);
    const userPrompt = buildUserPrompt(context, sections, existingDocs ?? []);

    // Tier may bump max_tokens (use highest configured value across sections).
    // Organize mode produces less new content — cap lower for determinism + cost.
    const maxTokens = organizeOnly
      ? 12_288
      : Math.max(
          16_384,
          ...sections.map((s) => Number(s.max_tokens ?? 0)).filter((n) => n > 0),
        );

    const aiResp = await callAIWithFallback(lovableApiKey, {
      max_tokens: maxTokens,
      // Lower temperature in organize mode for deterministic merging.
      temperature: organizeOnly ? 0.1 : 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "generate_unified_spa",
            description: "Return the unified Solution Provider Agreement and per-section metadata.",
            parameters: {
              type: "object",
              properties: {
                unified_document_html: {
                  type: "string",
                  description: "Complete HTML of the unified Solution Provider Agreement, wrapped in <div class=\"legal-doc\">.",
                },
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      section_key: { type: "string" },
                      section_html: { type: "string" },
                      changes_summary: { type: "string" },
                      confidence: { type: "string", enum: ["high", "medium", "low"] },
                      regulatory_flags: { type: "array", items: { type: "string" } },
                      requires_human_review: { type: "boolean" },
                    },
                    required: ["section_key", "section_html", "changes_summary", "confidence", "regulatory_flags", "requires_human_review"],
                    additionalProperties: false,
                  },
                },
                overall_summary: { type: "string" },
              },
              required: ["unified_document_html", "sections", "overall_summary"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "generate_unified_spa" } },
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return jsonResponse({ success: false, error: { code: "RATE_LIMIT", message: "Rate limit exceeded. Please wait." } }, 429);
      }
      if (aiResp.status === 402) {
        return jsonResponse({ success: false, error: { code: "PAYMENT_REQUIRED", message: "AI credits exhausted." } }, 402);
      }
      const errText = await aiResp.text();
      console.error("Pass3 AI gateway error:", aiResp.status, errText);
      return jsonResponse(
        { success: false, error: { code: "AI_ERROR", message: `AI gateway error: ${aiResp.status}` } },
        502,
      );
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return jsonResponse(
        { success: false, error: { code: "AI_ERROR", message: "AI did not return structured output" } },
        502,
      );
    }

    const result = JSON.parse(toolCall.function.arguments) as UnifiedAIResult;
    const aiConfidence = lowestConfidence(result.sections);
    const aiFlags = dedupeFlags(result.sections);

    // 6) Read prior pass3_run_count for THIS unified doc (if any)
    const { data: priorRow } = await supabaseAdmin
      .from("challenge_legal_docs")
      .select("pass3_run_count")
      .eq("challenge_id", challengeId)
      .eq("document_type", DOCUMENT_TYPE)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const priorCount = (priorRow?.pass3_run_count as number | null) ?? 0;

    // 7) Delete prior ai_suggested / stale / organized UNIFIED_SPA rows for this challenge.
    await supabaseAdmin
      .from("challenge_legal_docs")
      .delete()
      .eq("challenge_id", challengeId)
      .eq("document_type", DOCUMENT_TYPE)
      .in("ai_review_status", ["ai_suggested", "stale", "organized"]);

    // 8) Insert new unified row. Status 'organized' marks no-AI-enhancement output.
    const aiReviewStatus = organizeOnly ? "organized" : "ai_suggested";
    const { error: insertErr } = await supabaseAdmin.from("challenge_legal_docs").insert({
      challenge_id: challengeId,
      document_type: DOCUMENT_TYPE,
      document_name: DOCUMENT_NAME,
      tier: TIER,
      status: "ai_suggested",
      ai_review_status: aiReviewStatus,
      content: result.unified_document_html,
      content_html: result.unified_document_html,
      ai_modified_content_html: result.unified_document_html,
      ai_changes_summary: result.overall_summary,
      ai_confidence: aiConfidence,
      ai_regulatory_flags: aiFlags,
      pass3_run_count: priorCount + 1,
      maturity_level: (context.challenge.maturity_level as string | null) ?? null,
      created_by: userId,
      attached_by: userId,
    });

    if (insertErr) {
      console.error("Pass3 insert failed:", insertErr.message);
      return jsonResponse(
        { success: false, error: { code: "DB_ERROR", message: `Failed to persist Pass 3 result: ${insertErr.message}` } },
        500,
      );
    }

    return jsonResponse(
      {
        success: true,
        data: {
          unified_document_html: result.unified_document_html,
          sections: result.sections,
          overall_summary: result.overall_summary,
          ai_confidence: aiConfidence,
          ai_regulatory_flags: aiFlags,
          pass3_run_count: priorCount + 1,
        },
      },
      200,
    );
  } catch (err) {
    console.error("handlePass3 error:", err);
    return jsonResponse(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : "Unknown error" },
      },
      500,
    );
  }
}
