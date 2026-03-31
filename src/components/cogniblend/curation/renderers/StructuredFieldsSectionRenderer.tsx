/**
 * StructuredFieldsSectionRenderer — Read-only display for structured data.
 * Used for: escrow_funding (always read-only)
 * Phase 3: Added escrow toggle for STRUCTURED governance (optional escrow).
 */

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ShieldCheck, AlertTriangle } from "lucide-react";

interface EscrowData {
  escrow_status: string;
  deposit_amount: number;
  remaining_amount: number;
  bank_name: string | null;
  bank_branch: string | null;
  bank_address: string | null;
  currency: string | null;
  deposit_date: string | null;
  deposit_reference: string | null;
  fc_notes: string | null;
}

interface StructuredFieldsSectionRendererProps {
  escrow: EscrowData | null;
  isControlledMode: boolean;
  /** Governance mode for toggle logic */
  governanceMode?: 'QUICK' | 'STRUCTURED' | 'CONTROLLED';
  /** Whether escrow is enabled (for STRUCTURED toggle) */
  escrowEnabled?: boolean;
  /** Callback when escrow toggle changes */
  onEscrowToggle?: (enabled: boolean) => void;
}

export function StructuredFieldsSectionRenderer({
  escrow,
  isControlledMode,
  governanceMode,
  escrowEnabled,
  onEscrowToggle,
}: StructuredFieldsSectionRendererProps) {
  // QUICK mode: escrow never required
  if (!isControlledMode && governanceMode !== 'STRUCTURED') {
    return (
      <div className="flex items-start gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-sm text-emerald-700">Escrow not required for this governance mode.</p>
      </div>
    );
  }

  // STRUCTURED mode: optional toggle
  if (governanceMode === 'STRUCTURED') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="escrow-toggle" className="text-sm font-medium cursor-pointer">
              Enable escrow for this challenge
            </Label>
          </div>
          <Switch
            id="escrow-toggle"
            checked={escrowEnabled ?? false}
            onCheckedChange={onEscrowToggle}
          />
        </div>
        {escrowEnabled ? (
          escrow ? (
            <EscrowDetails escrow={escrow} />
          ) : (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Escrow enabled. Finance Coordinator has not yet set up funding.
              </p>
            </div>
          )
        ) : (
          <p className="text-xs text-muted-foreground">
            Escrow is optional for Structured governance. Enable to require funding before publication.
          </p>
        )}
      </div>
    );
  }

  // CONTROLLED mode: mandatory escrow
  if (!escrow) {
    return (
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          No escrow record found. Finance Coordinator has not yet set up funding.
        </p>
      </div>
    );
  }

  return <EscrowDetails escrow={escrow} />;
}

function EscrowDetails({ escrow }: { escrow: EscrowData }) {
  const isFunded = escrow.escrow_status === "FUNDED";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {isFunded ? (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs hover:bg-emerald-100">
            <ShieldCheck className="h-3 w-3 mr-1" />FUNDED
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
            <AlertTriangle className="h-3 w-3 mr-1" />{escrow.escrow_status || "PENDING"}
          </Badge>
        )}
      </div>
      {isFunded && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Deposit Amount</p>
            <p className="font-medium text-foreground">{escrow.currency ?? "$"} {escrow.deposit_amount.toLocaleString()}</p>
          </div>
          {escrow.bank_name && (
            <div>
              <p className="text-xs text-muted-foreground">Bank</p>
              <p className="font-medium text-foreground">{escrow.bank_name}</p>
            </div>
          )}
          {escrow.bank_branch && (
            <div>
              <p className="text-xs text-muted-foreground">Branch</p>
              <p className="text-foreground">{escrow.bank_branch}</p>
            </div>
          )}
          {escrow.deposit_date && (
            <div>
              <p className="text-xs text-muted-foreground">Deposit Date</p>
              <p className="text-foreground">{new Date(escrow.deposit_date).toLocaleDateString()}</p>
            </div>
          )}
          {escrow.deposit_reference && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Reference</p>
              <p className="text-foreground font-mono text-xs">{escrow.deposit_reference}</p>
            </div>
          )}
          {escrow.fc_notes && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">FC Notes</p>
              <p className="text-foreground text-xs italic">{escrow.fc_notes}</p>
            </div>
          )}
        </div>
      )}
      {!isFunded && (
        <p className="text-xs text-amber-700">Finance Coordinator has not yet confirmed the deposit.</p>
      )}
    </div>
  );
}
