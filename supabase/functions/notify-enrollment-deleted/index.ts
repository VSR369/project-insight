/**
 * Notify Enrollment Deleted Edge Function
 * 
 * Sends email notifications to all stakeholders when an enrollment
 * is force deleted (reviewers, managers, admins).
 */

import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Stakeholder {
  type: 'reviewer' | 'manager' | 'provider' | 'admin';
  email: string;
  name: string;
  context: string;
}

interface EnrollmentDeletionNotificationRequest {
  enrollment_id: string;
  industry_name: string;
  deleted_by: string;
  was_force_delete: boolean;
  stakeholders: Stakeholder[];
  affected_data_summary: {
    proof_points: number;
    interviews_cancelled: number;
    assessments_deleted: number;
  };
}

const getSubjectByType = (type: Stakeholder['type'], industryName: string): string => {
  switch (type) {
    case 'reviewer':
      return `Interview Cancelled - ${industryName} Enrollment Deleted`;
    case 'manager':
      return `Approval Request Withdrawn - ${industryName} Enrollment`;
    case 'provider':
      return `Your ${industryName} Enrollment Has Been Deleted`;
    case 'admin':
      return `[Audit] Enrollment Force Deleted - ${industryName}`;
    default:
      return `Notification - ${industryName} Enrollment Update`;
  }
};

const getEmailHtmlByType = (
  stakeholder: Stakeholder,
  industryName: string,
  affectedData: EnrollmentDeletionNotificationRequest['affected_data_summary']
): string => {
  const baseStyles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #f8f9fa; padding: 20px; border-radius: 8px 8px 0 0; }
      .content { background: #fff; padding: 20px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 8px 8px; }
      .alert { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin: 15px 0; }
      .info { background: #e7f3ff; border: 1px solid #0d6efd; padding: 15px; border-radius: 6px; margin: 15px 0; }
      .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 12px; }
    </style>
  `;

  switch (stakeholder.type) {
    case 'reviewer':
      return `
        <!DOCTYPE html>
        <html>
        <head>${baseStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0; color: #dc3545;">Interview Cancelled</h2>
            </div>
            <div class="content">
              <p>Dear ${stakeholder.name},</p>
              <p>An interview you were scheduled for has been <strong>cancelled</strong> because the provider's enrollment was deleted.</p>
              
              <div class="alert">
                <strong>What happened:</strong><br>
                ${stakeholder.context}
              </div>
              
              <p><strong>Industry:</strong> ${industryName}</p>
              
              <p>This time slot has been released and is now available for other bookings.</p>
              
              <p>If you have any questions, please contact the platform administrator.</p>
              
              <p>Best regards,<br>CogniBlend Platform</p>
            </div>
            <div class="footer">
              This is an automated notification. Please do not reply to this email.
            </div>
          </div>
        </body>
        </html>
      `;

    case 'manager':
      return `
        <!DOCTYPE html>
        <html>
        <head>${baseStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0; color: #ffc107;">Approval Request Withdrawn</h2>
            </div>
            <div class="content">
              <p>Dear ${stakeholder.name},</p>
              <p>An organization approval request you received has been <strong>withdrawn</strong> because the provider's enrollment was deleted.</p>
              
              <div class="info">
                <strong>Status Update:</strong><br>
                ${stakeholder.context}
              </div>
              
              <p><strong>Industry:</strong> ${industryName}</p>
              
              <p>No further action is required from you regarding this request.</p>
              
              <p>Best regards,<br>CogniBlend Platform</p>
            </div>
            <div class="footer">
              This is an automated notification. Please do not reply to this email.
            </div>
          </div>
        </body>
        </html>
      `;

    case 'admin':
      return `
        <!DOCTYPE html>
        <html>
        <head>${baseStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0; color: #6c757d;">[Audit] Force Deletion Event</h2>
            </div>
            <div class="content">
              <p>An enrollment has been force deleted with the following impact:</p>
              
              <div class="alert">
                <strong>Industry:</strong> ${industryName}<br>
                <strong>Proof Points Deleted:</strong> ${affectedData.proof_points}<br>
                <strong>Interviews Cancelled:</strong> ${affectedData.interviews_cancelled}<br>
                <strong>Assessments Deleted:</strong> ${affectedData.assessments_deleted}
              </div>
              
              <p>This is an audit notification for compliance tracking.</p>
            </div>
            <div class="footer">
              CogniBlend Platform - Audit System
            </div>
          </div>
        </body>
        </html>
      `;

    default:
      return `
        <!DOCTYPE html>
        <html>
        <head>${baseStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">Enrollment Update</h2>
            </div>
            <div class="content">
              <p>Dear ${stakeholder.name},</p>
              <p>An enrollment in <strong>${industryName}</strong> has been deleted.</p>
              <p>${stakeholder.context}</p>
            </div>
          </div>
        </body>
        </html>
      `;
  }
};

Deno.serve(async (req) => {
  console.log("notify-enrollment-deleted: Request received");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: EnrollmentDeletionNotificationRequest = await req.json();
    console.log("notify-enrollment-deleted: Processing notification for", requestData.enrollment_id);
    console.log("notify-enrollment-deleted: Stakeholders to notify:", requestData.stakeholders.length);

    const { industry_name, stakeholders, affected_data_summary } = requestData;

    if (!stakeholders || stakeholders.length === 0) {
      console.log("notify-enrollment-deleted: No stakeholders to notify");
      return new Response(
        JSON.stringify({ success: true, message: "No stakeholders to notify" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const emailResults: Array<{ email: string; success: boolean; error?: string }> = [];

    // Send emails to each stakeholder
    for (const stakeholder of stakeholders) {
      try {
        console.log(`notify-enrollment-deleted: Sending email to ${stakeholder.email} (${stakeholder.type})`);
        
        const subject = getSubjectByType(stakeholder.type, industry_name);
        const html = getEmailHtmlByType(stakeholder, industry_name, affected_data_summary);

        const emailResponse = await resend.emails.send({
          from: "CogniBlend <noreply@resend.dev>",
          to: [stakeholder.email],
          subject,
          html,
        });

        if (emailResponse.error) {
          console.error(`notify-enrollment-deleted: Failed to send to ${stakeholder.email}:`, emailResponse.error);
          emailResults.push({ email: stakeholder.email, success: false, error: emailResponse.error.message });
        } else {
          console.log(`notify-enrollment-deleted: Successfully sent to ${stakeholder.email}`);
          emailResults.push({ email: stakeholder.email, success: true });
        }
      } catch (emailError: unknown) {
        const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
        console.error(`notify-enrollment-deleted: Error sending to ${stakeholder.email}:`, emailError);
        emailResults.push({ email: stakeholder.email, success: false, error: errorMessage });
      }
    }

    const successCount = emailResults.filter(r => r.success).length;
    const failureCount = emailResults.filter(r => !r.success).length;

    console.log(`notify-enrollment-deleted: Complete. Success: ${successCount}, Failed: ${failureCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: stakeholders.length,
          sent: successCount,
          failed: failureCount,
        },
        results: emailResults,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("notify-enrollment-deleted: Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
