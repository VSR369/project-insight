import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * suggest-taxonomy-tags Edge Function (GAP-11)
 *
 * Accepts a text snippet (problem statement) and returns matching
 * taxonomy tags from industry_segments, sub_domains, and specialities.
 * Uses case-insensitive ILIKE text matching.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.length < 50) {
      return new Response(
        JSON.stringify({ success: true, data: { suggestions: [] } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract significant words (3+ chars, skip stopwords)
    const STOPWORDS = new Set([
      "the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
      "her", "was", "one", "our", "out", "has", "have", "been", "from",
      "with", "they", "will", "each", "make", "this", "that", "than",
      "them", "then", "what", "when", "which", "who", "how", "its",
      "also", "into", "more", "most", "must", "need", "should", "would",
      "could", "about", "over", "such", "very", "just", "like", "some",
      "other", "being", "using", "through",
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w: string) => w.length >= 3 && !STOPWORDS.has(w));

    const uniqueWords = [...new Set(words)].slice(0, 20); // Cap at 20 keywords

    if (uniqueWords.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: { suggestions: [] } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service_role for broader read access on master data
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Query industry_segments for matches
    const suggestions: Array<{ tag: string; source: string; relevance: number }> = [];

    const { data: segments } = await supabaseAdmin
      .from("industry_segments")
      .select("id, name")
      .eq("is_active", true)
      .limit(100);

    if (segments) {
      for (const seg of segments) {
        const segNameLower = seg.name.toLowerCase();
        let matchCount = 0;
        for (const w of uniqueWords) {
          if (segNameLower.includes(w) || w.includes(segNameLower.split(" ")[0])) {
            matchCount++;
          }
        }
        if (matchCount > 0) {
          suggestions.push({
            tag: seg.name,
            source: "industry_segment",
            relevance: matchCount,
          });
        }
      }
    }

    // Query proficiency_areas (sub-domains)
    const { data: areas } = await supabaseAdmin
      .from("proficiency_areas")
      .select("id, name")
      .eq("is_active", true)
      .limit(200);

    if (areas) {
      for (const area of areas) {
        const areaNameLower = area.name.toLowerCase();
        let matchCount = 0;
        for (const w of uniqueWords) {
          if (areaNameLower.includes(w) || w.includes(areaNameLower.split(" ")[0])) {
            matchCount++;
          }
        }
        if (matchCount > 0) {
          suggestions.push({
            tag: area.name,
            source: "proficiency_area",
            relevance: matchCount,
          });
        }
      }
    }

    // Sort by relevance descending, deduplicate, cap at 10
    const seen = new Set<string>();
    const dedupedSuggestions = suggestions
      .sort((a, b) => b.relevance - a.relevance)
      .filter((s) => {
        const key = s.tag.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 10);

    return new Response(
      JSON.stringify({ success: true, data: { suggestions: dedupedSuggestions } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Taxonomy suggestion error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
