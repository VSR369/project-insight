/**
 * SCR-10a: Platform Admin AGG Blocked Screen
 * BRD Ref: BR-CORE-004
 * Shown when a Platform Admin attempts to create/manage Aggregator model roles.
 */

import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AggBlockedScreenProps {
  onBack: () => void;
}

export function AggBlockedScreen({ onBack }: AggBlockedScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-5">
      <div className="flex items-center justify-center h-16 w-16 rounded-full bg-destructive/10">
        <ShieldAlert className="h-8 w-8 text-destructive" />
      </div>

      <div className="space-y-2 max-w-md">
        <h2 className="text-xl font-semibold text-foreground">
          Aggregator Roles — Access Restricted
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          As a Platform Admin, you cannot create or manage challenge-level roles
          for the <strong>Aggregator</strong> engagement model. Aggregator roles
          (R4, R5_AGG, R6_AGG, R7_AGG) are exclusively managed by the
          Seeking Organization Admin.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          You can still manage <strong>Core Roles</strong> (R2, R8, R9) which
          apply to both engagement models, and <strong>Aggregator Roles</strong> (R3, R5_MP, R6_MP, R7_MP).
        </p>
      </div>

      <Button variant="outline" onClick={onBack} className="gap-1.5">
        <ArrowLeft className="h-4 w-4" />
        Back to Role Management
      </Button>
    </div>
  );
}
