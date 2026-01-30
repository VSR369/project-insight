import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CompileRequest {
  cardId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { cardId } = await req.json() as CompileRequest;

    if (!cardId) {
      return new Response(
        JSON.stringify({ error: "cardId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all layers for this card
    const { data: layers, error: layersError } = await supabase
      .from("pulse_card_layers")
      .select("id, content_text, is_featured, votes_up, votes_down, created_at")
      .eq("card_id", cardId)
      .eq("status", "active")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: true });

    if (layersError) {
      console.error("Error fetching layers:", layersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch contributions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!layers || layers.length === 0) {
      return new Response(
        JSON.stringify({ error: "No contributions found for this card" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If only one contribution, return it as-is
    if (layers.length === 1) {
      const compiled_narrative = layers[0].content_text;
      
      // Update the card with the narrative
      await supabase
        .from("pulse_cards")
        .update({
          compiled_narrative,
          compiled_at: new Date().toISOString(),
          compilation_stale: false,
        })
        .eq("id", cardId);

      return new Response(
        JSON.stringify({ compiled_narrative }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sort by: featured first, then by vote score, then by date
    const sortedLayers = [...layers].sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      const scoreA = (a.votes_up || 0) - (a.votes_down || 0);
      const scoreB = (b.votes_up || 0) - (b.votes_down || 0);
      return scoreB - scoreA;
    });

    // Build contributions text for AI
    const contributions = sortedLayers.map((l, i) => `[${i + 1}] "${l.content_text}"`).join("\n");

    // AI synthesis prompt
    const synthesisPrompt = `You are a technical editor for an industry knowledge base. 
Combine the following contributions into ONE coherent, professional paragraph.

RULES:
- Preserve all key insights and unique information from each contribution
- Remove redundancy and repetition
- Fix grammar and improve flow
- Maintain professional, clear tone
- Keep the output under 600 characters
- Do NOT add information not present in the contributions
- Do NOT use bullet points - write in flowing prose
- Output ONLY the synthesized paragraph, no quotes or additional text

CONTRIBUTIONS:
${contributions}

OUTPUT:`;

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      // Fallback: return featured/first contribution
      const fallback = sortedLayers[0].content_text;
      return new Response(
        JSON.stringify({ 
          compiled_narrative: fallback,
          fallback: true,
          reason: "AI synthesis unavailable"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a professional technical editor. Output only the synthesized text, nothing else." },
          { role: "user", content: synthesisPrompt }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fallback to featured contribution
      const fallback = sortedLayers[0].content_text;
      return new Response(
        JSON.stringify({ 
          compiled_narrative: fallback,
          fallback: true,
          reason: "AI synthesis failed"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    let compiled_narrative = aiData.choices?.[0]?.message?.content?.trim();

    if (!compiled_narrative) {
      // Fallback
      compiled_narrative = sortedLayers[0].content_text;
    }

    // Ensure under 600 chars
    if (compiled_narrative.length > 600) {
      compiled_narrative = compiled_narrative.substring(0, 597) + "...";
    }

    // Update the card with the compiled narrative
    const { error: updateError } = await supabase
      .from("pulse_cards")
      .update({
        compiled_narrative,
        compiled_at: new Date().toISOString(),
        compilation_stale: false,
      })
      .eq("id", cardId);

    if (updateError) {
      console.error("Error updating card:", updateError);
    }

    return new Response(
      JSON.stringify({ compiled_narrative }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Compile narrative error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
