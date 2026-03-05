/**
 * TcReAcceptanceModal — Blocking modal for T&C re-acceptance.
 * Shown when org's tc_version_accepted doesn't match latest tc_versions entry.
 * If org status is 'verified', acceptance also transitions to 'active'.
 */
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useTcVersionCheck } from '@/hooks/queries/useTcVersionCheck';
import { useActivateOrgOnTcAcceptance, useAcceptTcVersion } from '@/hooks/queries/useFirstLoginCheck';

interface TcReAcceptanceModalProps {
  orgId: string;
  orgVerificationStatus: string;
  currentTcVersion: string | null | undefined;
}

export function TcReAcceptanceModal({ orgId, orgVerificationStatus, currentTcVersion }: TcReAcceptanceModalProps) {
  const [accepted, setAccepted] = useState(false);
  const { needsReAcceptance, latestVersion, isLoading } = useTcVersionCheck(orgId, currentTcVersion);
  const activateOrg = useActivateOrgOnTcAcceptance();
  const acceptTc = useAcceptTcVersion();

  const isFirstLogin = orgVerificationStatus === 'verified';
  const mutation = isFirstLogin ? activateOrg : acceptTc;

  if (isLoading || !needsReAcceptance) return null;

  const handleAccept = () => {
    if (!latestVersion) return;
    mutation.mutate({ orgId, tcVersion: latestVersion.version });
  };

  return (
    <Dialog open={needsReAcceptance} onOpenChange={() => {}}>
      <DialogContent className="w-full max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isFirstLogin ? 'Welcome — Accept Terms & Conditions' : 'Updated Terms & Conditions'}
          </DialogTitle>
          <DialogDescription>
            {isFirstLogin
              ? 'Before accessing the platform, please review and accept our Terms & Conditions.'
              : `Our Terms & Conditions have been updated to version ${latestVersion?.version}. Please review and accept to continue.`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {latestVersion?.content_url && (
            <a
              href={latestVersion.content_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline hover:text-primary/80"
            >
              View full Terms & Conditions (v{latestVersion.version})
            </a>
          )}

          <div className="flex items-start gap-3">
            <Checkbox
              id="tc-accept"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
            />
            <label htmlFor="tc-accept" className="text-sm text-foreground cursor-pointer leading-snug">
              I have read and accept the Terms & Conditions
              {isFirstLogin && ', Privacy Policy, and Data Processing Agreement'}
              {latestVersion ? ` (version ${latestVersion.version})` : ''}.
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleAccept} disabled={!accepted || mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isFirstLogin ? 'Accept & Activate' : 'Accept & Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
