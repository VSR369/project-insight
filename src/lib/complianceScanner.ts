/**
 * complianceScanner — BR-COM-003 contact information detection utility.
 * Detects email patterns, phone numbers, and URLs in Q&A messages.
 */

/* ─── Patterns ───────────────────────────────────────────── */

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_PATTERN = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/;
const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s,;)]+/i;
// Common obfuscation patterns like "at gmail dot com"
const OBFUSCATED_EMAIL = /\b[a-zA-Z0-9._%+-]+\s*(?:\[at\]|@|at)\s*[a-zA-Z0-9.-]+\s*(?:\[dot\]|dot|\.)\s*(?:com|org|net|io|co)\b/i;

/* ─── Types ──────────────────────────────────────────────── */

export interface ComplianceScanResult {
  flagged: boolean;
  reasons: string[];
}

/* ─── Scanner ────────────────────────────────────────────── */

export function scanForContactInfo(text: string): ComplianceScanResult {
  const reasons: string[] = [];

  if (EMAIL_PATTERN.test(text)) {
    reasons.push('Contains email address');
  }
  if (OBFUSCATED_EMAIL.test(text)) {
    reasons.push('Contains obfuscated email address');
  }
  if (URL_PATTERN.test(text)) {
    reasons.push('Contains URL/link');
  }
  // Phone check — only flag if the number has 7+ digits to avoid false positives on short numbers
  const phoneMatch = text.match(PHONE_PATTERN);
  if (phoneMatch) {
    const digitsOnly = phoneMatch[0].replace(/\D/g, '');
    if (digitsOnly.length >= 7) {
      reasons.push('Contains phone number');
    }
  }

  return {
    flagged: reasons.length > 0,
    reasons,
  };
}
