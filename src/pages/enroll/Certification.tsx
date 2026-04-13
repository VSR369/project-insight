/**
 * Certification Page
 * 
 * Step 9 of enrollment - Final Certification stage
 * Shown when lifecycle_status = 'panel_completed', 'certified',
 * 'not_certified', 'suspended', or 'inactive'
 */

import { WizardLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Award, CheckCircle2, Download, Star, Trophy, XCircle, AlertTriangle, Ban } from 'lucide-react';
import { useEnrollmentContext } from '@/contexts/EnrollmentContext';
import { TERMINAL_STATES, HIDDEN_STATES } from '@/constants/lifecycle.constants';
import { StarRating } from '@/components/ui/StarRating';
import { getCertificationLevelDisplay } from '@/types/certification.types';

interface StatusConfig {
  badge: string;
  badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive';
  icon: typeof Trophy;
  iconColor: string;
  title: string;
  description: string;
  isHidden?: boolean;
}

export default function Certification() {
  const { activeEnrollment } = useEnrollmentContext();
  
  const lifecycleStatus = activeEnrollment?.lifecycle_status;
  const starRating = activeEnrollment?.star_rating;
  const certificationLevel = activeEnrollment?.certification_level;
  const compositeScore = activeEnrollment?.composite_score;
  const certifiedAt = activeEnrollment?.certified_at;
  
  // Get certification level display info
  const levelDisplay = getCertificationLevelDisplay(certificationLevel as 'proven' | 'acclaimed' | 'eminent' | null);
  
  const getStatusConfig = (): StatusConfig => {
    switch (lifecycleStatus) {
      case 'certified':
        return {
          badge: 'Certified',
          badgeVariant: 'default',
          icon: Trophy,
          iconColor: 'text-yellow-500',
          title: 'Congratulations! You are Certified',
          description: 'You have successfully completed all verification steps.',
        };
      case 'not_certified':
        return {
          badge: 'Not Certified',
          badgeVariant: 'outline',
          icon: XCircle,
          iconColor: 'text-orange-500',
          title: 'Certification Unsuccessful',
          description: 'Unfortunately, your certification was not successful at this time.',
        };
      case 'suspended':
        return {
          badge: 'Suspended',
          badgeVariant: 'destructive',
          icon: Ban,
          iconColor: 'text-destructive',
          title: 'Account Suspended',
          description: 'Your account has been suspended. Please contact support for assistance.',
          isHidden: true,
        };
      case 'inactive':
        return {
          badge: 'Inactive',
          badgeVariant: 'outline',
          icon: AlertTriangle,
          iconColor: 'text-muted-foreground',
          title: 'Account Inactive',
          description: 'Your enrollment is currently inactive.',
          isHidden: true,
        };
      case 'panel_completed':
        return {
          badge: 'Under Review',
          badgeVariant: 'outline',
          icon: Star,
          iconColor: 'text-blue-500',
          title: 'Panel Review Complete',
          description: 'Your interview is complete. Results are being processed.',
        };
      default:
        return {
          badge: 'Pending',
          badgeVariant: 'outline',
          icon: Award,
          iconColor: 'text-muted-foreground',
          title: 'Certification Pending',
          description: 'Complete all enrollment steps to get certified.',
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  // Check if this is a terminal state (no more steps)
  const isTerminal = TERMINAL_STATES.includes(lifecycleStatus as typeof TERMINAL_STATES[number]);
  
  // Check if content should be hidden (suspended/inactive)
  const isHidden = HIDDEN_STATES.includes(lifecycleStatus as typeof HIDDEN_STATES[number]);
  
  // Can show certificate download
  const canDownloadCertificate = lifecycleStatus === 'certified';

  return (
    <WizardLayout
      currentStep={9}
      hideContinueButton={isTerminal}
      continueLabel="Complete"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Certification</h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Step 9 of 9
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Your certification status and credentials
          </p>
        </div>

        {/* Suspended/Inactive Alert */}
        {isHidden && (
          <Alert variant={lifecycleStatus === 'suspended' ? 'destructive' : 'default'}>
            <StatusIcon className="h-4 w-4" />
            <AlertTitle>{config.title}</AlertTitle>
            <AlertDescription>
              {config.description}
              {lifecycleStatus === 'suspended' && (
                <span className="block mt-2">
                  If you believe this is an error, please contact our support team.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Status Card - shown for all states */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4`}>
                <StatusIcon className={`h-10 w-10 ${config.iconColor}`} />
              </div>
              
              <Badge variant={config.badgeVariant} className="mb-4">
                {config.badge}
              </Badge>
              
              {/* Star Rating - prominently displayed for certified providers */}
              {lifecycleStatus === 'certified' && starRating != null && (
                <div className="flex flex-col items-center gap-2 mb-4">
                  <StarRating rating={starRating} size="lg" />
                  {levelDisplay && (
                    <Badge variant="secondary" className={levelDisplay.colorClass}>
                      {levelDisplay.label} Certification
                    </Badge>
                  )}
                </div>
              )}
              
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {config.title}
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {config.description}
              </p>
              
              {/* Composite Score breakdown for certified */}
              {lifecycleStatus === 'certified' && compositeScore != null && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg inline-block">
                  <p className="text-sm text-muted-foreground">Composite Score</p>
                  <p className="text-2xl font-bold text-primary">{compositeScore.toFixed(1)}%</p>
                </div>
              )}
              
              {/* Certified date */}
              {lifecycleStatus === 'certified' && certifiedAt && (
                <p className="text-xs text-muted-foreground mt-4">
                  Certified on {new Date(certifiedAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Certificate Download (only for verified/certified, hidden when suspended/inactive) */}
        {canDownloadCertificate && !isHidden && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Your Certificate
              </CardTitle>
              <CardDescription>
                Download your official certification document
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Download Certificate (Coming Soon)
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Certificate download will be available soon.
              </p>
            </CardContent>
          </Card>
        )}

        {/* What's Next - hidden for suspended/inactive */}
        {!isHidden && (
          <Card>
            <CardHeader>
              <CardTitle>What's Next?</CardTitle>
            </CardHeader>
            <CardContent>
              {lifecycleStatus === 'not_certified' ? (
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                    <span>Review your profile and proof points for completeness</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                    <span>You may be eligible to re-apply after a waiting period</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                    <span>Contact support if you have questions about the decision</span>
                  </li>
                </ul>
              ) : (
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span>Your profile will be visible to seekers looking for expertise</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span>You can enroll in additional industry segments from the dashboard</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span>Keep your proof points updated to maintain your certification</span>
                  </li>
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </WizardLayout>
  );
}
