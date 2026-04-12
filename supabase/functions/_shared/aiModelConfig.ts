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

/**
 * callAIWithFallback — Calls AI gateway with primary model, retries with fallback on 502/503/429.
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

  const primaryResp = await makeRequest(primaryModel);

  // Retry with fallback on transient failures (not 429 rate limit — that's user-facing)
  if ((primaryResp.status === 502 || primaryResp.status === 503) && config.fallbackModel !== primaryModel) {
    console.warn(`Primary model ${primaryModel} returned ${primaryResp.status}, retrying with fallback ${config.fallbackModel}`);
    return makeRequest(config.fallbackModel);
  }

  return primaryResp;
}
