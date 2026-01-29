import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all provider stats
    const { data: stats, error: statsError } = await supabase
      .from("pulse_provider_stats")
      .select("provider_id, total_xp, current_level, current_streak");

    if (statsError) {
      throw new Error(`Failed to fetch stats: ${statsError.message}`);
    }

    if (!stats || stats.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No stats to snapshot", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create snapshots for today
    const today = new Date().toISOString().split("T")[0];
    const snapshots = stats.map((s) => ({
      provider_id: s.provider_id,
      snapshot_date: today,
      total_xp: s.total_xp,
      level: s.current_level,
      streak: s.current_streak,
    }));

    // Upsert snapshots (update if already exists for today)
    const { error: insertError, count } = await supabase
      .from("pulse_xp_snapshots")
      .upsert(snapshots, { 
        onConflict: "provider_id,snapshot_date",
        count: "exact"
      });

    if (insertError) {
      throw new Error(`Failed to create snapshots: ${insertError.message}`);
    }

    console.log(`Created ${count} XP snapshots for ${today}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${count} snapshots`, 
        date: today,
        count 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error creating XP snapshots:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
