import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendEmail } from "../_shared/sendEmail.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PendingApproval {
  provider_id: string;
  provider_first_name: string;
  provider_last_name: string;
  org_name: string;
  manager_email: string;
  manager_name: string;
  credentials_expire_at: string;
  designation: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[send-manager-reminder] Starting reminder check...");

    // Get all pending approvals with their expiry dates
    const { data: pendingApprovals, error: fetchError } = await supabase
      .from("provider_industry_enrollments")
      .select(`
        provider_id,
        organization
      `)
      .not("organization", "is", null);

    if (fetchError) {
      console.error("[send-manager-reminder] Fetch error:", fetchError);
      throw new Error(fetchError.message);
    }

    // Filter to pending approvals
    const pending: PendingApproval[] = [];
    for (const enrollment of pendingApprovals || []) {
      const org = enrollment.organization as any;
      if (org?.approval_status === "pending" && org?.credentials_expire_at && org?.manager_email) {
        // Get provider info
        const { data: provider } = await supabase
          .from("solution_providers")
          .select("first_name, last_name")
          .eq("id", enrollment.provider_id)
          .single();

        if (provider) {
          pending.push({
            provider_id: enrollment.provider_id,
            provider_first_name: provider.first_name || "",
            provider_last_name: provider.last_name || "",
            org_name: org.org_name,
            manager_email: org.manager_email,
            manager_name: org.manager_name || "Manager",
            credentials_expire_at: org.credentials_expire_at,
            designation: org.designation,
          });
        }
      }
    }

    console.log(`[send-manager-reminder] Found ${pending.length} pending approvals`);

    const now = new Date();
    const appUrl = "https://id-preview--850a8bf8-9f37-46d4-bdd1-6ed1d177ac44.lovable.app";
    
    let remindersSent = 0;
    const results: { email: string; daysRemaining: number; success: boolean }[] = [];

    for (const approval of pending) {
      const expiresAt = new Date(approval.credentials_expire_at);
      const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Send reminders at day 7 and day 12 (3 days before expiry)
      const shouldSendReminder = daysRemaining === 8 || daysRemaining === 3;

      if (shouldSendReminder) {
        console.log(`[send-manager-reminder] Sending reminder to ${approval.manager_email}, ${daysRemaining} days remaining`);

        const urgency = daysRemaining <= 3 ? "URGENT: " : "";
        const urgencyNote = daysRemaining <= 3 
          ? "⚠️ Your credentials will expire soon! Please take action immediately."
          : "Please review and respond at your earliest convenience.";

        try {
          await resend.emails.send({
            from: "CogniBlend <onboarding@resend.dev>",
            to: [approval.manager_email],
            subject: `${urgency}Reminder: Approve ${approval.provider_first_name}'s Request (${daysRemaining} days remaining)`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">Hello ${approval.manager_name},</h1>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6;">
                  This is a reminder that <strong>${approval.provider_first_name} ${approval.provider_last_name}</strong>
                  ${approval.designation ? ` (${approval.designation})` : ''} 
                  is waiting for your approval to join <strong>CogniBlend</strong> representing 
                  <strong>${approval.org_name}</strong>.
                </p>
                
                <div style="background: ${daysRemaining <= 3 ? '#fff3cd' : '#e7f3ff'}; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${daysRemaining <= 3 ? '#ffc107' : '#0d6efd'};">
                  <p style="margin: 0; font-weight: 500; color: ${daysRemaining <= 3 ? '#856404' : '#0a58ca'};">
                    ${urgencyNote}
                  </p>
                  <p style="margin: 8px 0 0 0; color: #555;">
                    <strong>${daysRemaining} days remaining</strong> until credentials expire.
                  </p>
                </div>
                
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${appUrl}/manager-portal" 
                     style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                    Review Request Now
                  </a>
                </div>
                
                <p style="color: #888; font-size: 14px; margin-top: 24px;">
                  If you have questions, please contact support@cogniblend.com
                </p>
                
                <p style="color: #555; font-size: 16px; margin-top: 24px;">
                  Best regards,<br>
                  <strong>The CogniBlend Team</strong>
                </p>
              </div>
            `,
          });

          remindersSent++;
          results.push({ email: approval.manager_email, daysRemaining, success: true });
        } catch (emailError: any) {
          console.error(`[send-manager-reminder] Failed to send to ${approval.manager_email}:`, emailError);
          results.push({ email: approval.manager_email, daysRemaining, success: false });
        }
      }
    }

    console.log(`[send-manager-reminder] Completed. Sent ${remindersSent} reminders.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        remindersSent,
        pendingCount: pending.length,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[send-manager-reminder] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
