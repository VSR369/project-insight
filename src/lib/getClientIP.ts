/**
 * Utility to get client IP address for BR-MPA-043 audit logging.
 * Uses a public API with fallback to empty string.
 */
let cachedIP: string | null = null;

export async function getClientIP(): Promise<string> {
  if (cachedIP) return cachedIP;
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    cachedIP = data.ip ?? '';
    return cachedIP;
  } catch {
    return '';
  }
}
