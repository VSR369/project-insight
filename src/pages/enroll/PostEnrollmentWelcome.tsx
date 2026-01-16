import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Target, 
  BarChart3, 
  Sparkles, 
  Award, 
  Loader2,
  ArrowRight,
  BookOpen,
  LogOut,
  AlertCircle,
  CheckCircle,
  Shield,
  Users,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { useEffect } from 'react';

// Lifecycle rank constants for comparison (per spec Section 2.1)
const LIFECYCLE_RANKS = {
  invited: 10,
  registered: 15,
  enrolled: 20,
  profile_building: 30,
  assessment_pending: 40,
  assessment_completed: 50,
  verified: 60,
  active: 70,
  suspended: 80,
  inactive: 90,
} as const;

// Benefits cards data (per spec Section 2.2)
const PROFILE_BENEFITS = [
  {
    icon: Target,
    title: 'Complex High-Revenue Challenges',
    description: 'Access to sensitive, high-value business challenges that require verified expertise.',
  },
  {
    icon: BarChart3,
    title: 'Increased Visibility',
    description: 'Enhanced credibility and discovery among seekers looking for verified professionals.',
  },
  {
    icon: Sparkles,
    title: 'Priority Shortlisting',
    description: 'Strategic and enterprise-grade assignments with priority consideration.',
  },
  {
    icon: Award,
    title: 'Challenge Readiness Badges',
    description: 'Professional recognition system showcasing your verified expertise areas.',
  },
];

// Verified provider benefits (per Figma design)
const VERIFIED_BENEFITS = [
  {
    icon: Shield,
    title: 'Trust & Credibility',
    description: 'Stand out with verified status that builds instant trust with seekers.',
  },
  {
    icon: Eye,
    title: 'Enhanced Discovery',
    description: 'Appear higher in search results and recommendations to potential clients.',
  },
  {
    icon: Users,
    title: 'Exclusive Opportunities',
    description: 'Access to enterprise challenges reserved for verified providers only.',
  },
  {
    icon: CheckCircle,
    title: 'Professional Badge',
    description: 'Display verification badge on your profile visible to all platform users.',
  },
];

export default function PostEnrollmentWelcome() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: provider, isLoading, error } = useCurrentProvider();

  // Show toast on initial entry
  useEffect(() => {
    if (provider && !isLoading) {
      toast.success('Enrollment successful.');
    }
  }, [provider, isLoading]);

  // Handle navigation actions
  const handleBuildProfile = () => {
    navigate('/enroll/participation-mode');
  };

  const handleKnowledgeCentre = () => {
    navigate('/knowledge-centre');
  };

  const handleLogOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleRestartEnrollment = () => {
    navigate('/enroll/registration');
  };

  // Calculate lifecycle rank from status
  const getLifecycleRank = (status: string | undefined): number => {
    if (!status) return 0;
    return LIFECYCLE_RANKS[status as keyof typeof LIFECYCLE_RANKS] || 0;
  };

  // Loading state with skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="space-y-8">
            {/* Header skeleton */}
            <div className="text-center space-y-4">
              <Skeleton className="h-10 w-3/4 mx-auto" />
              <Skeleton className="h-6 w-1/2 mx-auto" />
            </div>
            {/* CTA skeleton */}
            <div className="flex justify-center gap-4">
              <Skeleton className="h-12 w-48" />
              <Skeleton className="h-12 w-48" />
              <Skeleton className="h-12 w-24" />
            </div>
            {/* Cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              We couldn't complete your action. Please refresh and try again.
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => window.location.reload()}>Refresh Page</Button>
          </div>
        </div>
      </div>
    );
  }

  // Recovery state - provider profile missing
  if (!provider) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-md">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Profile Not Found</AlertTitle>
            <AlertDescription>
              Profile not found — restart enrollment.
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-center">
            <Button onClick={handleRestartEnrollment}>Restart Enrollment</Button>
          </div>
        </div>
      </div>
    );
  }

  // Redirect check - if lifecycle_rank < 20 (ENROLLED), redirect to registration
  const lifecycleRank = getLifecycleRank(provider.lifecycle_status);
  if (lifecycleRank < LIFECYCLE_RANKS.enrolled) {
    navigate('/enroll/registration');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-5xl">
        <div className="space-y-12">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
              Lead the way in{' '}
              <span className="text-primary">digital age innovation</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              You're now part of a movement connecting the brightest minds with the world's 
              most challenging problems. Build your profile to unlock your full potential.
            </p>
          </div>

          {/* Primary CTA Row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              onClick={handleBuildProfile}
              className="gap-2 px-8"
            >
              Let's Build Your Profile
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={handleKnowledgeCentre}
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Go to CogniBlend Knowledge Centre
            </Button>
            <Button 
              variant="ghost" 
              size="lg" 
              onClick={handleLogOut}
              className="gap-2 text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </Button>
          </div>

          {/* Why Your Profile Matters Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground text-center">
                Why Your Profile Matters
              </h2>
              <ArrowRight className="h-5 w-5 text-primary" />
            </div>
            <p className="text-center text-muted-foreground max-w-2xl mx-auto">
              Your achievements and credentials open doors to exclusive opportunities. 
              A complete profile demonstrates your expertise and builds trust with seekers.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PROFILE_BENEFITS.map((benefit) => (
                <Card key={benefit.title} className="bg-card hover:shadow-md transition-shadow">
                  <CardContent className="pt-6 text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                      <benefit.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Verified Providers Section */}
          <div className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground text-center">
              Verified solution providers gain:
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {VERIFIED_BENEFITS.map((benefit) => (
                <Card key={benefit.title} className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:shadow-md transition-shadow">
                  <CardContent className="pt-6 text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20">
                      <benefit.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Footer CTA */}
          <div className="text-center space-y-6 pb-8">
            <div className="space-y-2">
              <p className="text-lg text-muted-foreground">
                Welcome, Solution Provider. Your journey in the ecosystem starts here.
              </p>
            </div>
            <Button 
              size="lg" 
              onClick={handleBuildProfile}
              className="gap-2 px-8"
            >
              Let's Build Your Profile
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
