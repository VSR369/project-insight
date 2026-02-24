/**
 * Fetch wrapper with automatic retry logic for transient network failures.
 * Only retries on TypeError (network errors like "Failed to fetch"),
 * NOT on HTTP error responses (400, 401, 500, etc.).
 */

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(input, init);
      // Return ALL HTTP responses (including 400, 401, etc.) — let Supabase handle those
      return response;
    } catch (error) {
      // Last attempt — give up
      if (attempt === MAX_RETRIES) {
        console.error(
          `[fetchWithRetry] All ${MAX_RETRIES} retries exhausted for:`,
          typeof input === 'string' ? input : (input as Request).url ?? input
        );
        throw error;
      }

      // Only retry on network errors (TypeError: Failed to fetch)
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        const backoffMs = BASE_DELAY_MS * Math.pow(2, attempt); // 500ms, 1s, 2s
        console.warn(
          `[fetchWithRetry] Network error, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`
        );
        await delay(backoffMs);
        continue;
      }

      // Non-network errors — don't retry
      throw error;
    }
  }

  // TypeScript safety — should never reach here
  throw new Error('[fetchWithRetry] Unexpected: exceeded retry loop');
}
