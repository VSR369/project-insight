/**
 * ActivationPage — Public route for admin activation (/activate?token=)
 * Sets password + activates seeking org admin account.
 */

import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle2, AlertTriangle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

type PageState = 'loading' | 'valid' | 'expired' | 'used' | 'invalid' | 'success' | 'error';

export default function ActivationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [pageState, setPageState] = useState<PageState>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tcAccepted, setTcAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setPageState('invalid');
      return;
    }

    const validateToken = async () => {
      // Hash the token for lookup (supports both hashed and plain tokens)
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Try hashed token first, then plain for backward compatibility
      let result = await supabase
        .from('admin_activation_links')
        .select('id, expires_at, status, used_at')
        .eq('token', tokenHash)
        .maybeSingle();

      if (!result.data) {
        result = await supabase
          .from('admin_activation_links')
          .select('id, expires_at, status, used_at')
          .eq('token', token)
          .maybeSingle();
      }

      const { data, error } = result;

      if (error || !data) {
        setPageState('invalid');
        return;
      }

      if (data.status === 'used' || data.used_at) {
        setPageState('used');
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setPageState('expired');
        return;
      }

      setPageState('valid');
    };

    validateToken();
  }, [token]);

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const meetsAllRules = password.length >= 8 && hasUpper && hasLower && hasNumber && hasSpecial;

  const passwordStrength = (() => {
    if (password.length < 8) return { label: 'Too short', color: 'text-destructive' };
    const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    if (score <= 2) return { label: 'Weak', color: 'text-destructive' };
    if (score === 3) return { label: 'Good', color: 'text-orange-500' };
    return { label: 'Strong', color: 'text-green-500' };
  })();

  const canSubmit = meetsAllRules && password === confirmPassword && tcAccepted && !isSubmitting;

  const handleActivate = async () => {
    if (!canSubmit || !token) return;
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-activation', {
        body: { token, password },
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: { message: string } };
      if (!result.success) {
        throw new Error(result.error?.message ?? 'Activation failed');
      }

      setPageState('success');
      toast.success('Account activated successfully');
    } catch (err: any) {
      toast.error(err.message ?? 'Activation failed');
      setPageState('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (pageState === 'invalid' || pageState === 'expired' || pageState === 'used') {
    const messages = {
      invalid: { title: 'Invalid Link', desc: 'This activation link is not valid. Please contact your organization administrator.' },
      expired: { title: 'Link Expired', desc: 'This activation link has expired. Please contact your organization administrator for a new one.' },
      used: { title: 'Already Activated', desc: 'This activation link has already been used. You can log in with your credentials.' },
    };
    const msg = messages[pageState];

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-orange-500 mb-2" />
            <CardTitle>{msg.title}</CardTitle>
            <CardDescription>{msg.desc}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link to="/org/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
            <CardTitle>Account Activated!</CardTitle>
            <CardDescription>
              Your account has been activated successfully. You can now log in to manage your organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link to="/org/login">Go to Organisation Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid state — show activation form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <ShieldCheck className="h-12 w-12 mx-auto text-primary mb-2" />
          <CardTitle>Activate Your Account</CardTitle>
          <CardDescription>
            Set your password to activate your organization admin account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-10 w-10"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {password.length > 0 && (
              <div className="space-y-1">
                <p className={`text-xs ${passwordStrength.color}`}>
                  Strength: {passwordStrength.label}
                </p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  <li className={password.length >= 8 ? 'text-green-600' : ''}>• At least 8 characters</li>
                  <li className={hasUpper ? 'text-green-600' : ''}>• One uppercase letter</li>
                  <li className={hasLower ? 'text-green-600' : ''}>• One lowercase letter</li>
                  <li className={hasNumber ? 'text-green-600' : ''}>• One number</li>
                  <li className={hasSpecial ? 'text-green-600' : ''}>• One special character</li>
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="tc"
              checked={tcAccepted}
              onCheckedChange={(v) => setTcAccepted(v === true)}
            />
            <Label htmlFor="tc" className="text-sm leading-tight cursor-pointer">
              I accept the Terms & Conditions and Privacy Policy
            </Label>
          </div>

          <Button
            className="w-full"
            onClick={handleActivate}
            disabled={!canSubmit}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Activate Account
          </Button>

          {pageState === 'error' && (
            <p className="text-xs text-destructive text-center">
              Something went wrong. Please try again or contact support.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
