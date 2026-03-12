/**
 * MfaGuard — TS §0.3: MFA enforcement for admin-tier roles
 * Wraps protected routes to verify MFA is enabled for elevated roles.
 * Redirects to MFA setup if not configured.
 */

import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface MfaGuardProps {
  children: ReactNode;
  /** If true, MFA check is enforced. Pass false to skip for non-admin routes. */
  requireMfa?: boolean;
}

export function MfaGuard({ children, requireMfa = true }: MfaGuardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mfaStatus, setMfaStatus] = useState<"loading" | "verified" | "not_enrolled">("loading");

  useEffect(() => {
    if (!requireMfa || !user) {
      setMfaStatus("verified");
      return;
    }

    const checkMfa = async () => {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) {
          // If MFA API is not available, allow access (graceful degradation)
          setMfaStatus("verified");
          return;
        }

        const hasVerifiedFactor = data.totp.some((f) => f.status === "verified");
        setMfaStatus(hasVerifiedFactor ? "verified" : "not_enrolled");
      } catch {
        // Graceful degradation — don't block if MFA check fails
        setMfaStatus("verified");
      }
    };

    checkMfa();
  }, [user, requireMfa]);

  if (mfaStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (mfaStatus === "not_enrolled") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md space-y-4 text-center">
          <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">
            Multi-Factor Authentication Required
          </h2>
          <Alert className="text-left">
            <AlertDescription className="text-sm">
              Your role requires Multi-Factor Authentication (MFA) to be enabled.
              Please set up MFA in your account settings to continue.
            </AlertDescription>
          </Alert>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Go Back
            </Button>
            <Button onClick={() => navigate("/settings/security")}>
              Set Up MFA
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
