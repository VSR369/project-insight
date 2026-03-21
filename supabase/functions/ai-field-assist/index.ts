import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIELD_PROMPTS: Record<string, string> = {
  problem_statement: `Draft a clear, detailed problem statement for an innovation challenge. Include what the problem is, why it matters, what has been tried before, and what constraints exist. Write in professional tone, 300-500 words.`,
  scope: `Define the scope boundaries for this innovation challenge. Specify what is in-scope and out-of-scope. Be specific about technical, geographic, and temporal boundaries.`,
  hook: `Write a compelling 1-2 sentence hook/tagline for this innovation challenge that would attract top solvers. Make it exciting and specific.`,
  evaluation_criteria: `Generate 4-5 evaluation criteria for this innovation challenge. Return a JSON array of objects with "name" (string), "weight" (number, sum to 100), and "description" (string). Example criteria: Technical Approach, Feasibility, Innovation, Cost-Effectiveness, Scalability.`,
  eligibility: `Suggest eligibility requirements for solvers participating in this innovation challenge. Consider technical expertise, domain experience, and any certifications or qualifications needed.`,
  deliverables: `Suggest 4-6 specific deliverables that solvers should provide for this innovation challenge. Each should be actionable and measurable.`,
  expected_outcomes: `Draft expected outcomes for this innovation challenge. What specific results should the solution achieve? Include measurable success criteria.`,
  description: `Write a concise challenge description (2-3 paragraphs) that summarizes the challenge for potential solvers.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "CONFIG_ERROR", message: "LOVABLE_API_KEY not configured" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { field_name, context } = await req.json();

    if (!field_name || !FIELD_PROMPTS[field_name]) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: `Unknown field: ${field_name}` } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert innovation challenge designer. Help draft high-quality challenge specifications. Be specific, professional, and actionable. Do not use markdown formatting unless explicitly asked.

When providing feedback on reward structures, evaluation criteria, scoring, or any structured data, return a JSON object using these schemas:

For monetary/prize data:
{"type":"monetary","description":"...","milestones":[{"name":"...","percentage":0}],"reward_distribution":{"platinum":"$X","gold":"$Y","silver":"$Z"},"tiered_perks":{"platinum":["..."],"gold":["..."],"silver":["..."]}}

For evaluation/scoring:
{"type":"evaluation","overall_score":82,"max_score":100,"grade":"A","feedback":"...","criteria":[{"name":"...","score":18,"max":20,"comment":"..."}],"recommendation":"..."}`;

    const contextParts = [];
    if (context?.title) contextParts.push(`Challenge Title: ${context.title}`);
    if (context?.problem_statement) contextParts.push(`Problem Statement: ${context.problem_statement}`);
    if (context?.maturity_level) contextParts.push(`Maturity Level: ${context.maturity_level}`);
    if (context?.governance_mode) contextParts.push(`Governance Mode: ${context.governance_mode}`);
    if (context?.industry) contextParts.push(`Industry: ${context.industry}`);

    const userPrompt = contextParts.length > 0
      ? `Given this challenge context:\n${contextParts.join('\n')}\n\n${FIELD_PROMPTS[field_name]}`
      : FIELD_PROMPTS[field_name];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "RATE_LIMIT", message: "AI is busy. Please wait a moment and try again." } }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "CREDITS_EXHAUSTED", message: "AI credits exhausted. Contact support." } }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      return new Response(
        JSON.stringify({ success: false, error: { code: "AI_ERROR", message: "AI generation failed" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content ?? "";

    return new Response(
      JSON.stringify({ success: true, data: { field_name, content } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ai-field-assist error:", error);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
