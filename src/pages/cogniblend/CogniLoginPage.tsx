/**
 * CogniBlend Login Page
 * Route: /cogni/login
 * Redirects to /cogni/dashboard if already authenticated.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Database } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function CogniLoginPage() {
  // ═══════════════════════════════════════════
  // SECTION 1: useState
  // ═══════════════════════════════════════════
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedLog, setSeedLog] = useState<string[] | null>(null);

  // ═══════════════════════════════════════════
  // SECTION 2: Context and custom hooks
  // ═══════════════════════════════════════════
  const { user, signIn, loading } = useAuth();
  const navigate = useNavigate();

  // ═══════════════════════════════════════════
  // SECTION 3: Form hooks
  // ═══════════════════════════════════════════
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // ═══════════════════════════════════════════
  // SECTION 6: Conditional returns (AFTER ALL HOOKS)
  // ═══════════════════════════════════════════
  if (!loading && user) {
    navigate('/cogni/dashboard', { replace: true });
    return null;
  }

  // ═══════════════════════════════════════════
  // SECTION 7: Event handlers
  // ═══════════════════════════════════════════
  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const { error } = await signIn(data.email, data.password);
      if (error) {
        setServerError('Invalid email or password. Please try again.');
      } else {
        navigate('/cogni/dashboard', { replace: true });
      }
    } catch {
      setServerError('Invalid email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    setSeedLog(null);
    try {
      const { data, error } = await supabase.functions.invoke('seed-cogni-test-data');
      if (error) {
        toast.error(`Seed failed: ${error.message}`);
        return;
      }
      if (data?.success) {
        setSeedLog(data.data.results);
        toast.success('CogniBlend test data seeded successfully!');
      } else {
        toast.error(data?.error?.message ?? 'Seeding failed');
      }
    } catch (err: unknown) {
      toast.error(`Seed error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const hasError = !!serverError;

  // ═══════════════════════════════════════════
  // SECTION 8: Render
  // ═══════════════════════════════════════════
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px]">
        {/* Branding */}
        <div className="text-center mb-8">
          <h1
            className="font-bold text-[28px]"
            style={{ color: '#1F3864' }}
          >
            CogniBlend
          </h1>
          <p className="italic text-muted-foreground mt-1 text-sm">
            Open Innovation Platform
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div>
            <Input
              type="email"
              placeholder="Email address"
              autoComplete="email"
              className={`h-11 text-base ${
                errors.email || hasError
                  ? 'border-destructive focus-visible:ring-destructive'
                  : ''
              }`}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-destructive text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <Input
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              className={`h-11 text-base ${
                errors.password || hasError
                  ? 'border-destructive focus-visible:ring-destructive'
                  : ''
              }`}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-destructive text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Server error */}
          {serverError && (
            <p className="text-destructive text-sm">{serverError}</p>
          )}

          {/* Sign In button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full font-bold text-sm"
            style={{
              height: 44,
              borderRadius: 8,
              backgroundColor: '#378ADD',
              color: '#FFFFFF',
              fontSize: 14,
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>

          {/* Forgot password */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-primary hover:underline text-[13px]"
            >
              Forgot password?
            </button>
          </div>

          {/* Back to main login */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-muted-foreground hover:text-foreground hover:underline text-[13px]"
            >
              ← Back to main login
            </button>
          </div>
        </form>

        {/* Dev-only: Seed CogniBlend Data */}
        <div className="mt-8 border-t border-border pt-6">
          <p className="text-xs text-muted-foreground text-center mb-3">Developer Tools</p>
          <Button
            type="button"
            variant="outline"
            disabled={isSeeding}
            onClick={handleSeedData}
            className="w-full text-sm"
          >
            {isSeeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Seeding test data...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Seed CogniBlend Test Data
              </>
            )}
          </Button>

          {seedLog && (
            <div className="mt-3 rounded-md bg-muted p-3 text-xs font-mono max-h-60 overflow-y-auto">
              {seedLog.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap">{line}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
