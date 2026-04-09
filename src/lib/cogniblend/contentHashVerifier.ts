/**
 * contentHashVerifier — Recomputes SHA-256 content hash client-side
 * and compares with the stored hash to verify content integrity.
 */

interface ChallengeContentFields {
  title: string | null;
  problem_statement: string | null;
  scope: string | null;
  hook: string | null;
  ip_model: string | null;
  evaluation_criteria: unknown;
}

/**
 * Computes SHA-256 hash of challenge content fields.
 * Must match the server-side hash algorithm in freeze_for_legal_review RPC.
 */
export async function computeContentHash(fields: ChallengeContentFields): Promise<string> {
  const hashInput = [
    fields.title ?? '',
    fields.problem_statement ?? '',
    fields.scope ?? '',
    fields.hook ?? '',
    fields.ip_model ?? '',
    typeof fields.evaluation_criteria === 'string'
      ? fields.evaluation_criteria
      : JSON.stringify(fields.evaluation_criteria ?? ''),
  ].join('|');

  const encoder = new TextEncoder();
  const data = encoder.encode(hashInput);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies that the current challenge content matches the stored hash.
 */
export async function verifyContentIntegrity(
  fields: ChallengeContentFields,
  storedHash: string | null,
): Promise<{ valid: boolean; computedHash: string; storedHash: string | null }> {
  const computedHash = await computeContentHash(fields);
  return {
    valid: storedHash !== null && computedHash === storedHash,
    computedHash,
    storedHash,
  };
}
