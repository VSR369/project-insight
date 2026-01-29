/**
 * Generate Spark Insights Edge Function
 * Uses Lovable AI Gateway to generate industry-specific knowledge sparks
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SparkRequest {
  industry: string;
  topic?: string;
  context?: string;
}

interface SparkSuggestion {
  headline: string;
  key_insight: string;
  suggested_source?: string;
  statistic?: string;
}

interface SparkResponse {
  suggestions: SparkSuggestion[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { industry, topic, context } = await req.json() as SparkRequest;

    if (!industry || industry.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "industry is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert industry analyst creating Knowledge Sparks - bite-sized professional insights for a social network.

Each spark must be:
- Headline: Max 50 characters, punchy and attention-grabbing
- Key Insight: Max 200 characters, actionable and data-driven
- Include a real or realistic statistic when possible
- Suggest a credible source (report, study, publication)

Focus on the ${industry} industry. Create insights that professionals would find valuable and share-worthy.

${topic ? `Focus area: ${topic}` : ''}
${context ? `Additional context: ${context}` : ''}`;

    const userPrompt = `Generate 3 different Knowledge Spark suggestions for ${industry} professionals. Each should have a unique angle: one trend-focused, one tip-focused, and one stat-focused.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        temperature: 0.8,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "spark_suggestions",
            schema: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      headline: { type: "string" },
                      key_insight: { type: "string" },
                      suggested_source: { type: "string" },
                      statistic: { type: "string" }
                    },
                    required: ["headline", "key_insight"],
                    additionalProperties: false
                  }
                }
              },
              required: ["suggestions"],
              additionalProperties: false
            }
          }
        }
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error("AI Gateway error:", status, errorText);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI Gateway returned ${status}: ${errorText}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content returned from AI");
    }

    // Parse the JSON response
    let result: SparkResponse;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      result = { suggestions: [] };
    }

    // Validate and truncate if needed
    result.suggestions = result.suggestions.map(s => ({
      headline: s.headline?.substring(0, 50) || '',
      key_insight: s.key_insight?.substring(0, 200) || '',
      suggested_source: s.suggested_source,
      statistic: s.statistic,
    })).filter(s => s.headline && s.key_insight);

    console.log(`Generated ${result.suggestions.length} spark suggestions for ${industry}`);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("generate-spark-insights error:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
