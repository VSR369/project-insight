import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Loot box reward tiers based on streak multiplier
const LOOT_TIERS = {
  common: { xp: [10, 25], gold: [0, 1], weight: 60 },
  uncommon: { xp: [25, 50], gold: [1, 2], weight: 25 },
  rare: { xp: [50, 100], gold: [2, 5], weight: 12 },
  epic: { xp: [100, 200], gold: [5, 10], weight: 3 },
};

function rollLootTier(): keyof typeof LOOT_TIERS {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const [tier, config] of Object.entries(LOOT_TIERS)) {
    cumulative += config.weight;
    if (roll <= cumulative) return tier as keyof typeof LOOT_TIERS;
  }
  return "common";
}

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // Get provider ID for this user
    const { data: provider, error: providerError } = await supabase
      .from("solution_providers")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (providerError || !provider) {
      return new Response(
        JSON.stringify({ error: "Provider not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get provider stats with streak
    const { data: stats, error: statsError } = await supabase
      .from("pulse_provider_stats")
      .select("current_streak, gold_tokens, last_loot_box_claimed_at")
      .eq("provider_id", provider.id)
      .single();

    if (statsError) {
      return new Response(
        JSON.stringify({ error: "Stats not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if loot box already claimed today
    const today = new Date().toISOString().split("T")[0];
    const lastClaimed = stats.last_loot_box_claimed_at?.split("T")[0];

    if (lastClaimed === today) {
      return new Response(
        JSON.stringify({ 
          error: "Loot box already claimed today",
          next_available: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for updates
    const supabaseService = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Calculate streak multiplier
    const { data: multiplier } = await supabaseService.rpc("pulse_get_streak_multiplier", {
      p_streak: stats.current_streak || 0,
    });

    const streakMultiplier = multiplier || 1.0;

    // Roll for loot tier
    const tier = rollLootTier();
    const tierConfig = LOOT_TIERS[tier];

    // Calculate rewards with multiplier
    const baseXp = randomInRange(tierConfig.xp[0], tierConfig.xp[1]);
    const baseGold = randomInRange(tierConfig.gold[0], tierConfig.gold[1]);
    
    const finalXp = Math.round(baseXp * streakMultiplier);
    const finalGold = Math.round(baseGold * streakMultiplier);

    // Award XP
    await supabaseService.rpc("pulse_award_xp", {
      p_provider_id: provider.id,
      p_xp_amount: finalXp,
      p_action_type: "loot_box",
      p_reference_type: tier,
      p_notes: `Loot box (${tier}) with ${streakMultiplier}x streak multiplier`,
    });

    // Award gold tokens
    const newGoldTotal = Math.min(1000, (stats.gold_tokens || 0) + finalGold);
    
    await supabaseService
      .from("pulse_provider_stats")
      .update({
        gold_tokens: newGoldTotal,
        last_loot_box_claimed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("provider_id", provider.id);

    // Record loot box claim
    await supabaseService
      .from("pulse_loot_box_claims")
      .insert({
        provider_id: provider.id,
        tier,
        xp_reward: finalXp,
        gold_reward: finalGold,
        streak_multiplier: streakMultiplier,
      });

    console.log(`Provider ${provider.id} claimed ${tier} loot box: ${finalXp} XP, ${finalGold} gold`);

    return new Response(
      JSON.stringify({
        success: true,
        tier,
        rewards: {
          xp: finalXp,
          gold: finalGold,
        },
        streak_multiplier: streakMultiplier,
        current_streak: stats.current_streak || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error claiming loot box:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
