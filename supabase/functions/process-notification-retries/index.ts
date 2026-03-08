/**
 * process-notification-retries — MOD-04 Edge Function
 * BR-MPA-046: Automated retry processor for failed email notifications.
 * Called by pg_cron every 15 minutes.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Fetch pending retries that are due
    const now = new Date().toISOString();
    const { data: pending, error: fetchErr } = await supabaseAdmin
      .from("notification_retry_queue")
      .select("id, notification_audit_log_id, recipient_email, notification_type, verification_id, retry_count, max_attempts, last_error")
      .eq("status", "pending")
      .lte("next_retry_at", now)
      .order("next_retry_at", { ascending: true })
      .limit(100);

    if (fetchErr) throw fetchErr;
    if (!pending || pending.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let processed = 0;
    let exhausted = 0;

    for (const entry of pending) {
      // Mark as in_progress
      await supabaseAdmin
        .from("notification_retry_queue")
        .update({ status: "in_progress", updated_at: now })
        .eq("id", entry.id);

      const newRetryCount = entry.retry_count + 1;
      const isExhausted = newRetryCount >= entry.max_attempts;

      // Simulate email send attempt (replace with actual Resend call in production)
      let sendSuccess = false;
      let sendError = "";
      try {
        // In production, call Resend API here
        // For now, simulate success for non-exhausted, fail for testing
        sendSuccess = true;
      } catch (e) {
        sendError = (e as Error).message;
      }

      if (sendSuccess) {
        // Success: update audit log and complete retry
        await supabaseAdmin
          .from("notification_audit_log")
          .update({ email_status: "SENT", updated_at: now })
          .eq("id", entry.notification_audit_log_id);

        await supabaseAdmin
          .from("notification_retry_queue")
          .update({ status: "completed", retry_count: newRetryCount, updated_at: now })
          .eq("id", entry.id);

      } else if (isExhausted) {
        // Exhausted: mark as exhausted and alert supervisors
        await supabaseAdmin
          .from("notification_audit_log")
          .update({
            email_status: "EXHAUSTED",
            email_error_message: sendError || entry.last_error,
            email_retry_count: newRetryCount,
            updated_at: now,
          })
          .eq("id", entry.notification_audit_log_id);

        await supabaseAdmin
          .from("notification_retry_queue")
          .update({
            status: "exhausted",
            retry_count: newRetryCount,
            last_error: sendError,
            updated_at: now,
          })
          .eq("id", entry.id);

        // Alert all supervisors
        const { data: supervisors } = await supabaseAdmin
          .from("platform_admin_profiles")
          .select("id")
          .eq("admin_tier", "supervisor");

        if (supervisors && supervisors.length > 0) {
          const notifications = supervisors.map((s: { id: string }) => ({
            admin_id: s.id,
            type: "EMAIL_FAIL",
            title: "Email Delivery Exhausted",
            body: `All retry attempts failed for ${entry.recipient_email} (${entry.notification_type}). Manual intervention required.`,
            deep_link: "/admin/notifications/audit",
          }));
          await supabaseAdmin.from("admin_notifications").insert(notifications);
        }

        exhausted++;
      } else {
        // Schedule next retry (+15 min)
        const nextRetry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await supabaseAdmin
          .from("notification_audit_log")
          .update({
            email_status: "RETRY_QUEUED",
            email_retry_count: newRetryCount,
            last_retry_at: now,
            updated_at: now,
          })
          .eq("id", entry.notification_audit_log_id);

        await supabaseAdmin
          .from("notification_retry_queue")
          .update({
            status: "pending",
            retry_count: newRetryCount,
            next_retry_at: nextRetry,
            last_error: sendError,
            updated_at: now,
          })
          .eq("id", entry.id);
      }

      processed++;
    }

    return new Response(
      JSON.stringify({ success: true, processed, exhausted }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Retry processor error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
