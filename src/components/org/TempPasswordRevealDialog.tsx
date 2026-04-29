/**
 * TempPasswordRevealDialog
 *
 * Shown ONCE after a delegated admin or similar account is created, to let
 * the org PRIMARY copy the generated temporary password before it disappears.
 *
 * UX parity with `AdminCredentialsCard.tsx` on the platform-admin path:
 *  - Masked by default with a reveal toggle (Eye / EyeOff)
 *  - Copy-to-clipboard button
 *  - "I have saved this — close" confirmation button
 *  - Password is never persisted beyond the dialog lifecycle (parent owns it
 *    in a transient ref/state and clears on close).
 */

import { useState } from 'react';
import { Copy, Eye, EyeOff, AlertTriangle, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TempPasswordRevealDialogProps {
  open: boolean;
  onClose: () => void;
  adminName: string;
  adminEmail: string;
  tempPassword: string;
}

export function TempPasswordRevealDialog({
  open,
  onClose,
  adminName,
  adminEmail,
  tempPassword,
}: TempPasswordRevealDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      toast.success('Temporary password copied to clipboard');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy password — please select and copy manually');
    }
  };

  const handleClose = () => {
    setShowPassword(false);
    setCopied(false);
    setAcknowledged(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Block dismiss-by-escape / outside-click until acknowledged
        if (!next && acknowledged) handleClose();
      }}
    >
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (!acknowledged) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Temporary password generated</DialogTitle>
          <DialogDescription>
            Share this one-time password with <strong>{adminName}</strong> at{' '}
            <span className="font-mono">{adminEmail}</span>. They will be required
            to change it on first sign-in.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            This password is shown <strong>once</strong>. It cannot be retrieved
            later. Copy it now and deliver it through a secure channel.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">Temporary Password</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <p className="flex-1 text-sm font-mono bg-muted px-3 py-2 rounded select-all break-all">
              {showPassword ? tempPassword : '••••••••••••'}
            </p>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopy}
              aria-label="Copy password to clipboard"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-2 pt-2">
          <input
            id="temp-password-ack"
            type="checkbox"
            className="mt-1"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
          <label
            htmlFor="temp-password-ack"
            className="text-xs text-muted-foreground leading-snug cursor-pointer"
          >
            I have saved this password and understand it cannot be shown again.
          </label>
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleClose} disabled={!acknowledged}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
