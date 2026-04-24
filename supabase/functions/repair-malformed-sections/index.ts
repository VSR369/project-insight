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

    // Background processing — return immediately so the worker doesn't hit the
    // CPU wall-time limit while waiting for N heavy review-challenge-sections calls.
    // The UI will refresh challenge data on a timer / via realtime to pick up
    // regenerated suggestions.
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Tightened from 6 → 3 to bound peak CPU and prevent WORKER_RESOURCE_LIMIT.
    const MAX_PER_RUN = 3;
    const SPACING_MS = 1500;

    const processInBackground = async () => {
      const batch = findings.slice(0, MAX_PER_RUN);

      // Idempotency: re-fetch each section just before regenerating and skip
      // if it has already been healed since the original scan. Prevents the
      // "click Repair → adds new failures for already-clean sections" loop.
      for (let i = 0; i < batch.length; i++) {
        const finding = batch[i];

        // Re-check freshness — RLS-scoped read.
        try {
          const { data: fresh } = await supabase
            .from("challenges")
            .select(`id, ${finding.section_key}, extended_brief`)
            .eq("id", challenge_id)
            .single();
          if (fresh) {
            const freshRec = fresh as unknown as Record<string, unknown>;
            const liveValue = freshRec[finding.section_key]
              ?? ((freshRec.extended_brief as Record<string, unknown> | null)?.[finding.section_key]);
            const liveDet = detect(liveValue);
            if (liveDet === "ok") {
              console.info(
                `[${correlationId}] repair section=${finding.section_key} skipped — already clean`,
              );
              continue;
            }
          }
        } catch { /* fall through and attempt repair */ }

        try {
          // Surgical repair: Pass 2 ONLY with empty provided_comments.
          // This skips the heavy Pass 1 prompt (~28K tokens), freeing budget
          // for the actual rewrite and avoiding re-truncation on solo
          // large-output sections.
          const resp = await fetch(
            `${supabaseUrl}/functions/v1/review-challenge-sections`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": authHeader,
                "apikey": anonKey,
              },
              body: JSON.stringify({
                challenge_id,
                section_key: finding.section_key,
                role_context: "curation",
                wave_action: "review_and_generate",
                skip_analysis: true,
                provided_comments: [{
                  section_key: finding.section_key,
                  status: "warning",
                  comments: [{
                    type: "warning",
                    text: `Existing content is malformed (${finding.detection}). Regenerate clean, complete content from scratch using challenge context.`,
                  }],
                }],
              }),
            },
          );
          // Drain body to free the connection.
          try { await resp.text(); } catch { /* noop */ }
          console.info(
            `[${correlationId}] repair section=${finding.section_key} status=${resp.status}`,
          );
        } catch (err) {
          console.error(
            `[${correlationId}] repair section=${finding.section_key} failed:`,
            err instanceof Error ? err.message : String(err),
          );
        }

        // Spacing between calls — gives the worker breathing room to GC
        // large response bodies and prevents WORKER_RESOURCE_LIMIT.
        if (i < batch.length - 1) {
          await new Promise((r) => setTimeout(r, SPACING_MS));
        }
      }
      console.info(
        `[${correlationId}] repair-malformed-sections finished: ${batch.length}/${findings.length} processed`,
      );
    };

    // @ts-ignore — EdgeRuntime is provided by the Supabase edge runtime
    EdgeRuntime.waitUntil(processInBackground());

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          challenge_id,
          findings,
          repaired: findings.slice(0, MAX_PER_RUN).map(f => ({
            section_key: f.section_key,
            detection: f.detection,
            status: "regenerated" as const,
            message: "Queued for background regeneration (Pass 2 only)",
          })),
          summary: {
            scanned: REPAIR_CANDIDATES.length,
            detected: findings.length,
            regenerated: Math.min(findings.length, MAX_PER_RUN),
            failed: 0,
          },
          message:
            findings.length > MAX_PER_RUN
              ? `Queued first ${MAX_PER_RUN} of ${findings.length} sections (Pass 2 only). Re-run after ~30s to process the rest. Already-clean sections will be skipped automatically.`
              : `Surgical Pass 2 regeneration running in background (~${MAX_PER_RUN * 15}s). Refresh, then click Accept All AI Suggestions.`,
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
