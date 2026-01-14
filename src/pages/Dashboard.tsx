import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { User, CheckCircle, Clock, FileText, ArrowRight, Target, GraduationCap, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const { isAdmin, isLoading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();

  // Redirect platform admins to admin dashboard
  useEffect(() => {
    if (!rolesLoading && isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [isAdmin, rolesLoading, navigate]);

  const firstName = user?.user_metadata?.first_name || 'Provider';

  const profileCompletion = 10;

  const nextSteps = [
    {
      step: 1,
      title: 'Choose Participation Mode',
      description: 'Select how you want to engage with clients',
      icon: Target,
      href: '/profile/build/choose-mode',
      completed: false,
      locked: false,
    },
    {
      step: 2,
      title: 'Select Expertise Level',
      description: 'Define your experience level',
      icon: GraduationCap,
      href: '/profile/build/expertise',
      completed: false,
      locked: true,
    },
    {
      step: 3,
      title: 'Add Proof Points',
      description: 'Showcase your work and achievements',
      icon: Award,
      href: '/profile/build/proof-points',
      completed: false,
      locked: true,
    },
  ];

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Welcome back, {firstName}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">Here's your profile overview</p>
          </div>
          <Button onClick={() => navigate('/profile/build/choose-mode')}>
            Continue Setup
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Profile Status
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Registered</div>
              <p className="text-xs text-muted-foreground">Complete your profile</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Profile Completion
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profileCompletion}%</div>
              <Progress value={profileCompletion} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Proof Points
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Add your evidence</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Tasks
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Actions required</p>
            </CardContent>
          </Card>
        </div>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>Complete these steps to build your profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {nextSteps.map((step) => (
              <div
                key={step.step}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                  step.locked
                    ? 'bg-muted/30 opacity-60'
                    : step.completed
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-muted/50 hover:bg-muted/80 cursor-pointer'
                }`}
                onClick={() => !step.locked && navigate(step.href)}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step.completed
                      ? 'bg-green-500/10 text-green-500'
                      : step.locked
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{step.title}</h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {step.description}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={step.locked ? 'outline' : 'default'}
                  disabled={step.locked}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(step.href);
                  }}
                >
                  {step.locked ? 'Locked' : step.completed ? 'View' : 'Start'}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
