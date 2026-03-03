import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RejectionItem {
  area: string;
  reason: string;
  recommendation?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orgName, recipientEmail, rejections } = await req.json() as {
      orgName: string;
      recipientEmail: string;
      rejections: RejectionItem[];
    };

    if (!recipientEmail || !orgName || !rejections?.length) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Missing required fields" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "CONFIG_ERROR", message: "RESEND_API_KEY not configured" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendKey);

    const rejectionRows = rejections.map((r) =>
      `<tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:500;">${r.area}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${r.reason}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${r.recommendation || '—'}</td>
      </tr>`
    ).join("");

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#1a1a1a;">Registration Review — Action Required</h2>
        <p>Dear Applicant,</p>
        <p>Thank you for submitting the registration for <strong>${orgName}</strong>. After review, the following issues were identified:</p>
        
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">Area</th>
              <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">Reason</th>
              <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">Recommendation</th>
            </tr>
          </thead>
          <tbody>${rejectionRows}</tbody>
        </table>

        <p>Please review the above and take the necessary corrective actions. If you have questions, contact our support team.</p>
        <p style="margin-top:24px;">Best regards,<br/>CogniBlend Platform Team</p>
      </div>
    `;

    const { error: sendError } = await resend.emails.send({
      from: "CogniBlend <noreply@cogniblend.com>",
      to: [recipientEmail],
      subject: `Registration Review: ${orgName} — Action Required`,
      html,
    });

    if (sendError) {
      console.error("Resend error:", sendError);
      return new Response(
        JSON.stringify({ success: false, error: { code: "EMAIL_FAILED", message: sendError.message } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: (error as Error).message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
