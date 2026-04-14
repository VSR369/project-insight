import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendEmail } from "../_shared/sendEmail.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[auto-decline-expired] Starting expiry check...");

    const now = new Date().toISOString();

    // Get all pending approvals where credentials have expired
    const { data: enrollments, error: fetchError } = await supabase
      .from("provider_industry_enrollments")
      .select(`
        id,
        provider_id,
        organization
      `)
      .not("organization", "is", null);

    if (fetchError) {
      console.error("[auto-decline-expired] Fetch error:", fetchError);
      throw new Error(fetchError.message);
    }

    let expiredCount = 0;
    const expiredEnrollments: { 
      enrollmentId: string; 
      providerId: string; 
      orgName: string;
      providerEmail: string;
      providerName: string;
    }[] = [];

    for (const enrollment of enrollments || []) {
      const org = enrollment.organization as any;
      
      // Check if pending and expired
      if (
        org?.approval_status === "pending" && 
        org?.credentials_expire_at && 
        new Date(org.credentials_expire_at) < new Date()
      ) {
        // Get provider info for notification
        const { data: provider } = await supabase
          .from("solution_providers")
          .select("first_name, last_name, user_id")
          .eq("id", enrollment.provider_id)
          .single();

        let providerEmail = "";
        if (provider?.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("user_id", provider.user_id)
            .single();
          providerEmail = profile?.email || "";
        }

        // Update organization status to expired
        const updatedOrg = {
          ...org,
          approval_status: "expired",
          expired_at: now,
          manager_temp_password_hash: null, // Clear credentials
        };

        const { error: updateError } = await supabase
          .from("provider_industry_enrollments")
          .update({ 
            organization: updatedOrg,
            updated_at: now,
          })
          .eq("id", enrollment.id);

        if (updateError) {
          console.error(`[auto-decline-expired] Failed to update enrollment ${enrollment.id}:`, updateError);
          continue;
        }

        expiredCount++;
        expiredEnrollments.push({
          enrollmentId: enrollment.id,
          providerId: enrollment.provider_id,
          orgName: org.org_name || "Unknown Organization",
          providerEmail,
          providerName: provider ? `${provider.first_name} ${provider.last_name}` : "Provider",
        });

        console.log(`[auto-decline-expired] Expired enrollment ${enrollment.id} for org ${org.org_name}`);
      }
    }

    // Send notification emails to providers whose approvals expired
    const appUrl = "https://id-preview--850a8bf8-9f37-46d4-bdd1-6ed1d177ac44.lovable.app";
    
    for (const expired of expiredEnrollments) {
      if (expired.providerEmail) {
        try {
          await resend.emails.send({
            from: "CogniBlend <onboarding@resend.dev>",
            to: [expired.providerEmail],
            subject: `Manager Approval Request Expired for ${expired.orgName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">Hello ${expired.providerName},</h1>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6;">
                  Unfortunately, your manager approval request for <strong>${expired.orgName}</strong> 
                  has expired without a response.
                </p>
                
                <div style="background: #f8d7da; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
                  <p style="margin: 0; font-weight: 500; color: #721c24;">
                    The 15-day approval window has passed.
                  </p>
                </div>
                
                <h2 style="color: #333; font-size: 18px; margin-top: 24px;">What can you do?</h2>
                <ul style="color: #555; font-size: 16px; line-height: 1.8;">
                  <li>Submit a new approval request with the same or different manager</li>
                  <li>Choose a different participation mode that doesn't require manager approval</li>
                  <li>Contact your manager directly to ensure they can respond promptly</li>
                </ul>
                
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${appUrl}/enroll/organization" 
                     style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                    Resubmit Request
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
          console.log(`[auto-decline-expired] Notification sent to ${expired.providerEmail}`);
        } catch (emailError: any) {
          console.error(`[auto-decline-expired] Failed to send notification:`, emailError);
        }
      }
    }

    console.log(`[auto-decline-expired] Completed. Expired ${expiredCount} approvals.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        expiredCount,
        expiredEnrollments: expiredEnrollments.map(e => ({
          enrollmentId: e.enrollmentId,
          orgName: e.orgName,
        })),
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[auto-decline-expired] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
