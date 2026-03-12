/**
 * SecuritySettingsPage — MFA Setup & Management
 * Allows admin users to enroll/unenroll TOTP factors.
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ShieldCheck, ShieldAlert, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { handleMutationError } from "@/lib/errorHandler";

interface TotpFactor {
  id: string;
  friendly_name?: string;
  status: "verified" | "unverified";
  created_at: string;
}

type EnrollmentState =
  | { step: "idle" }
  | { step: "enrolling"; factorId: string; qrCode: string; secret: string }
  | { step: "verifying"; factorId: string }
  | { step: "complete" };

export default function SecuritySettingsPage() {
  // ═══ useState ═══
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<EnrollmentState>({ step: "idle" });
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [unenrolling, setUnenrolling] = useState<string | null>(null);

  // ═══ Context / custom hooks ═══
  const { user } = useAuth();
  const navigate = useNavigate();

  // ═══ useEffect ═══
  const loadFactors = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setFactors(
        data.totp.map((f) => ({
          id: f.id,
          friendly_name: f.friendly_name ?? undefined,
          status: f.status as "verified" | "unverified",
          created_at: f.created_at,
        }))
      );
    } catch (err) {
      handleMutationError(err as Error, { operation: "load_mfa_factors" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadFactors();
  }, [user, loadFactors]);

  // ═══ Loading guard ═══
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ═══ Handlers ═══
  const handleEnroll = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      setEnrollment({
        step: "enrolling",
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setOtpCode("");
    } catch (err) {
      handleMutationError(err as Error, { operation: "enroll_mfa" });
    }
  };

  const handleVerify = async () => {
    if (enrollment.step !== "enrolling" || otpCode.length !== 6) return;
    setVerifying(true);
    try {
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: enrollment.factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollment.factorId,
        challengeId: challengeData.id,
        code: otpCode,
      });
      if (verifyError) throw verifyError;

      toast.success("MFA enabled successfully");
      setEnrollment({ step: "complete" });
      await loadFactors();
    } catch (err) {
      toast.error("Verification failed. Please check your code and try again.");
      handleMutationError(err as Error, { operation: "verify_mfa" });
    } finally {
      setVerifying(false);
    }
  };

  const handleUnenroll = async (factorId: string) => {
    setUnenrolling(factorId);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast.success("MFA factor removed");
      await loadFactors();
    } catch (err) {
      handleMutationError(err as Error, { operation: "unenroll_mfa" });
    } finally {
      setUnenrolling(null);
    }
  };

  const verifiedFactors = factors.filter((f) => f.status === "verified");
  const hasVerifiedFactor = verifiedFactors.length > 0;

  // ═══ Render ═══
  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Security Settings</h1>
            <p className="text-sm text-muted-foreground">Manage Multi-Factor Authentication</p>
          </div>
        </div>

        {/* MFA Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {hasVerifiedFactor ? (
                <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : (
                <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              )}
              <div>
                <CardTitle className="text-lg">
                  {hasVerifiedFactor ? "MFA Enabled" : "MFA Not Configured"}
                </CardTitle>
                <CardDescription>
                  {hasVerifiedFactor
                    ? "Your account is protected with multi-factor authentication."
                    : "Admin roles require MFA. Set up an authenticator app to secure your account."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Enrolled factors list */}
            {verifiedFactors.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Enrolled Factors</p>
                {verifiedFactors.map((factor) => (
                  <div
                    key={factor.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {factor.friendly_name || "Authenticator App"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Added {new Date(factor.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleUnenroll(factor.id)}
                      disabled={unenrolling === factor.id}
                    >
                      {unenrolling === factor.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Enrollment flow */}
            {enrollment.step === "idle" && !hasVerifiedFactor && (
              <Button onClick={handleEnroll} className="w-full">
                Set Up Authenticator App
              </Button>
            )}

            {enrollment.step === "enrolling" && (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription className="text-sm">
                    Scan the QR code below with your authenticator app (Google Authenticator, Authy, 1Password, etc.), then enter the 6-digit code to verify.
                  </AlertDescription>
                </Alert>

                {/* QR Code */}
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img
                    src={enrollment.qrCode}
                    alt="MFA QR Code"
                    className="w-48 h-48"
                  />
                </div>

                {/* Manual secret */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    Can't scan? Enter this key manually:
                  </p>
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono select-all">
                    {enrollment.secret}
                  </code>
                </div>

                {/* OTP Verification */}
                <div className="flex flex-col items-center gap-4">
                  <p className="text-sm font-medium text-foreground">Enter verification code</p>
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={(value) => setOtpCode(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setEnrollment({ step: "idle" })}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleVerify}
                      disabled={otpCode.length !== 6 || verifying}
                    >
                      {verifying && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Verify & Enable
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {enrollment.step === "complete" && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  MFA has been successfully enabled. Your account is now more secure.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
