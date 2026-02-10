/**
 * OtpVerification
 * 
 * 6-digit OTP entry component with attempt tracking and resend.
 * Implements BR-REG-006 rate limiting UX.
 */

import { useState, useEffect } from 'react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { OTP_CONFIG } from '@/config/registration';

interface OtpVerificationProps {
  email: string;
  isVerified: boolean;
  isSending: boolean;
  isVerifying: boolean;
  onSendOtp: () => void;
  onVerifyOtp: (code: string) => void;
}

export function OtpVerification({
  email,
  isVerified,
  isSending,
  isVerifying,
  onSendOtp,
  onVerifyOtp,
}: OtpVerificationProps) {
  // ══════════════════════════════════════
  // SECTION 1: useState hooks
  // ══════════════════════════════════════
  const [otpValue, setOtpValue] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // ══════════════════════════════════════
  // SECTION 5: useEffect hooks
  // ══════════════════════════════════════
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // ══════════════════════════════════════
  // SECTION 6: Conditional returns
  // ══════════════════════════════════════
  if (isVerified) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>Email verified successfully</span>
      </div>
    );
  }

  // ══════════════════════════════════════
  // SECTION 7: Event handlers
  // ══════════════════════════════════════
  const handleSendOtp = () => {
    onSendOtp();
    setOtpSent(true);
    setCooldown(60); // 60s cooldown between resends
    setOtpValue('');
  };

  const handleOtpComplete = (value: string) => {
    setOtpValue(value);
    if (value.length === OTP_CONFIG.CODE_LENGTH) {
      onVerifyOtp(value);
    }
  };

  // ══════════════════════════════════════
  // SECTION 8: Render
  // ══════════════════════════════════════
  if (!otpSent) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          We'll send a {OTP_CONFIG.CODE_LENGTH}-digit code to <strong>{email}</strong> to verify ownership.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={handleSendOtp}
          disabled={isSending || !email}
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending…
            </>
          ) : (
            'Send Verification Code'
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter the {OTP_CONFIG.CODE_LENGTH}-digit code sent to <strong>{email}</strong>.
        Valid for {OTP_CONFIG.VALIDITY_MINUTES} minutes.
      </p>

      <div className="flex items-center gap-4">
        <InputOTP
          maxLength={OTP_CONFIG.CODE_LENGTH}
          value={otpValue}
          onChange={handleOtpComplete}
          disabled={isVerifying}
        >
          <InputOTPGroup>
            {Array.from({ length: OTP_CONFIG.CODE_LENGTH }).map((_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>

        {isVerifying && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSendOtp}
          disabled={isSending || cooldown > 0}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
        </Button>
      </div>
    </div>
  );
}
