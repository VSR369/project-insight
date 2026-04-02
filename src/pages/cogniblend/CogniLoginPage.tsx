/**
 * CogniBlend Login Page
 * Route: /cogni/login
 * Redirects to /cogni/dashboard if already authenticated.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CogniLoginDevTools } from './CogniLoginDevTools';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const TEST_PASSWORD = 'CogniTest2026!';

export default function CogniLoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, signIn, loading } = useAuth();
  const navigate = useNavigate();

  const {
    register, handleSubmit, setValue,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  if (!loading && user) {
    navigate('/cogni/dashboard', { replace: true });
    return null;
  }

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const { error } = await signIn(data.email, data.password);
      if (error) { setServerError('Invalid email or password. Please try again.'); }
      else { navigate('/cogni/dashboard', { replace: true }); }
    } catch { setServerError('Invalid email or password. Please try again.'); }
    finally { setIsSubmitting(false); }
  };

  const handleQuickLogin = async (email: string) => {
    setServerError(null);
    setIsSubmitting(true);
    setValue('email', email);
    setValue('password', TEST_PASSWORD);
    try {
      const { error } = await signIn(email, TEST_PASSWORD);
      if (error) { setServerError(`Quick login failed for ${email}. Seed data first.`); }
      else { navigate('/cogni/dashboard', { replace: true }); }
    } catch { setServerError(`Quick login failed for ${email}. Seed data first.`); }
    finally { setIsSubmitting(false); }
  };

  const hasError = !!serverError;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[480px]">
        <div className="text-center mb-8">
          <h1 className="font-bold text-[28px]" style={{ color: '#1F3864' }}>CogniBlend</h1>
          <p className="italic text-muted-foreground mt-1 text-sm">Open Innovation Platform</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Input type="email" placeholder="Email address" autoComplete="email"
              className={`h-11 text-base ${errors.email || hasError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              {...register('email')} />
            {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <Input type="password" placeholder="Password" autoComplete="current-password"
              className={`h-11 text-base ${errors.password || hasError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              {...register('password')} />
            {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
          </div>

          {serverError && <p className="text-destructive text-sm">{serverError}</p>}

          <Button type="submit" disabled={isSubmitting} className="w-full font-bold text-sm"
            style={{ height: 44, borderRadius: 8, backgroundColor: '#378ADD', color: '#FFFFFF', fontSize: 14 }}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : 'Sign In'}
          </Button>

          <div className="text-center">
            <button type="button" onClick={() => navigate('/forgot-password')} className="text-primary hover:underline text-[13px]">Forgot password?</button>
          </div>

          <div className="text-center pt-2">
            <Link to="/login" className="text-primary hover:underline text-sm font-medium">
              Switch to Platform Login (Admin / Provider / Reviewer) →
            </Link>
          </div>

          <div className="text-center pt-1">
            <Link to="/cogni/demo-login" className="text-muted-foreground hover:text-primary hover:underline text-xs">
              🎯 Demo Quick-Login (New Horizon Company) →
            </Link>
          </div>
        </form>

        <CogniLoginDevTools isSubmitting={isSubmitting} onQuickLogin={handleQuickLogin} />
      </div>
    </div>
  );
}
