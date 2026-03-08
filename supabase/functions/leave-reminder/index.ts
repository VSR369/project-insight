import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Leave Reminder Edge Function (MOD-01 / MOD-06)
 *
 * Called by pg_cron daily. Reads `leave_reminder_lead_time_days` from
 * md_mpa_config and sends LEAVE_REMINDER notifications to admins whose
 * scheduled leave starts within that window.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Read lead time config
    const { data: configRow } = await supabaseAdmin
      .from("md_mpa_config")
      .select("param_value")
      .eq("param_key", "leave_reminder_lead_time_days")
      .maybeSingle();

    const leadTimeDays = parseInt(configRow?.param_value ?? "3", 10);

    // Calculate the date window: admins whose leave_start_date is exactly `leadTimeDays` from now
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + leadTimeDays);
    const targetDateStr = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD

    // Find admins with scheduled leave starting on target date
    // who have availability_status = 'available' (haven't gone on leave yet)
    const { data: admins, error: adminErr } = await supabaseAdmin
      .from("platform_admin_profiles")
      .select("id, full_name, leave_start_date, leave_end_date")
      .eq("availability_status", "available")
      .gte("leave_start_date", `${targetDateStr}T00:00:00Z`)
      .lt("leave_start_date", `${targetDateStr}T23:59:59Z`);

    if (adminErr) throw adminErr;
    if (!admins || admins.length === 0) {
      return new Response(
        JSON.stringify({ success: true, reminders_sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Also get supervisors to notify them
    const { data: supervisors } = await supabaseAdmin
      .from("platform_admin_profiles")
      .select("id")
      .eq("admin_tier", "supervisor");

    const supervisorIds = (supervisors ?? []).map((s: { id: string }) => s.id);

    const notifications: Array<{
      admin_id: string;
      type: string;
      title: string;
      body: string;
      deep_link: string;
      metadata: Record<string, unknown>;
    }> = [];

    for (const admin of admins) {
      const leaveStart = admin.leave_start_date
        ? new Date(admin.leave_start_date).toLocaleDateString()
        : "soon";

      // Notify the admin themselves
      notifications.push({
        admin_id: admin.id,
        type: "LEAVE_REMINDER",
        title: `Leave Reminder: ${leadTimeDays} day(s) until your scheduled leave`,
        body: `Your scheduled leave begins on ${leaveStart}. Please ensure all active verifications are reassigned or completed before your leave starts.`,
        deep_link: `/admin/my-profile`,
        metadata: {
          leave_start_date: admin.leave_start_date,
          leave_end_date: admin.leave_end_date,
          lead_time_days: leadTimeDays,
        },
      });

      // Notify supervisors
      for (const supId of supervisorIds) {
        if (supId === admin.id) continue; // Don't double-notify if admin is also a supervisor
        notifications.push({
          admin_id: supId,
          type: "LEAVE_REMINDER",
          title: `Leave Reminder: ${admin.full_name}`,
          body: `${admin.full_name}'s scheduled leave begins on ${leaveStart} (${leadTimeDays} day(s) away). Review their active verifications.`,
          deep_link: `/admin/platform-admins`,
          metadata: {
            admin_id: admin.id,
            admin_name: admin.full_name,
            leave_start_date: admin.leave_start_date,
            lead_time_days: leadTimeDays,
          },
        });
      }
    }

    if (notifications.length > 0) {
      const { error: insertErr } = await supabaseAdmin
        .from("admin_notifications")
        .insert(notifications);
      if (insertErr) throw insertErr;
    }

    return new Response(
      JSON.stringify({ success: true, reminders_sent: admins.length, notifications_created: notifications.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Leave reminder error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
