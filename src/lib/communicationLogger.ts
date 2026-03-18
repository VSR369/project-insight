/**
 * communicationLogger — Logs all Q&A and notification messages to communication_log.
 * Performs keyword scanning for contact information (BR-COM-003).
 */

import { supabase } from '@/integrations/supabase/client';

/* ─── Keyword scanning patterns ───────────────────────── */

const EMAIL_PATTERN = /@/;
const PHONE_PATTERN = /\d{10,}/;
const URL_PATTERN = /https?:\/\//i;

export interface ContactScanResult {
  flagged: boolean;
  flagReason: string | null;
}

/** Scan message text for contact information patterns. */
export function scanForContactPatterns(text: string): ContactScanResult {
  const normalised = text.replace(/[\s\-().]/g, '');
  const hasEmail = EMAIL_PATTERN.test(text);
  const hasPhone = PHONE_PATTERN.test(normalised);
  const hasUrl = URL_PATTERN.test(text);

  if (hasEmail || hasPhone || hasUrl) {
    return { flagged: true, flagReason: 'CONTACT_INFO_DETECTED' };
  }
  return { flagged: false, flagReason: null };
}

/** Log a message to the communication_log table. */
export async function logCommunication(params: {
  challengeId: string;
  senderId: string;
  messageText: string;
  channel: 'QA' | 'NOTIFICATION';
}): Promise<void> {
  const scan = scanForContactPatterns(params.messageText);

  await supabase.from('communication_log' as any).insert({
    challenge_id: params.challengeId,
    sender_id: params.senderId,
    message_text: params.messageText,
    channel: params.channel,
    flagged: scan.flagged,
    flag_reason: scan.flagReason,
    created_by: params.senderId,
  });
}
