/**
 * piiRedactor — Deterministic PII redaction for corpus storage.
 * Symmetric redaction: same patterns replaced in both AI and curator content.
 * Uses consistent placeholder tokens for downstream recognition.
 */

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g;
const OBFUSCATED_EMAIL = /\b[a-zA-Z0-9._%+-]+\s*(?:\[at\]|at)\s*[a-zA-Z0-9.-]+\s*(?:\[dot\]|dot|\.)\s*(?:com|org|net|io|co)\b/gi;

const REDACTION_TOKENS = {
  email: '[REDACTED_EMAIL]',
  phone: '[REDACTED_PHONE]',
} as const;

export interface RedactionResult {
  text: string;
  redactionsApplied: number;
}

/**
 * Redact PII patterns from text using deterministic regex.
 * Returns redacted text and count of replacements made.
 */
export function redactPII(text: string | null): RedactionResult {
  if (!text) return { text: '', redactionsApplied: 0 };

  let count = 0;
  let result = text;

  // Emails first (before obfuscated check)
  result = result.replace(EMAIL_PATTERN, () => {
    count++;
    return REDACTION_TOKENS.email;
  });

  // Obfuscated emails
  result = result.replace(OBFUSCATED_EMAIL, () => {
    count++;
    return REDACTION_TOKENS.email;
  });

  // Phone numbers (7+ digits only)
  result = result.replace(PHONE_PATTERN, (match) => {
    const digitsOnly = match.replace(/\D/g, '');
    if (digitsOnly.length >= 7) {
      count++;
      return REDACTION_TOKENS.phone;
    }
    return match;
  });

  return { text: result, redactionsApplied: count };
}

/**
 * Symmetrically redact both AI and curator content.
 * Ensures before/after pairs in the corpus don't leak PII.
 */
export function redactCorpusPair(
  aiContent: string | null,
  curatorContent: string | null,
): { aiContent: string | null; curatorContent: string | null; totalRedactions: number } {
  const aiResult = redactPII(aiContent);
  const curatorResult = redactPII(curatorContent);

  return {
    aiContent: aiContent ? aiResult.text : null,
    curatorContent: curatorContent ? curatorResult.text : null,
    totalRedactions: aiResult.redactionsApplied + curatorResult.redactionsApplied,
  };
}
