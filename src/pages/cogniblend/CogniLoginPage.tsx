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
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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

  const hasError = !!serverError;

  // ═══════════════════════════════════════════
  // SECTION 8: Render
  // ═══════════════════════════════════════════
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-[400px]">
        {/* Branding */}
        <div className="text-center mb-8">
          <h1
            className="font-bold"
            style={{ fontSize: 28, color: '#1F3864' }}
          >
            CogniBlend
          </h1>
          <p
            className="italic text-muted-foreground mt-1"
            style={{ fontSize: 14 }}
          >
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
              className="text-primary hover:underline"
              style={{ fontSize: 13 }}
            >
              Forgot password?
            </button>
          </div>

          {/* Back to main login */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-muted-foreground hover:text-foreground hover:underline"
              style={{ fontSize: 13 }}
            >
              ← Back to main login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
