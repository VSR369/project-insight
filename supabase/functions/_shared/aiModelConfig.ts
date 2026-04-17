/**
 * aiModelConfig — Shared utility for config-driven AI model selection.
 * Fetches default_model, critical_model, fallback_model from ai_review_global_config.
 * All edge functions import this instead of hardcoding model strings.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_FALLBACK_MODEL = "google/gemini-3-flash-preview";

export interface AIModelConfig {
  defaultModel: string;
  criticalModel: string;
  fallbackModel: string;
}

let cachedConfig: AIModelConfig | null = null;

export async function getAIModelConfig(): Promise<AIModelConfig> {
  if (cachedConfig) return cachedConfig;

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data, error } = await adminClient
      .from("ai_review_global_config")
      .select("default_model, critical_model, fallback_model")
      .eq("id", 1)
      .single();

    if (error || !data) {
      console.error("Failed to load AI model config, using defaults:", error?.message);
      cachedConfig = {
        defaultModel: DEFAULT_FALLBACK_MODEL,
        criticalModel: DEFAULT_FALLBACK_MODEL,
        fallbackModel: "openai/gpt-5-mini",
      };
      return cachedConfig;
    }

    cachedConfig = {
      defaultModel: data.default_model || DEFAULT_FALLBACK_MODEL,
      criticalModel: data.critical_model || data.default_model || DEFAULT_FALLBACK_MODEL,
      fallbackModel: data.fallback_model || "openai/gpt-5-mini",
    };
    return cachedConfig;
  } catch (err) {
    console.error("AI model config fetch error:", err);
    return {
      defaultModel: DEFAULT_FALLBACK_MODEL,
      criticalModel: DEFAULT_FALLBACK_MODEL,
      fallbackModel: "openai/gpt-5-mini",
    };
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 429 retry schedule (PR2): 5s then 10s before falling through to fallback model.
const RATE_LIMIT_BACKOFFS_MS = [5000, 10000];

/**
 * callAIWithFallback — Calls AI gateway with primary model with resilience:
 *  - 502/503: immediately retry with fallback model.
 *  - 429: backoff retry on PRIMARY model (5s, 10s); if still 429, try fallback once.
 *  - All other statuses (incl. 402, 4xx, 5xx): return the Response as-is.
 * Returns the Response object. Caller handles parsing.
 */
export async function callAIWithFallback(
  apiKey: string,
  body: Record<string, unknown>,
  modelOverride?: string,
): Promise<Response> {
  const config = await getAIModelConfig();
  const primaryModel = modelOverride || config.defaultModel;

  const makeRequest = (model: string) =>
    fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, model }),
    });

  let resp = await makeRequest(primaryModel);

  // 429 — rate limit. Backoff and retry on the primary model.
  if (resp.status === 429) {
    for (let i = 0; i < RATE_LIMIT_BACKOFFS_MS.length; i++) {
      const wait = RATE_LIMIT_BACKOFFS_MS[i];
      console.warn(`Primary model ${primaryModel} returned 429, retry ${i + 1}/${RATE_LIMIT_BACKOFFS_MS.length} in ${wait}ms`);
      // Drain the body so the connection can be reused.
      try { await resp.text(); } catch { /* noop */ }
      await sleep(wait);
      resp = await makeRequest(primaryModel);
      if (resp.status !== 429) break;
    }
    // If still 429 after backoffs and a different fallback exists, try it once.
    if (resp.status === 429 && config.fallbackModel && config.fallbackModel !== primaryModel) {
      console.warn(`Primary model ${primaryModel} still 429 after retries, attempting fallback ${config.fallbackModel}`);
      try { await resp.text(); } catch { /* noop */ }
      resp = await makeRequest(config.fallbackModel);
    }
  }

  // 502/503 — transient infra failure. Single fallback retry.
  if ((resp.status === 502 || resp.status === 503) && config.fallbackModel && config.fallbackModel !== primaryModel) {
    console.warn(`Primary model ${primaryModel} returned ${resp.status}, retrying with fallback ${config.fallbackModel}`);
    try { await resp.text(); } catch { /* noop */ }
    resp = await makeRequest(config.fallbackModel);
  }

  return resp;
}
