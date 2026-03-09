/**
 * OrgAdminLoginPage — SCR-SOA-06: Dedicated login for Org Admins at /org/login
 * Handles deactivated/suspended status messages (Gap 12).
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Loader2, Eye, EyeOff, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MAX_FAILURES = 5;
const LOCKOUT_MINUTES = 15;

export default function OrgAdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [failureCount, setFailureCount] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);

  const isLocked = lockedUntil && new Date() < lockedUntil;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      toast.error(`Account locked. Try again after ${LOCKOUT_MINUTES} minutes.`);
      return;
    }
    if (!email || !password) return;
    setIsLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        const newCount = failureCount + 1;
        setFailureCount(newCount);
        if (newCount >= MAX_FAILURES) {
          setLockedUntil(new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000));
          toast.error(`Too many failed attempts. Locked for ${LOCKOUT_MINUTES} minutes.`);
        } else {
          toast.error(`Invalid credentials. ${MAX_FAILURES - newCount} attempts remaining.`);
        }
        return;
      }

      // Validate org admin access
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication failed');

      const { data: orgUser } = await supabase
        .from('org_users')
        .select('organization_id, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!orgUser) {
        await supabase.auth.signOut();
        toast.error('No active organization found for this account.');
        return;
      }

      // Check seeking_org_admins status — include deactivated/suspended for specific messages
      const { data: adminRecord } = await supabase
        .from('seeking_org_admins')
        .select('admin_tier, status')
        .eq('organization_id', orgUser.organization_id)
        .eq('email', email)
        .limit(1)
        .maybeSingle();

      if (!adminRecord) {
        await supabase.auth.signOut();
        toast.error('You are not registered as an organization admin.');
        return;
      }

      // Status-specific messages
      if (adminRecord.status === 'deactivated') {
        await supabase.auth.signOut();
        toast.error('Your account has been deactivated. Contact your Primary Admin or Platform Admin.');
        return;
      }

      if (adminRecord.status === 'suspended') {
        await supabase.auth.signOut();
        toast.error('Your account has been suspended. Contact your Primary Admin or Platform Admin.');
        return;
      }

      if (adminRecord.status === 'pending_activation') {
        await supabase.auth.signOut();
        toast.error('Your account is pending activation. Please check your email for the activation link.');
        return;
      }

      if (adminRecord.status !== 'active') {
        await supabase.auth.signOut();
        toast.error('Your account is not active. Contact your organization administrator.');
        return;
      }

      setFailureCount(0);
      toast.success('Login successful');
      navigate('/org/dashboard');
    } catch (err: any) {
      toast.error(err.message ?? 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Portal Identity Banner */}
        <div className="text-center space-y-2">
          <Building2 className="h-10 w-10 mx-auto text-primary" />
          <h1 className="text-xl font-bold text-foreground">Seeking Organisation Admin Portal</h1>
          <p className="text-sm text-muted-foreground">Sign in to manage your organization</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your organization portal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  disabled={!!isLocked}
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={!!isLocked}
                    className="text-base"
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
              </div>

              {isLocked && (
                <p className="text-xs text-destructive">
                  Account temporarily locked due to too many failed attempts. Try again later.
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading || !!isLocked}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Platform Admin Info Banner */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Looking to manage the platform?{' '}
            <Link to="/login" className="text-primary underline hover:text-primary/80">
              Sign in at the main portal
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
