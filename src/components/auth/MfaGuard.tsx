/**
 * MfaGuard — TS §0.3: MFA enforcement for admin-tier roles
 * Uses graceful degradation: shows a dismissible warning banner
 * instead of fully blocking access when MFA is not enrolled.
 * Once the user sets up MFA via /settings/security, the banner disappears.
 */

import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ShieldAlert, X } from "lucide-react";
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
  const [bannerDismissed, setBannerDismissed] = useState(false);

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

  // Graceful degradation: show dismissible banner instead of blocking
  return (
    <>
      {mfaStatus === "not_enrolled" && !bannerDismissed && (
        <div className="sticky top-0 z-50 w-full bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
              <strong>MFA Required:</strong> Your admin role requires Multi-Factor Authentication.{" "}
              <Button
                variant="link"
                className="h-auto p-0 text-sm text-amber-900 dark:text-amber-100 underline font-semibold"
                onClick={() => navigate("/settings/security")}
              >
                Set up MFA now
              </Button>
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900"
              onClick={() => setBannerDismissed(true)}
              aria-label="Dismiss MFA warning"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
