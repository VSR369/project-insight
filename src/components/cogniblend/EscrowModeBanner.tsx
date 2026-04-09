/**
 * EscrowModeBanner — Governance-aware banner for escrow context.
 * STRUCTURED: optional toggle. CONTROLLED: mandatory notice.
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Info, ShieldAlert, Lock } from 'lucide-react';

interface EscrowModeBannerProps {
  escrowMode: 'optional' | 'mandatory';
  escrowEnabled: boolean;
  onEscrowToggle?: (enabled: boolean) => void;
}

export function EscrowModeBanner({
  escrowMode,
  escrowEnabled,
  onEscrowToggle,
}: EscrowModeBannerProps) {
  if (escrowMode === 'mandatory') {
    return (
      <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
        <ShieldAlert className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-xs text-amber-800 dark:text-amber-300">
          Escrow is <strong>mandatory</strong> for Controlled governance. The full prize amount must be deposited into the platform escrow account before the challenge can be published.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      <Alert className="border-blue-200 bg-blue-50/60 dark:bg-blue-950/20">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-xs text-blue-800 dark:text-blue-300">
          Escrow is <strong>optional</strong> for Structured governance. If enabled, the prize amount is held in escrow until winner confirmation. If not enabled, direct payment applies.
        </AlertDescription>
      </Alert>
      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
        <Label htmlFor="escrow-enable-toggle" className="text-sm font-medium cursor-pointer">
          Enable escrow for this challenge
        </Label>
        <Switch
          id="escrow-enable-toggle"
          checked={escrowEnabled}
          onCheckedChange={onEscrowToggle}
        />
      </div>
    </div>
  );
}
