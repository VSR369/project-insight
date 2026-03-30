/**
 * extract-attachment-text — Extracts text content from uploaded challenge attachments.
 * Supports: PDF (text decode), images (Claude Vision), with fallback for unsupported types.
 * Updates challenge_attachments with extracted text and status.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { attachment_id } = await req.json();

    if (!attachment_id || typeof attachment_id !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "attachment_id is required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: att, error: fetchErr } = await adminClient
      .from("challenge_attachments")
      .select("*")
      .eq("id", attachment_id)
      .single();

    if (fetchErr || !att) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Attachment not found" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Mark as processing
    await adminClient
      .from("challenge_attachments")
      .update({ extraction_status: "processing", updated_at: new Date().toISOString() })
      .eq("id", attachment_id);

    // Download file from storage
    const { data: fileData, error: dlErr } = await adminClient.storage
      .from("challenge-attachments")
      .download(att.storage_path);

    if (dlErr || !fileData) {
      await adminClient.from("challenge_attachments").update({
        extraction_status: "failed",
        extraction_error: dlErr?.message || "File not found in storage",
        updated_at: new Date().toISOString(),
      }).eq("id", attachment_id);

      return new Response(
        JSON.stringify({ success: false, error: { code: "STORAGE_ERROR", message: "File not found in storage" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const buffer = await fileData.arrayBuffer();
    let extractedText = "";
    let method = "unknown";

    if (att.mime_type === "application/pdf") {
      // PDF: extract raw text content
      const textDecoder = new TextDecoder();
      const rawText = textDecoder.decode(buffer);
      // Extract readable text between stream markers or just use raw text
      extractedText = rawText
        .replace(/[^\x20-\x7E\n\r\t]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 50000);
      method = "pdf_text";
    } else if (att.mime_type.includes("spreadsheet") || att.mime_type.includes("excel") || att.mime_type.includes("csv")) {
      const textDecoder = new TextDecoder();
      extractedText = textDecoder.decode(buffer).substring(0, 50000);
      method = "tabular_text";
    } else if (att.mime_type.includes("wordprocessing") || att.mime_type.includes("document") || att.mime_type === "text/plain") {
      const textDecoder = new TextDecoder();
      extractedText = textDecoder.decode(buffer).substring(0, 50000);
      method = "docx_text";
    } else if (att.mime_type.startsWith("image/")) {
      // Use Lovable AI Gateway for image description
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        extractedText = "[Image description unavailable — no API key configured]";
        method = "image_skipped";
      } else {
        try {
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
          const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              max_tokens: 2000,
              messages: [{
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: { url: `data:${att.mime_type};base64,${base64}` },
                  },
                  {
                    type: "text",
                    text: "Describe this image in detail. Extract any text, data tables, diagrams, or process flows visible. This is an attachment to a business challenge specification.",
                  },
                ],
              }],
            }),
          });
          const result = await resp.json();
          extractedText = result.choices?.[0]?.message?.content || "[Image description failed]";
          method = "image_description";
        } catch (imgErr: any) {
          extractedText = `[Image extraction failed: ${imgErr.message}]`;
          method = "image_error";
        }
      }
    } else {
      extractedText = `[Unsupported file type: ${att.mime_type}]`;
      method = "unsupported";
    }

    // Save extracted text
    await adminClient.from("challenge_attachments").update({
      extracted_text: extractedText.substring(0, 100000),
      extraction_method: method,
      extraction_status: "completed",
      updated_at: new Date().toISOString(),
    }).eq("id", attachment_id);

    return new Response(
      JSON.stringify({ success: true, data: { method, length: extractedText.length } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("extract-attachment-text error:", err);

    // Try to mark as failed if we have the attachment_id
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.attachment_id) {
        const adminClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );
        await adminClient.from("challenge_attachments").update({
          extraction_status: "failed",
          extraction_error: err.message,
          updated_at: new Date().toISOString(),
        }).eq("id", body.attachment_id);
      }
    } catch { /* best effort */ }

    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
