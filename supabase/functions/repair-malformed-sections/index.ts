/**
 * repair-malformed-sections — Admin one-click data-repair action.
 *
 * Scans a single challenge for sections whose persisted content is empty,
 * truncated, or JSON-corrupted, then re-invokes `review-challenge-sections`
 * (Pass 1 + Pass 2) for each such section to regenerate clean suggestions.
 *
 * The function NEVER writes to challenge content directly — it only
 * regenerates the AI suggestion, leaving the existing curator state intact.
 * The curator must subsequently click "Accept All AI Suggestions".
 *
 * Returns a structured report so the UI can show exactly what was repaired.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Sections that are candidates for automatic repair ──
 * These are rich-text and structured sections most often affected by
 * pre-hardening AI truncation, mid-word corruption, or empty writes.
 */
const REPAIR_CANDIDATES = [
  "problem_statement",
  "scope",
  "context_background",
  "solver_expertise",
  "complexity_assessment",
  "affected_stakeholders",
  "data_resources_provided",
  "success_metrics_kpis",
  "expected_outcomes",
  "deliverables",
];

type Detection =
  | "empty"
  | "json_in_text"
  | "object_object"
  | "truncated"
  | "duplicated_token"
  | "ok";

interface Finding {
  section_key: string;
  detection: Detection;
  preview: string;
}

interface RepairResult {
  section_key: string;
  detection: Detection;
  status: "regenerated" | "skipped" | "error";
  message?: string;
}

const TRUNCATION_RE = /\b(\w{3,})\1\b/i; // e.g. "ahindra ahindra"
const MIDWORD_BREAK_RE = /\b\w+[a-z]\w*\b\s*$/i;

function detect(value: unknown): Detection {
  if (value == null || value === "") return "empty";
  const s = typeof value === "string" ? value.trim() : JSON.stringify(value);
  if (!s) return "empty";
  if (s.includes("[object Object]")) return "object_object";
  if (typeof value === "string") {
    // Raw JSON array/object stored as text inside a rich-text field
    if (/^<p>\s*[\[{]/.test(s) || /^[\[{]/.test(s)) return "json_in_text";
    if (TRUNCATION_RE.test(s)) return "duplicated_token";
    if (s.length > 80 && MIDWORD_BREAK_RE.test(s) && !/[.!?]\s*<\/p>?\s*$/.test(s)) {
      return "truncated";
    }
  }
  return "ok";
}

function readField(challenge: Record<string, unknown>, key: string): unknown {
  const direct = challenge[key];
  if (direct != null && direct !== "") return direct;
  const eb = challenge.extended_brief;
  if (eb && typeof eb === "object") {
    const ebRecord = eb as Record<string, unknown>;
    if (ebRecord[key] != null) return ebRecord[key];
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const correlationId = crypto.randomUUID();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );

    const { challenge_id, dry_run = false } = await req.json();
    if (!challenge_id || typeof challenge_id !== "string") {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "challenge_id is required", correlationId },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify auth
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "AUTH_REQUIRED", message: "Authentication required", correlationId },
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load the challenge (RLS-scoped to caller)
    const { data: challenge, error: chErr } = await supabase
      .from("challenges")
      .select("id, problem_statement, scope, context_background, solver_expertise, complexity_assessment, affected_stakeholders, data_resources_provided, success_metrics_kpis, expected_outcomes, deliverables, extended_brief")
      .eq("id", challenge_id)
      .single();

    if (chErr || !challenge) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "NOT_FOUND", message: chErr?.message ?? "Challenge not found", correlationId },
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Detect malformed sections
    const findings: Finding[] = [];
    for (const key of REPAIR_CANDIDATES) {
      const value = readField(challenge as Record<string, unknown>, key);
      const det = detect(value);
      if (det !== "ok") {
        const preview = (typeof value === "string" ? value : JSON.stringify(value ?? ""))
          .slice(0, 120);
        findings.push({ section_key: key, detection: det, preview });
      }
    }

    if (findings.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            challenge_id,
            findings: [],
            repaired: [],
            message: "No malformed sections detected. Document is clean.",
          },
          meta: { correlationId },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (dry_run) {
      return new Response(
        JSON.stringify({
          success: true,
          data: { challenge_id, findings, repaired: [], dry_run: true },
          meta: { correlationId },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Re-run review-challenge-sections per malformed section.
    // We invoke sequentially — each call already batches Pass 1 + Pass 2 internally
    // and writing them in parallel would breach the AI gateway concurrency budget.
    const results: RepairResult[] = [];
    const authHeader = req.headers.get("Authorization") ?? "";

    for (const finding of findings) {
      try {
        const resp = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/review-challenge-sections`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": authHeader,
              "apikey": Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            },
            body: JSON.stringify({
              challenge_id,
              section_key: finding.section_key,
              role_context: "curation",
              wave_action: "review_and_generate",
            }),
          },
        );

        if (!resp.ok) {
          const text = await resp.text();
          results.push({
            section_key: finding.section_key,
            detection: finding.detection,
            status: "error",
            message: `HTTP ${resp.status}: ${text.slice(0, 160)}`,
          });
          continue;
        }

        const json = await resp.json();
        if (json?.success) {
          results.push({
            section_key: finding.section_key,
            detection: finding.detection,
            status: "regenerated",
          });
        } else {
          results.push({
            section_key: finding.section_key,
            detection: finding.detection,
            status: "error",
            message: json?.error?.message ?? "Unknown error",
          });
        }
      } catch (err) {
        results.push({
          section_key: finding.section_key,
          detection: finding.detection,
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const ok = results.filter(r => r.status === "regenerated").length;
    const fail = results.filter(r => r.status === "error").length;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          challenge_id,
          findings,
          repaired: results,
          summary: {
            scanned: REPAIR_CANDIDATES.length,
            detected: findings.length,
            regenerated: ok,
            failed: fail,
          },
        },
        meta: { correlationId },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : String(err),
          correlationId,
        },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
