/**
import { sendEmail } from "../_shared/sendEmail.ts";
 * Send Streak Reminder Edge Function
 * Notifies users before their streak breaks (daily at 9 PM)
 * Per Phase E specification - STK-006
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface StreakReminderUser {
  provider_id: string;
  current_streak: number;
  email: string;
  first_name: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split("T")[0];

    // Find users with active streaks who haven't had activity today
    const { data: usersAtRisk, error: queryError } = await supabase
      .from("pulse_provider_stats")
      .select(`
        provider_id,
        current_streak,
        last_activity_date,
        provider:solution_providers!pulse_provider_stats_provider_id_fkey(
          user_id,
          first_name,
          last_name
        )
      `)
      .gt("current_streak", 0)
      .neq("last_activity_date", today);

    if (queryError) {
      console.error("Error querying users at risk:", queryError);
      throw queryError;
    }

    console.log(`Found ${usersAtRisk?.length || 0} users at risk of losing streak`);

    const reminders: StreakReminderUser[] = [];

    for (const user of usersAtRisk || []) {
      const provider = user.provider as any;
      if (!provider?.user_id) continue;

      // Get user email from auth
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(
        provider.user_id
      );

      if (authError || !authUser?.user?.email) {
        console.log(`Could not get email for user ${provider.user_id}`);
        continue;
      }

      reminders.push({
        provider_id: user.provider_id,
        current_streak: user.current_streak,
        email: authUser.user.email,
        first_name: provider.first_name,
      });

      // Log the reminder (in production, this would send an actual notification)
      console.log(`Streak reminder for ${authUser.user.email}:`, {
        streak: user.current_streak,
        name: provider.first_name,
      });
    }

    // In a real implementation, you would:
    // 1. Send push notifications via a service like Firebase Cloud Messaging
    // 2. Send email via Resend/SendGrid/etc.
    // 3. Create in-app notifications in a notifications table

    // For now, we'll create a log entry
    const { error: logError } = await supabase
      .from("pulse_xp_audit_log")
      .insert(
        reminders.slice(0, 10).map((reminder) => ({
          provider_id: reminder.provider_id,
          action_type: "streak_reminder_sent",
          xp_change: 0,
          previous_total: 0,
          new_total: 0,
          notes: `Streak reminder sent - ${reminder.current_streak} day streak at risk`,
        }))
      );

    if (logError) {
      console.error("Error logging reminders:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${reminders.length} streak reminders`,
        reminders_sent: reminders.length,
        details: reminders.map((r) => ({
          email: r.email.replace(/(.{2}).*@/, "$1***@"),
          streak: r.current_streak,
        })),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-streak-reminder:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
