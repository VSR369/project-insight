import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useProofPoints } from '@/hooks/queries/useProofPoints';
import { calculateCurrentStep, getStepUrl } from '@/components/auth/OnboardingGuard';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { User, CheckCircle, Clock, FileText, ArrowRight, Target, GraduationCap, Award, UserCircle, Loader2, ShieldCheck, Star, XCircle } from 'lucide-react';

// Terminal lifecycle statuses where profile is complete/locked
const TERMINAL_STATUSES = ['verified', 'certified', 'not_verified'];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: provider, isLoading } = useCurrentProvider();
  const { data: proofPoints = [] } = useProofPoints(provider?.id);

  const firstName = user?.user_metadata?.first_name || provider?.first_name || 'Provider';

  const isTerminalState = useMemo(() => {
    return TERMINAL_STATUSES.includes(provider?.lifecycle_status || '');
  }, [provider?.lifecycle_status]);

  // Calculate profile completion based on provider data
  const calculateProfileCompletion = () => {
    if (!provider) return 0;
    
    // If in terminal state, profile is 100% complete
    if (isTerminalState) return 100;
    
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
    if (provider.participation_mode_id) {
      completed += 0.5;
    }
    
    // Step 4: Expertise Level
    if (provider.expertise_level_id) {
      completed += 1;
    }
    
    // Step 5: Proof Points
    if (proofPoints.length >= 2) {
      completed += 1;
    } else if (proofPoints.length > 0) {
      completed += 0.5;
    }
    
    // Onboarding completed
    if (provider.onboarding_status === 'completed') {
      return 100;
    }
    
    return Math.round((completed / steps) * 100);
  };

  const profileCompletion = calculateProfileCompletion();
  const currentStep = calculateCurrentStep(provider);

  // Redirect to enrollment wizard if onboarding not complete (and not terminal)
  useEffect(() => {
    if (!isLoading && provider && provider.onboarding_status !== 'completed' && !isTerminalState) {
      const enrollUrls: Record<number, string> = {
        1: '/enroll/registration',
        2: '/enroll/participation-mode',
        3: '/enroll/organization',
        4: '/enroll/expertise',
        5: '/enroll/proof-points',
        6: '/enroll/proof-points',
      };
      const url = enrollUrls[currentStep] || '/enroll/registration';
      navigate(url);
    }
  }, [isLoading, provider, currentStep, navigate, isTerminalState]);

  const nextSteps = useMemo(() => {
    // For terminal states, show completed view
    if (isTerminalState) {
      return [];
    }

    return [
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
  }, [currentStep, provider?.onboarding_status, isTerminalState]);

  const getLifecycleStatusLabel = () => {
    if (!provider) return 'New';
    switch (provider.lifecycle_status) {
      case 'registered': return 'Registered';
      case 'enrolled': return 'Enrolled';
      case 'mode_selected': return 'Mode Selected';
      case 'org_info_pending': return 'Org Info Pending';
      case 'org_validated': return 'Org Validated';
      case 'expertise_selected': return 'Expertise Selected';
      case 'proof_points_started': return 'Adding Proof Points';
      case 'proof_points_min_met': return 'Proof Points Added';
      case 'profile_building': return 'Building Profile';
      case 'assessment_pending': return 'Assessment Pending';
      case 'assessment_in_progress': return 'Assessment In Progress';
      case 'assessment_passed': return 'Assessment Passed';
      case 'assessment_completed': return 'Assessment Complete';
      case 'panel_scheduled': return 'Panel Scheduled';
      case 'panel_completed': return 'Panel Completed';
      case 'verified': return 'Verified';
      case 'certified': return 'Certified';
      case 'not_verified': return 'Not Verified';
      case 'active': return 'Active';
      case 'suspended': return 'Suspended';
      case 'inactive': return 'Inactive';
      default: return provider.lifecycle_status;
    }
  };

  const getStatusBadgeVariant = () => {
    if (!provider) return 'secondary';
    switch (provider.lifecycle_status) {
      case 'verified':
      case 'certified':
      case 'active':
        return 'default';
      case 'not_verified':
      case 'suspended':
      case 'inactive':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = () => {
    if (!provider) return null;
    switch (provider.lifecycle_status) {
      case 'verified':
        return <ShieldCheck className="h-4 w-4" />;
      case 'certified':
        return <Star className="h-4 w-4" />;
      case 'not_verified':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
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
          {!isTerminalState && (
            <Button onClick={() => navigate(getStepUrl(currentStep))}>
              {currentStep === 1 ? 'Start Setup' : 'Continue Setup'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Terminal State Banner */}
        {isTerminalState && (
          <Card className={
            provider?.lifecycle_status === 'verified' || provider?.lifecycle_status === 'certified'
              ? 'bg-gradient-to-r from-green-500/10 via-green-500/5 to-green-500/10 border-green-500/30'
              : 'bg-gradient-to-r from-red-500/10 via-red-500/5 to-red-500/10 border-red-500/30'
          }>
            <CardContent className="py-6 flex items-center justify-center gap-3">
              {getStatusIcon()}
              <span className="text-lg font-semibold">
                {provider?.lifecycle_status === 'verified' && 'Your profile has been verified!'}
                {provider?.lifecycle_status === 'certified' && 'Congratulations! You are certified!'}
                {provider?.lifecycle_status === 'not_verified' && 'Your profile verification was unsuccessful.'}
              </span>
            </CardContent>
          </Card>
        )}

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
              <div className="flex items-center gap-2">
                <Badge variant={getStatusBadgeVariant()} className="gap-1">
                  {getStatusIcon()}
                  {getLifecycleStatusLabel()}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {isTerminalState 
                  ? 'Profile complete' 
                  : provider?.onboarding_status === 'completed' 
                    ? 'Profile complete' 
                    : 'Complete your profile'}
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
              <div className="text-2xl font-bold">{proofPoints.length}</div>
              <p className="text-xs text-muted-foreground">
                {proofPoints.length >= 2 ? 'Minimum met' : 'Add your evidence'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {isTerminalState ? 'Lifecycle Stage' : 'Current Step'}
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isTerminalState ? 'Complete' : `${currentStep} of 6`}
              </div>
              <p className="text-xs text-muted-foreground">
                {isTerminalState ? 'All steps done' : 'Steps completed'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Next Steps - Only show for non-terminal states */}
        {!isTerminalState && nextSteps.length > 0 && (
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
        )}

        {/* Verified/Certified View */}
        {isTerminalState && provider?.lifecycle_status !== 'not_verified' && (
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>Your verified professional profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{provider?.first_name} {provider?.last_name}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Proof Points</p>
                  <p className="font-medium">{proofPoints.length} added</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => navigate('/profile')}>
                View Full Profile
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
