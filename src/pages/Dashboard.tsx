import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useProofPoints } from '@/hooks/queries/useProofPoints';
import { useProviderEnrollments, useActiveEnrollment } from '@/hooks/queries/useProviderEnrollments';
import { useEnrollmentContext } from '@/contexts/EnrollmentContext';
import { calculateCurrentStep, getStepUrl } from '@/components/auth/OnboardingGuard';
import { getStatusDisplayName } from '@/services/lifecycleService';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  User, CheckCircle, Clock, FileText, ArrowRight, Target, GraduationCap, 
  Award, UserCircle, Loader2, ShieldCheck, Star, XCircle, Building2,
  ChevronRight, Factory, Layers
} from 'lucide-react';

// Terminal lifecycle statuses where profile is complete/locked
const TERMINAL_STATUSES = ['verified', 'certified', 'not_verified'];

// Lifecycle rank thresholds for progress calculation
const LIFECYCLE_PROGRESS_MAP: Record<string, number> = {
  'invited': 0,
  'registered': 10,
  'enrolled': 15,
  'mode_selected': 25,
  'org_info_pending': 30,
  'org_validated': 40,
  'expertise_selected': 50,
  'proof_points_started': 60,
  'proof_points_min_met': 70,
  'assessment_pending': 75,
  'assessment_in_progress': 80,
  'assessment_passed': 85,
  'assessment_completed': 90,
  'panel_scheduled': 92,
  'panel_completed': 95,
  'verified': 100,
  'certified': 100,
  'not_verified': 100,
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: provider, isLoading } = useCurrentProvider();
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useProviderEnrollments(provider?.id);
  const { activeEnrollment, setActiveEnrollment } = useEnrollmentContext();
  const { data: proofPoints = [] } = useProofPoints(provider?.id);

  const firstName = user?.user_metadata?.first_name || provider?.first_name || 'Provider';

  // Check if any enrollment is in a terminal state
  const hasTerminalEnrollment = useMemo(() => {
    return enrollments.some(e => TERMINAL_STATUSES.includes(e.lifecycle_status));
  }, [enrollments]);

  // Legacy: Check if provider is in terminal state (for single-industry compatibility)
  const isProviderTerminal = useMemo(() => {
    return TERMINAL_STATUSES.includes(provider?.lifecycle_status || '');
  }, [provider?.lifecycle_status]);

  // Get proof points count per industry
  const proofPointsByIndustry = useMemo(() => {
    const counts: Record<string, number> = {};
    proofPoints.forEach(pp => {
      const industryId = pp.industry_segment_id || 'general';
      counts[industryId] = (counts[industryId] || 0) + 1;
    });
    return counts;
  }, [proofPoints]);

  // Calculate progress for an enrollment
  const getEnrollmentProgress = (status: string) => {
    return LIFECYCLE_PROGRESS_MAP[status] || 0;
  };

  // Get badge variant for lifecycle status
  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
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

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
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

  const currentStep = calculateCurrentStep(provider);

  // Redirect to enrollment wizard if onboarding not complete (and not terminal)
  useEffect(() => {
    if (!isLoading && provider && provider.onboarding_status !== 'completed' && !isProviderTerminal) {
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
  }, [isLoading, provider, currentStep, navigate, isProviderTerminal]);

  // Handle enrollment switch
  const handleEnrollmentSwitch = (enrollmentId: string) => {
    setActiveEnrollment(enrollmentId);
  };

  // Navigate to enrollment step
  const handleContinueEnrollment = (enrollmentId: string) => {
    const enrollment = enrollments.find(e => e.id === enrollmentId);
    if (enrollment) {
      setActiveEnrollment(enrollmentId);
      // Navigate based on enrollment lifecycle status
      const status = enrollment.lifecycle_status;
      if (status === 'enrolled' || status === 'registered') {
        navigate('/enroll/participation-mode');
      } else if (status === 'mode_selected' || status === 'org_info_pending' || status === 'org_validated') {
        navigate('/enroll/expertise');
      } else if (status === 'expertise_selected' || status === 'proof_points_started') {
        navigate('/enroll/proof-points');
      } else if (status === 'proof_points_min_met' || status === 'assessment_pending') {
        navigate('/enroll/assessment');
      } else {
        navigate('/enroll/proof-points');
      }
    }
  };

  if (isLoading || enrollmentsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Check if we have multi-industry enrollments
  const hasMultipleEnrollments = enrollments.length > 1;
  const totalProofPoints = proofPoints.length;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Welcome back, {firstName}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {hasMultipleEnrollments 
                ? `Managing ${enrollments.length} industry enrollments`
                : 'Here\'s your profile overview'}
            </p>
          </div>
          {!isProviderTerminal && enrollments.length > 0 && (
            <Button onClick={() => handleContinueEnrollment(activeEnrollment?.id || enrollments[0]?.id)}>
              Continue Setup
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Multi-Industry Enrollments Overview */}
        {enrollments.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Industry Enrollments
                  </CardTitle>
                  <CardDescription>
                    {hasMultipleEnrollments 
                      ? 'Track progress across your industry enrollments'
                      : 'Your current industry enrollment progress'}
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/enroll/registration')}
                >
                  <Factory className="mr-2 h-4 w-4" />
                  Add Industry
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {enrollments.map((enrollment) => {
                const progress = getEnrollmentProgress(enrollment.lifecycle_status);
                const isActive = activeEnrollment?.id === enrollment.id;
                const isTerminal = TERMINAL_STATUSES.includes(enrollment.lifecycle_status);
                const industryProofPoints = proofPointsByIndustry[enrollment.industry_segment_id] || 0;

                return (
                  <div
                    key={enrollment.id}
                    className={`relative p-4 rounded-lg border transition-all cursor-pointer ${
                      isActive 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'hover:bg-muted/50'
                    } ${isTerminal && enrollment.lifecycle_status !== 'not_verified' 
                        ? 'border-green-500/30 bg-green-500/5' 
                        : ''
                    } ${enrollment.lifecycle_status === 'not_verified' 
                        ? 'border-destructive/30 bg-destructive/5' 
                        : ''
                    }`}
                    onClick={() => handleEnrollmentSwitch(enrollment.id)}
                  >
                    {/* Primary Badge */}
                    {enrollment.is_primary && (
                      <Badge 
                        variant="outline" 
                        className="absolute -top-2 right-4 bg-background text-xs"
                      >
                        Primary
                      </Badge>
                    )}

                    <div className="flex items-start gap-4">
                      {/* Industry Icon */}
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                        isTerminal && enrollment.lifecycle_status !== 'not_verified'
                          ? 'bg-green-500/10 text-green-600'
                          : enrollment.lifecycle_status === 'not_verified'
                            ? 'bg-destructive/10 text-destructive'
                            : isActive 
                              ? 'bg-primary/10 text-primary' 
                              : 'bg-muted text-muted-foreground'
                      }`}>
                        {isTerminal ? getStatusIcon(enrollment.lifecycle_status) || <Building2 className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold truncate">
                            {enrollment.industry_segment?.name || 'Unknown Industry'}
                          </h4>
                          <Badge variant={getStatusBadgeVariant(enrollment.lifecycle_status)} className="gap-1">
                            {getStatusIcon(enrollment.lifecycle_status)}
                            {getStatusDisplayName(enrollment.lifecycle_status)}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {enrollment.expertise_level && (
                            <span className="flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              {enrollment.expertise_level.name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {industryProofPoints} proof points
                          </span>
                        </div>

                        {/* Progress Bar */}
                        {!isTerminal && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="shrink-0">
                        {isTerminal ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEnrollmentSwitch(enrollment.id);
                              navigate('/profile');
                            }}
                          >
                            View
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant={isActive ? 'default' : 'outline'}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleContinueEnrollment(enrollment.id);
                            }}
                          >
                            Continue
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Industries
              </CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enrollments.length}</div>
              <p className="text-xs text-muted-foreground">
                {enrollments.filter(e => TERMINAL_STATUSES.includes(e.lifecycle_status) && e.lifecycle_status !== 'not_verified').length} verified
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Profile Status
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusBadgeVariant(provider?.lifecycle_status || 'registered')} className="gap-1">
                  {getStatusIcon(provider?.lifecycle_status || '')}
                  {getStatusDisplayName(provider?.lifecycle_status || 'New')}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {isProviderTerminal 
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
                Total Proof Points
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProofPoints}</div>
              <p className="text-xs text-muted-foreground">
                Across all industries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Enrollment
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">
                {activeEnrollment?.industry_segment?.name || 'None'}
              </div>
              <p className="text-xs text-muted-foreground">
                {activeEnrollment 
                  ? getStatusDisplayName(activeEnrollment.lifecycle_status)
                  : 'Select an industry'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Empty State - No Enrollments */}
        {enrollments.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Factory className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Industry Enrollments</h3>
              <p className="text-muted-foreground mb-4">
                Start by enrolling in your first industry to begin building your professional profile.
              </p>
              <Button onClick={() => navigate('/enroll/registration')}>
                <Factory className="mr-2 h-4 w-4" />
                Start Enrollment
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions for Verified Users */}
        {hasTerminalEnrollment && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your verified profile</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button variant="outline" className="justify-start" onClick={() => navigate('/profile')}>
                <UserCircle className="mr-2 h-4 w-4" />
                View Profile
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => navigate('/enroll/proof-points')}>
                <Award className="mr-2 h-4 w-4" />
                Manage Proof Points
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => navigate('/enroll/registration')}>
                <Factory className="mr-2 h-4 w-4" />
                Add New Industry
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
