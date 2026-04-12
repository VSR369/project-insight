/**
 * Enhance Pulse Content Edge Function
 * Uses Lovable AI Gateway to enhance captions, extract statistics, and improve content
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAIWithFallback } from "../_shared/aiModelConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EnhanceRequest {
  content_type: 'reel' | 'post' | 'gallery' | 'article' | 'podcast';
  original_text: string;
  industry?: string;
  enhancement_type?: 'professional' | 'engaging' | 'statistics';
}

interface EnhanceResponse {
  enhanced_text: string;
  extracted_statistics: string[];
  suggestions: string[];
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

    const { content_type, original_text, industry, enhancement_type = 'professional' } = await req.json() as EnhanceRequest;

    if (!original_text || original_text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "original_text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert content editor for a professional social network. Your task is to enhance user content while preserving their authentic voice.

Enhancement guidelines based on type:
- professional: Improve grammar, add industry terminology, make it sound authoritative
- engaging: Add hooks, questions, and call-to-actions to boost engagement
- statistics: Extract or add relevant statistics and data points

Content type being enhanced: ${content_type}
${industry ? `Industry context: ${industry}` : ''}

IMPORTANT:
- Keep the core message intact
- Match the tone to the content type (reels = casual, articles = formal)
- Maximum 3 sentences for captions, preserve length for articles
- Extract any statistics (percentages, numbers, trends) into a separate list

When providing feedback on reward structures, evaluation criteria, scoring, or any structured data, return a JSON object using these schemas:

For monetary/prize data:
{"type":"monetary","description":"...","milestones":[{"name":"...","percentage":0}],"reward_distribution":{"platinum":"$X","gold":"$Y","silver":"$Z"},"tiered_perks":{"platinum":["..."],"gold":["..."],"silver":["..."]}}

For evaluation/scoring:
{"type":"evaluation","overall_score":82,"max_score":100,"grade":"A","feedback":"...","criteria":[{"name":"...","score":18,"max":20,"comment":"..."}],"recommendation":"..."}`;

    const userPrompt = `Enhance this ${content_type} ${enhancement_type === 'statistics' ? 'and extract statistics from' : 'caption'}: "${original_text}"

Return a JSON object with:
1. enhanced_text: The improved version
2. extracted_statistics: Array of statistics/data points found or suggested
3. suggestions: Array of 2-3 alternative phrasings`;

    const response = await callAIWithFallback(LOVABLE_API_KEY, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "enhanced_content",
          schema: {
            type: "object",
            properties: {
              enhanced_text: { type: "string" },
              extracted_statistics: {
                type: "array",
                items: { type: "string" }
              },
              suggestions: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["enhanced_text", "extracted_statistics", "suggestions"],
            additionalProperties: false
          }
        }
      }
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
    let result: EnhanceResponse;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Fallback: return original with empty stats
      result = {
        enhanced_text: original_text,
        extracted_statistics: [],
        suggestions: [],
      };
    }

    console.log("Content enhanced successfully for:", content_type);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("enhance-pulse-content error:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
