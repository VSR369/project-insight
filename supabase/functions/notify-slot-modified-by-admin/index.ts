import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendEmail } from "../_shared/sendEmail.ts";
;


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AdminSlotNotification {
  action: "created" | "modified" | "deleted" | "booking_cancelled";
  reviewer_email: string;
  reviewer_name: string;
  slot_date: string;
  slot_time: string;
  reason?: string;
  new_slot_time?: string;
  provider_email?: string;
  provider_name?: string;
}

const getSubject = (action: string): string => {
  switch (action) {
    case "created":
      return "[CogniBlend] Interview Slot Created on Your Behalf";
    case "modified":
      return "[CogniBlend] Your Interview Slot Has Been Modified";
    case "deleted":
      return "[CogniBlend] Your Interview Slot Has Been Removed";
    case "booking_cancelled":
      return "[CogniBlend] Interview Booking Cancelled by Admin";
    default:
      return "[CogniBlend] Interview Slot Update";
  }
};

const getEmailBody = (data: AdminSlotNotification): string => {
  const actionText: Record<string, string> = {
    created: "A new interview slot has been created on your behalf by a Platform Admin.",
    modified: "Your interview slot has been modified by a Platform Admin.",
    deleted: "Your interview slot has been removed by a Platform Admin.",
    booking_cancelled: "A scheduled interview booking has been cancelled by a Platform Admin.",
  };

  let html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">CogniBlend Panel Reviewer</h1>
      </div>
      
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
          Dear ${data.reviewer_name || "Reviewer"},
        </p>
        
        <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
          ${actionText[data.action] || "Your interview slot has been updated."}
        </p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">Slot Details</h3>
          <p style="margin: 5px 0; color: #4b5563;"><strong>Date:</strong> ${data.slot_date}</p>
          <p style="margin: 5px 0; color: #4b5563;"><strong>Time:</strong> ${data.slot_time}</p>
          ${data.new_slot_time ? `<p style="margin: 5px 0; color: #4b5563;"><strong>New Time:</strong> ${data.new_slot_time}</p>` : ""}
          ${data.reason ? `<p style="margin: 5px 0; color: #4b5563;"><strong>Reason:</strong> ${data.reason}</p>` : ""}
        </div>
  `;

  // Add provider info for booking cancellations
  if (data.action === "booking_cancelled" && data.provider_name) {
    html += `
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e;">
            <strong>Affected Provider:</strong> ${data.provider_name}
          </p>
        </div>
    `;
  }

  html += `
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
          If you have any questions, please contact the Platform Admin.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
          This is an automated message from CogniBlend. Please do not reply directly to this email.
        </p>
      </div>
    </div>
  `;

  return html;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: AdminSlotNotification = await req.json();

    // Validate required fields
    if (!data.reviewer_email || !data.action || !data.slot_date || !data.slot_time) {
      throw new Error("Missing required fields: reviewer_email, action, slot_date, slot_time");
    }

    console.log("Sending slot notification:", {
      action: data.action,
      to: data.reviewer_email,
      date: data.slot_date,
    });

    // Send email to reviewer
    const emailResponse = await resend.emails.send({
      from: "CogniBlend <onboarding@resend.dev>",
      to: [data.reviewer_email],
      subject: getSubject(data.action),
      html: getEmailBody(data),
    });

    console.log("Reviewer email sent:", emailResponse);

    // If booking was cancelled and provider email exists, notify provider too
    if (data.action === "booking_cancelled" && data.provider_email) {
      const providerHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">CogniBlend</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              Dear ${data.provider_name || "Provider"},
            </p>
            
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              We regret to inform you that your scheduled interview has been cancelled by the Platform Admin.
            </p>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ef4444;">
              <h3 style="margin: 0 0 15px 0; color: #991b1b; font-size: 16px;">Cancelled Interview</h3>
              <p style="margin: 5px 0; color: #7f1d1d;"><strong>Date:</strong> ${data.slot_date}</p>
              <p style="margin: 5px 0; color: #7f1d1d;"><strong>Time:</strong> ${data.slot_time}</p>
              ${data.reason ? `<p style="margin: 5px 0; color: #7f1d1d;"><strong>Reason:</strong> ${data.reason}</p>` : ""}
            </div>
            
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              Please log in to your account to schedule a new interview slot at your convenience.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              This is an automated message from CogniBlend. Please do not reply directly to this email.
            </p>
          </div>
        </div>
      `;

      const providerEmailResponse = await resend.emails.send({
        from: "CogniBlend <onboarding@resend.dev>",
        to: [data.provider_email],
        subject: "[CogniBlend] Your Interview Has Been Cancelled",
        html: providerHtml,
      });

      console.log("Provider email sent:", providerEmailResponse);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-slot-modified-by-admin:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
