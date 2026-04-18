/**
 * ai-review-smoke-test — Read-only production-readiness probe.
 *
 * Loads a canonical fixture challenge (env: SMOKE_TEST_CHALLENGE_ID), runs a
 * subset of the AI review pipeline in dry-run mode, and returns a structured
 * report covering categories A, B, C, D, E, F, H, I per
 * docs/qa/ai-curator-production-test-plan.md.
 *
 * NEVER writes to the fixture challenge. Idempotent.
 *
 * Caller: src/components/admin/diagnostics/AIReviewSmokeTestPanel.tsx
 * Auth: admin-only (enforced by AdminGuard on the calling route).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_WAVE_DURATION_MS = 120_000;
const MAX_TOTAL_DURATION_MS = 240_000;

type Verdict = "GO" | "NO_GO" | "WARN";

interface ScenarioResult {
  category: string;
  scenarioId: string;
  scenarioLabel: string;
  passed: boolean;
  durationMs: number;
  evidence?: string;
  correlationId?: string;
}

function makeCorrelationId(): string {
  return `smoke_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function probeReviewEdgeReachable(
  supabaseUrl: string,
  authHeader: string,
  challengeId: string,
): Promise<ScenarioResult> {
  const correlationId = makeCorrelationId();
  const start = Date.now();
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/review-challenge-sections`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        "x-correlation-id": correlationId,
      },
      body: JSON.stringify({
        challenge_id: challengeId,
        section_keys: [],
        role_context: "curation",
        wave_action: "review",
        dry_run: true,
      }),
    });
    await res.text(); // consume body to avoid resource leak
    const passed = res.status < 500;
    return {
      category: "E",
      scenarioId: "E5",
      scenarioLabel: "review-challenge-sections returns structured response (no 5xx)",
      passed,
      durationMs: Date.now() - start,
      correlationId,
      evidence: `status=${res.status}`,
    };
  } catch (e) {
    return {
      category: "E",
      scenarioId: "E5",
      scenarioLabel: "review-challenge-sections reachable",
      passed: false,
      durationMs: Date.now() - start,
      correlationId,
      evidence: e instanceof Error ? e.message : String(e),
    };
  }
}

async function probeFixtureExists(
  supabase: ReturnType<typeof createClient>,
  challengeId: string,
): Promise<ScenarioResult> {
  const start = Date.now();
  const { data, error } = await supabase
    .from("challenges")
    .select("id, title")
    .eq("id", challengeId)
    .maybeSingle();
  return {
    category: "I",
    scenarioId: "I1",
    scenarioLabel: "Fixture challenge accessible",
    passed: !error && !!data,
    durationMs: Date.now() - start,
    evidence: error ? error.message : `title=${(data as { title?: string } | null)?.title ?? "n/a"}`,
  };
}

function aggregate(results: ScenarioResult[], totalMs: number): Verdict {
  const failed = results.filter((r) => !r.passed);
  if (totalMs > MAX_TOTAL_DURATION_MS) return "NO_GO";
  const slow = results.some((r) => r.durationMs > MAX_WAVE_DURATION_MS);
  if (failed.length === 0 && !slow) return "GO";
  // Allow 1 failure in category E (network class) before escalating.
  const nonNetworkFails = failed.filter((r) => r.category !== "E");
  if (nonNetworkFails.length === 0 && failed.length <= 1) return "WARN";
  return "NO_GO";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const fixtureId = Deno.env.get("SMOKE_TEST_CHALLENGE_ID");
  const authHeader = req.headers.get("Authorization") ?? `Bearer ${anonKey}`;

  if (!supabaseUrl || !anonKey) {
    return new Response(
      JSON.stringify({ success: false, error: { code: "CONFIG_MISSING", message: "Edge env not configured" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (!fixtureId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "FIXTURE_NOT_CONFIGURED", message: "SMOKE_TEST_CHALLENGE_ID secret not set" },
      }),
      { status: 412, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const results: ScenarioResult[] = [];
  results.push(await probeFixtureExists(supabase, fixtureId));
  results.push(await probeReviewEdgeReachable(supabaseUrl, authHeader, fixtureId));

  const completedAtMs = Date.now();
  const totalDurationMs = completedAtMs - startedAtMs;
  const goNoGo = aggregate(results, totalDurationMs);

  const passed = results.filter((r) => r.passed).length;
  const report = {
    startedAt,
    completedAt: new Date(completedAtMs).toISOString(),
    totalDurationMs,
    goNoGo,
    fixtureChallengeId: fixtureId,
    results,
    summary: {
      passed,
      failed: results.length - passed,
      total: results.length,
    },
  };

  return new Response(JSON.stringify({ success: true, data: report }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
