/**
 * safeJsonParse — Robust JSON parsing for LLM outputs.
 * Handles: fenced JSON, trailing commas, truncation, nested objects.
 */

export function safeJsonParse<T>(raw: string, fallback: T): T {
  if (!raw || typeof raw !== 'string') return fallback;

  // Strip markdown fences
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

  // Try direct parse first
  try { return JSON.parse(cleaned) as T; } catch { /* continue */ }

  // Fix trailing commas before ] or }
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  try { return JSON.parse(cleaned) as T; } catch { /* continue */ }

  // Handle truncation: try to close open brackets/braces
  const openBrackets = (cleaned.match(/\[/g) || []).length;
  const closeBrackets = (cleaned.match(/\]/g) || []).length;
  const openBraces = (cleaned.match(/\{/g) || []).length;
  const closeBraces = (cleaned.match(/\}/g) || []).length;

  let patched = cleaned;
  // Remove trailing partial entry (e.g., `{"key": "val` without closing)
  patched = patched.replace(/,\s*\{[^}]*$/s, '');
  patched = patched.replace(/,\s*"[^"]*$/s, '');

  for (let i = 0; i < openBraces - closeBraces; i++) patched += '}';
  for (let i = 0; i < openBrackets - closeBrackets; i++) patched += ']';

  // Fix trailing commas again after patching
  patched = patched.replace(/,\s*([\]}])/g, '$1');
  try { return JSON.parse(patched) as T; } catch { /* continue */ }

  // Last resort: extract first JSON-like block
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0].replace(/,\s*([\]}])/g, '$1')) as T; } catch { /* fall through */ }
  }
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0].replace(/,\s*([\]}])/g, '$1')) as T; } catch { /* fall through */ }
  }

  return fallback;
}

/**
 * parseSummaryAndKeyData — Robust extraction of SUMMARY + KEY_DATA from Tier 2 AI output.
 */
export function parseSummaryAndKeyData(content: string): {
  summary: string | null;
  keyData: Record<string, unknown> | null;
} {
  if (!content) return { summary: null, keyData: null };

  let summary: string | null = null;
  let keyData: Record<string, unknown> | null = null;

  // Extract SUMMARY block
  const summaryMatch = content.match(/SUMMARY:\s*([\s\S]*?)(?=KEY_DATA:|```|$)/i);
  if (summaryMatch?.[1]?.trim()) {
    const raw = summaryMatch[1].trim();
    summary = raw.length >= 20 ? raw.substring(0, 600) : null;
  }

  // Extract KEY_DATA block — try multiple patterns
  const keyDataPatterns = [
    /KEY_DATA:\s*(\{[\s\S]*\})/i,
    /```json\s*(\{[\s\S]*?\})\s*```/i,
    /KEY_DATA:\s*```\s*(\{[\s\S]*?\})\s*```/i,
  ];

  for (const pattern of keyDataPatterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      const parsed = safeJsonParse<Record<string, unknown> | null>(match[1].trim(), null);
      if (parsed && typeof parsed === 'object') {
        keyData = parsed;
        break;
      }
    }
  }

  return { summary, keyData };
}
