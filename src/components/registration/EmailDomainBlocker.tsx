/**
 * EmailDomainBlocker
 * 
 * Real-time email domain validation against the blocklist (BR-REG-005).
 * Shows inline warning when user types a blocked domain.
 * Allows .edu, .ac., .gov domains regardless.
 */

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { extractDomain, isInstitutionalDomain } from '@/lib/validations/primaryContact';

interface EmailDomainBlockerProps {
  email: string;
  blockedDomains: string[];
  isLoading: boolean;
}

export function EmailDomainBlocker({ email, blockedDomains, isLoading }: EmailDomainBlockerProps) {
  if (!email || !email.includes('@') || isLoading) return null;

  const domain = extractDomain(email);
  if (!domain) return null;

  // Institutional domains always allowed
  if (isInstitutionalDomain(domain)) {
    return (
      <div className="flex items-center gap-2 text-xs text-primary">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>Institutional domain accepted</span>
      </div>
    );
  }

  const isBlocked = blockedDomains.some(
    (blocked) => domain === blocked || domain.endsWith(`.${blocked}`),
  );

  if (isBlocked) {
    return (
      <div className="flex items-center gap-2 text-xs text-destructive">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>Free email providers are not allowed. Please use your corporate email.</span>
      </div>
    );
  }

  return null;
}
