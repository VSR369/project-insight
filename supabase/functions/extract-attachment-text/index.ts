/**
 * extract-attachment-text — Extracts text content from uploaded challenge attachments and URLs.
 * Supports: PDF (text decode), images (Gemini Vision), URLs (HTML strip), with fallback for unsupported types.
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

    let extractedText = "";
    let method = "unknown";

    if (att.source_type === "url" && att.source_url) {
      // ── URL EXTRACTION ──
      try {
        const urlResp = await fetch(att.source_url, {
          headers: { "User-Agent": "CogniBlend-Curator/1.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(15000),
        });
        if (!urlResp.ok) throw new Error(`HTTP ${urlResp.status}: ${urlResp.statusText}`);
        const contentType = urlResp.headers.get("content-type") || "";
        const rawText = await urlResp.text();

        if (contentType.includes("application/pdf")) {
          extractedText = "[PDF URL — content available at: " + att.source_url + "]";
          method = "url_pdf";
        } else {
          // HTML — strip tags, extract main content
          extractedText = rawText
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<nav[\s\S]*?<\/nav>/gi, "")
            .replace(/<footer[\s\S]*?<\/footer>/gi, "")
            .replace(/<header[\s\S]*?<\/header>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/\s+/g, " ").trim().substring(0, 50000);
          method = "url_html";

          // Bug 8: Check for sparse content from JS-rendered or auth-protected pages
          if (extractedText.trim().length < 100) {
            extractedText = `[URL content is sparse or inaccessible (${extractedText.trim().length} chars extracted). The page may require authentication, use JavaScript rendering, or block automated access. Source: ${att.source_url}]`;
            method = "url_html_sparse";
          }
        }

        // Auto-populate url_title from page <title>
        if (!att.url_title) {
          const titleMatch = rawText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          if (titleMatch?.[1]) {
            await adminClient.from("challenge_attachments").update({
              url_title: titleMatch[1].trim().substring(0, 500),
            }).eq("id", attachment_id);
          }
        }
      } catch (fetchUrlErr: any) {
        extractedText = `[Failed to fetch URL: ${fetchUrlErr.message}]`;
        method = "url_error";
      }
    } else {
      // ── FILE EXTRACTION (existing logic) ──
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

      if (att.mime_type === "application/pdf") {
        const textDecoder = new TextDecoder();
        const rawText = textDecoder.decode(buffer);
        const cleaned = rawText
          .replace(/[^\x20-\x7E\n\r\t]/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 50000);

        // Bug 4: Quality check — if <20% printable ASCII, extraction is garbage
        const printableRatio = cleaned.replace(/\s/g, '').length / Math.max(cleaned.length, 1);
        if (printableRatio < 0.2 || cleaned.length < 50) {
          extractedText = `[PDF content could not be extracted as text. File: ${att.file_name || 'unnamed'}. This PDF may be image-based or encrypted. Consider uploading a text-based version or pasting key content directly into the section.]`;
          method = "pdf_binary_fallback";
        } else {
          extractedText = cleaned;
          method = "pdf_text";
        }
      } else if (att.mime_type?.includes("spreadsheet") || att.mime_type?.includes("excel") || att.mime_type?.includes("csv")) {
        const textDecoder = new TextDecoder();
        const raw = textDecoder.decode(buffer);
        // Bug 9: CSV is plaintext; XLSX is ZIP archive
        if (att.mime_type?.includes("csv") || att.file_name?.endsWith('.csv')) {
          extractedText = raw.substring(0, 50000);
          method = "csv_text";
        } else {
          const printableRatio = raw.replace(/[^\x20-\x7E]/g, '').length / Math.max(raw.length, 1);
          if (printableRatio < 0.3) {
            extractedText = `[Excel file could not be extracted as text. File: ${att.file_name || 'unnamed'}. Consider exporting key data as CSV and uploading that instead.]`;
            method = "xlsx_binary_fallback";
          } else {
            extractedText = raw.substring(0, 50000);
            method = "tabular_text";
          }
        }
      } else if (att.mime_type?.includes("wordprocessing") || att.mime_type?.includes("document") || att.mime_type === "text/plain") {
        const textDecoder = new TextDecoder();
        const raw = textDecoder.decode(buffer);
        // Bug 9: text/plain is actual text; DOCX is ZIP archive
        if (att.mime_type === "text/plain") {
          extractedText = raw.substring(0, 50000);
          method = "plain_text";
        } else {
          const printableRatio = raw.replace(/[^\x20-\x7E]/g, '').length / Math.max(raw.length, 1);
          if (printableRatio < 0.3) {
            extractedText = `[Word document could not be extracted as text. File: ${att.file_name || 'unnamed'}. Consider pasting key content directly into the section or saving as PDF.]`;
            method = "docx_binary_fallback";
          } else {
            extractedText = raw.substring(0, 50000);
            method = "docx_text";
          }
        }
      } else if (att.mime_type?.startsWith("image/")) {
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
    }

    // Save extracted text
    const updatePayload: Record<string, unknown> = {
      extracted_text: extractedText.substring(0, 100000),
      extraction_method: method,
      extraction_status: "completed",
      updated_at: new Date().toISOString(),
    };

    // ── TIER 2: AI Summarization (additive) ──
    if (extractedText.length > 500) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        try {
          const tier2Resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              max_tokens: 1500,
              temperature: 0.1,
              messages: [{
                role: "user",
                content: `Analyze this document and provide:

1. SUMMARY: 3-5 bullet points of key information (max 500 chars total)
2. KEY_DATA: Extract as JSON with these arrays: facts[], statistics[], names[], dates[], regulations[]

Document content:
${extractedText.substring(0, 8000)}

Return in this exact format:
SUMMARY:
- bullet 1
- bullet 2

KEY_DATA:
{"facts":[],"statistics":[],"names":[],"dates":[],"regulations":[]}`,
              }],
            }),
          });
          if (tier2Resp.ok) {
            const tier2Result = await tier2Resp.json();
            const tier2Content = tier2Result.choices?.[0]?.message?.content || "";

            // Parse summary
            const summaryMatch = tier2Content.match(/SUMMARY:\s*([\s\S]*?)(?=KEY_DATA:|$)/i);
            if (summaryMatch?.[1]) {
              updatePayload.extracted_summary = summaryMatch[1].trim().substring(0, 500);
            }

            // Parse key data JSON
            const keyDataMatch = tier2Content.match(/KEY_DATA:\s*(\{[\s\S]*\})/i);
            if (keyDataMatch?.[1]) {
              try {
                updatePayload.extracted_key_data = JSON.parse(keyDataMatch[1].trim());
              } catch { /* skip if invalid JSON */ }
            }
          }
        } catch (tier2Err: any) {
          console.error("Tier 2 summarization failed (non-blocking):", tier2Err.message);
        }
      }
    }

    await adminClient.from("challenge_attachments").update(updatePayload).eq("id", attachment_id);

    return new Response(
      JSON.stringify({ success: true, data: { method, length: extractedText.length, hasSummary: !!updatePayload.extracted_summary } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("extract-attachment-text error:", err);

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
