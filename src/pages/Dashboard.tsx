import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { calculateCurrentStep, getStepUrl } from '@/components/auth/OnboardingGuard';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { User, CheckCircle, Clock, FileText, ArrowRight, Target, GraduationCap, Award, UserCircle, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: provider, isLoading } = useCurrentProvider();

  const firstName = user?.user_metadata?.first_name || provider?.first_name || 'Provider';

  // Calculate profile completion based on provider data
  const calculateProfileCompletion = () => {
    if (!provider) return 0;
    
    let completed = 0;
    const steps = 6;
    
    // Step 1: Registration (basic profile)
    if (provider.first_name && provider.address && provider.country_id && provider.industry_segment_id) {
      completed += 1;
    }
    
    // Step 2: Participation Mode
    if (provider.participation_mode_id) {
      completed += 1;
    }
    
    // Step 3: Organization (conditional - count as done if not required or if exists)
    // For simplicity, count this step if participation mode is set
    if (provider.participation_mode_id) {
      completed += 0.5; // Half point since it's conditional
    }
    
    // Step 4: Expertise Level
    if (provider.expertise_level_id) {
      completed += 1;
    }
    
    // Step 5: Proficiency Areas (TODO: check actual proficiency data)
    // completed += 1;
    
    // Step 6: Proof Points (TODO: check actual proof points)
    // completed += 1;
    
    // Onboarding completed
    if (provider.onboarding_status === 'completed') {
      return 100;
    }
    
    return Math.round((completed / steps) * 100);
  };

  const profileCompletion = calculateProfileCompletion();
  const currentStep = calculateCurrentStep(provider);

  // Redirect to enrollment wizard if onboarding not complete
  useEffect(() => {
    if (!isLoading && provider && provider.onboarding_status !== 'completed') {
      // Redirect to the appropriate enrollment step
      const enrollUrls: Record<number, string> = {
        1: '/enroll/registration',
        2: '/enroll/participation-mode',
        3: '/enroll/organization',
        4: '/enroll/expertise',
        5: '/enroll/proof-points',
        6: '/enroll/proof-points', // Steps 6-9 not yet implemented
      };
      const url = enrollUrls[currentStep] || '/enroll/registration';
      navigate(url);
    }
  }, [isLoading, provider, currentStep, navigate]);

  const nextSteps = [
    {
      step: 1,
      title: 'Complete Registration',
      description: 'Enter your basic profile details',
      icon: UserCircle,
      href: '/profile/build/registration',
      completed: currentStep > 1,
      locked: false,
    },
    {
      step: 2,
      title: 'Choose Participation Mode',
      description: 'Select how you want to engage with clients',
      icon: Target,
      href: '/profile/build/choose-mode',
      completed: currentStep > 2,
      locked: currentStep < 2,
    },
    {
      step: 3,
      title: 'Select Expertise Level',
      description: 'Define your experience level',
      icon: GraduationCap,
      href: '/profile/build/expertise',
      completed: currentStep > 4,
      locked: currentStep < 4,
    },
    {
      step: 4,
      title: 'Add Proof Points',
      description: 'Showcase your work and achievements',
      icon: Award,
      href: '/profile/build/proof-points',
      completed: provider?.onboarding_status === 'completed',
      locked: currentStep < 6,
    },
  ];

  const getLifecycleStatusLabel = () => {
    if (!provider) return 'New';
    switch (provider.lifecycle_status) {
      case 'registered': return 'Registered';
      case 'profile_building': return 'Building Profile';
      case 'assessment_pending': return 'Assessment Pending';
      case 'assessment_completed': return 'Assessment Complete';
      case 'verified': return 'Verified';
      case 'active': return 'Active';
      default: return provider.lifecycle_status;
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

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
          <Button onClick={() => navigate(getStepUrl(currentStep))}>
            {currentStep === 1 ? 'Start Setup' : 'Continue Setup'}
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
              <div className="text-2xl font-bold">{getLifecycleStatusLabel()}</div>
              <p className="text-xs text-muted-foreground">
                {provider?.onboarding_status === 'completed' ? 'Profile complete' : 'Complete your profile'}
              </p>
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
                Current Step
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentStep} of 6</div>
              <p className="text-xs text-muted-foreground">Steps completed</p>
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
