/**
 * Panel Discussion Page
 * 
 * Step 8 of enrollment - Panel Interview stage
 * Shown when lifecycle_status = 'panel_scheduled'
 * Displays interview details and personalized preparation guidance
 */

import { useNavigate } from 'react-router-dom';
import { WizardLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Info, 
  Loader2, 
  Video,
  Target,
  FileText,
  Star,
  Sparkles
} from 'lucide-react';
import { useEnrollmentContext } from '@/contexts/EnrollmentContext';
import { useExistingBooking } from '@/hooks/queries/useInterviewScheduling';
import { useProviderHierarchy } from '@/hooks/queries/useProviderHierarchy';
import { useProofPoints } from '@/hooks/queries/useProofPoints';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { format } from 'date-fns';

export default function PanelDiscussion() {
  const navigate = useNavigate();
  const { activeEnrollment, activeEnrollmentId } = useEnrollmentContext();
  const { data: provider } = useCurrentProvider();
  
  const { data: booking, isLoading: bookingLoading } = useExistingBooking(
    activeEnrollmentId,
    activeEnrollment?.provider_id
  );

  const hierarchy = useProviderHierarchy();
  
  const { data: proofPoints, isLoading: proofPointsLoading } = useProofPoints(
    provider?.id,
    { industrySegmentId: activeEnrollment?.industry_segment_id }
  );

  const handleContinue = () => {
    navigate('/enroll/certification');
  };

  const isLoading = bookingLoading || hierarchy.isLoading;

  if (isLoading) {
    return (
      <WizardLayout currentStep={8} hideContinueButton>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </WizardLayout>
    );
  }

  const proofPointCount = proofPoints?.length || 0;

  return (
    <WizardLayout
      currentStep={8}
      onContinue={handleContinue}
      continueLabel="View Certification"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Panel Interview</h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Step 8 of 9
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Your panel interview with industry experts
          </p>
        </div>

        {/* Interview Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Interview Status
            </CardTitle>
            <CardDescription>
              Your scheduled panel discussion details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {booking && booking.status === 'confirmed' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Interview Confirmed</span>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">
                        {format(new Date(booking.scheduled_at), 'EEEE, MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Time</p>
                      <p className="font-medium">
                        {format(new Date(booking.scheduled_at), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Join Interview Button (placeholder) */}
                <div className="pt-4 border-t">
                  <Button disabled className="w-full sm:w-auto gap-2">
                    <Video className="h-4 w-4" />
                    Join Interview (Available on scheduled date)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600">
                <Info className="h-5 w-5" />
                <span>Interview booking details are being confirmed.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Your Focus Areas Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Your Focus Areas
            </CardTitle>
            <CardDescription>
              The panel will focus on your expertise in these areas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Industry & Expertise Level */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Industry</p>
                {hierarchy.industrySegment ? (
                  <p className="font-medium">{hierarchy.industrySegment.name}</p>
                ) : (
                  <Skeleton className="h-5 w-32" />
                )}
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Expertise Level</p>
                {hierarchy.expertiseLevel ? (
                  <p className="font-medium">{hierarchy.expertiseLevel.name}</p>
                ) : (
                  <Skeleton className="h-5 w-28" />
                )}
              </div>
            </div>

            {/* Proficiency Areas */}
            {hierarchy.proficiencyAreas.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Proficiency Areas</p>
                <div className="flex flex-wrap gap-2">
                  {hierarchy.proficiencyAreas.map((area) => (
                    <Badge key={area.id} variant="secondary">
                      {area.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-Domains */}
            {hierarchy.subDomains.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Sub-Domains</p>
                <div className="flex flex-wrap gap-2">
                  {hierarchy.subDomains.map((domain) => (
                    <Badge key={domain.id} variant="outline">
                      {domain.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Specialities */}
            {hierarchy.specialities.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Specialities</p>
                <div className="flex flex-wrap gap-2">
                  {hierarchy.specialities.map((speciality) => (
                    <Badge key={speciality.id} className="bg-primary/10 text-primary border-primary/20">
                      {speciality.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Your Proof Points Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Your Proof Points
              {!proofPointsLoading && (
                <Badge variant="secondary" className="ml-2">
                  {proofPointCount} submitted
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-muted-foreground">
                Be ready to discuss each of your proof points in detail. The panel may ask for 
                specific examples, outcomes, and the impact of your work. Think about metrics, 
                challenges you overcame, and lessons learned.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preparation Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Preparation Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span>Review your proof points and be ready to discuss them in detail</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span>Prepare examples of your work in your selected specialities</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span>Ensure you have a stable internet connection and quiet environment</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span>Join 5 minutes early to test your audio and video</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* All the Best Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  All the Best! 
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                </h3>
                <p className="text-muted-foreground">
                  You've come a long way! The panel interview is your opportunity to showcase 
                  your expertise and experience. Be confident, be authentic, and let your 
                  knowledge shine through. We're rooting for you!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </WizardLayout>
  );
}
