/**
 * check-review-timeouts — Daily scan to flag overdue Creator approvals
 * and LC reviews. Designed to be called by pg_cron once per day.
 *
 * Idempotent — skips rows already marked as `timeout_override` and skips
 * challenges that already have a matching timeout history row.
 *
 * No notifications — pure status/audit-trail enforcement (per Sprint 6B
 * spec, notifications are deferred).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_CREATOR_TIMEOUT_DAYS = 7;
const DEFAULT_LC_TIMEOUT_DAYS = 5;

interface ChallengeRow {
  id: string;
  creator_approval_status: string | null;
  creator_approval_requested_at: string | null;
  organization_id: string | null;
}

interface OrgOverrideRow {
  id: string;
  lc_review_timeout_days_override: number | null;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let creatorTimeoutsProcessed = 0;
    let lcTimeoutsProcessed = 0;

    // ── 1. Creator-approval timeouts ────────────────────────────
    const creatorCutoff = new Date(
      Date.now() - DEFAULT_CREATOR_TIMEOUT_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: pendingCreatorRows, error: creatorErr } = await supabaseAdmin
      .from("challenges")
      .select(
        "id, creator_approval_status, creator_approval_requested_at, organization_id",
      )
      .eq("creator_approval_status", "pending")
      .lt("creator_approval_requested_at", creatorCutoff);

    if (creatorErr) {
      console.error("creator overdue scan failed:", creatorErr.message);
    } else {
      const rows = (pendingCreatorRows ?? []) as ChallengeRow[];
      for (const row of rows) {
        // Idempotency — skip if a timeout history row already exists.
        const { data: existing } = await supabaseAdmin
          .from("challenge_status_history")
          .select("id")
          .eq("challenge_id", row.id)
          .eq("trigger_event", "CREATOR_APPROVAL_TIMEOUT")
          .limit(1)
          .maybeSingle();
        if (existing?.id) continue;

        const { error: updErr } = await supabaseAdmin
          .from("challenges")
          .update({
            creator_approval_status: "timeout_override",
            creator_approval_notes: "Auto-overridden after 7-day timeout",
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id)
          .eq("creator_approval_status", "pending"); // double-check
        if (updErr) {
          console.error("creator timeout update failed:", row.id, updErr.message);
          continue;
        }

        await supabaseAdmin.from("challenge_status_history").insert({
          challenge_id: row.id,
          from_status: "CR_APPROVAL_PENDING",
          to_status: "CR_APPROVAL_TIMEOUT_OVERRIDE",
          role: "SYSTEM",
          trigger_event: "CREATOR_APPROVAL_TIMEOUT",
          notes: "7-day creator approval window elapsed",
        });

        await supabaseAdmin.from("audit_trail").insert({
          user_id: "00000000-0000-0000-0000-000000000000",
          challenge_id: row.id,
          action: "CREATOR_APPROVAL_TIMEOUT",
          method: "SYSTEM_CRON",
          details: {
            requested_at: row.creator_approval_requested_at,
            timeout_days: DEFAULT_CREATOR_TIMEOUT_DAYS,
          },
        });

        creatorTimeoutsProcessed += 1;
      }
    }

    // ── 2. LC review timeouts ───────────────────────────────────
    // Resolve org-level overrides first (default 5 days).
    const { data: orgOverrides } = await supabaseAdmin
      .from("seeker_organizations")
      .select("id, lc_review_timeout_days_override");

    const overrideMap = new Map<string, number>();
    for (const o of (orgOverrides ?? []) as OrgOverrideRow[]) {
      if (o.lc_review_timeout_days_override && o.lc_review_timeout_days_override > 0) {
        overrideMap.set(o.id, o.lc_review_timeout_days_override);
      }
    }

    // Pull challenges currently in pending LC review.
    const { data: lcCandidates, error: lcErr } = await supabaseAdmin
      .from("challenge_legal_docs")
      .select("id, challenge_id, lc_status, created_at, challenges:challenges(organization_id)")
      .eq("document_type", "UNIFIED_SPA")
      .in("lc_status", ["pending_review", "in_review"]);

    if (lcErr) {
      console.error("LC overdue scan failed:", lcErr.message);
    } else {
      const now = Date.now();
      for (const row of (lcCandidates ?? []) as Array<{
        id: string;
        challenge_id: string;
        created_at: string;
        challenges?: { organization_id?: string | null } | null;
      }>) {
        const orgId = row.challenges?.organization_id ?? null;
        const limitDays = orgId
          ? overrideMap.get(orgId) ?? DEFAULT_LC_TIMEOUT_DAYS
          : DEFAULT_LC_TIMEOUT_DAYS;
        const elapsedDays =
          (now - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (elapsedDays < limitDays) continue;

        const { data: existing } = await supabaseAdmin
          .from("challenge_status_history")
          .select("id")
          .eq("challenge_id", row.challenge_id)
          .eq("trigger_event", "LC_REVIEW_TIMEOUT")
          .limit(1)
          .maybeSingle();
        if (existing?.id) continue;

        await supabaseAdmin.from("challenge_status_history").insert({
          challenge_id: row.challenge_id,
          from_status: "LC_REVIEW_PENDING",
          to_status: "LC_REVIEW_TIMEOUT",
          role: "SYSTEM",
          trigger_event: "LC_REVIEW_TIMEOUT",
          notes: `LC review window of ${limitDays} days elapsed`,
        });

        await supabaseAdmin.from("audit_trail").insert({
          user_id: "00000000-0000-0000-0000-000000000000",
          challenge_id: row.challenge_id,
          action: "LC_REVIEW_TIMEOUT",
          method: "SYSTEM_CRON",
          details: { timeout_days: limitDays, doc_id: row.id },
        });

        lcTimeoutsProcessed += 1;
      }
    }

    return jsonResponse(
      {
        success: true,
        data: {
          creator_timeouts_processed: creatorTimeoutsProcessed,
          lc_timeouts_processed: lcTimeoutsProcessed,
        },
      },
      200,
    );
  } catch (err) {
    console.error("check-review-timeouts error:", err);
    return jsonResponse(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Unknown error",
        },
      },
      500,
    );
  }
});
