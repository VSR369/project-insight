import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, LogIn, Shield, User, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, LoginFormData } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Development test accounts - only visible in dev mode
const DEV_ACCOUNTS = [
  {
    role: 'Platform Admin',
    email: 'admin@test.local',
    password: 'Admin123!',
    icon: Shield,
    description: 'Full system access',
    color: 'text-destructive',
  },
  {
    role: 'Solution Provider',
    email: 'provider@test.local',
    password: 'Provider123!',
    icon: User,
    description: 'Provider dashboard access',
    color: 'text-primary',
  },
];

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDevAccounts, setShowDevAccounts] = useState(true);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  // Redirect if already logged in
  if (user) {
    navigate(from, { replace: true });
    return null;
  }

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const { error } = await signIn(data.email, data.password);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Please verify your email before signing in');
        } else {
          toast.error(error.message);
        }
        return;
      }
      
      // Fetch user roles to determine redirect destination
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.session.user.id);
        
        const isPlatformAdmin = roles?.some(r => r.role === 'platform_admin');
        
        toast.success('Welcome back!');
        navigate(isPlatformAdmin ? '/admin' : from, { replace: true });
      } else {
        toast.success('Welcome back!');
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">CogniBlend</h1>
          <p className="text-muted-foreground mt-2">Solution Provider Platform</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <LogIn className="h-4 w-4 mr-2" />
                  )}
                  Sign In
                </Button>

              <p className="text-sm text-center text-muted-foreground">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-primary hover:underline font-medium">
                    Create account
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Quick Login Section - Test Accounts */}
        <Card className="border-dashed border-amber-500/50 bg-amber-500/5 mt-4">
          <CardHeader className="pb-2">
            <button
              type="button"
              onClick={() => setShowDevAccounts(!showDevAccounts)}
              className="flex items-center justify-between w-full text-left"
            >
              <div>
                <CardTitle className="text-sm font-medium text-amber-600">
                  Quick Login (Test Accounts)
                </CardTitle>
                <CardDescription className="text-xs">
                  Click to auto-fill test credentials
                </CardDescription>
              </div>
              {showDevAccounts ? (
                <ChevronUp className="h-4 w-4 text-amber-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-amber-600" />
              )}
            </button>
          </CardHeader>
          {showDevAccounts && (
            <CardContent className="pt-2">
              <div className="grid grid-cols-2 gap-3">
                {DEV_ACCOUNTS.map((account) => {
                  const Icon = account.icon;
                  return (
                    <button
                      key={account.role}
                      type="button"
                      onClick={() => {
                        form.setValue('email', account.email);
                        form.setValue('password', account.password);
                        toast.info(`Credentials filled for ${account.role}`);
                      }}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    >
                      <Icon className={`h-5 w-5 ${account.color}`} />
                      <div className="text-center">
                        <p className="text-xs font-medium">{account.role}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                          {account.email}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
