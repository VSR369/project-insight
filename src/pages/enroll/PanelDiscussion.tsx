/**
 * Panel Discussion Page
 * 
 * Step 8 of enrollment - Panel Interview stage
 * Shown when lifecycle_status = 'panel_scheduled'
 */

import { useNavigate } from 'react-router-dom';
import { WizardLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, CheckCircle2, Info, Loader2, Video } from 'lucide-react';
import { useEnrollmentContext } from '@/contexts/EnrollmentContext';
import { useExistingBooking } from '@/hooks/queries/useInterviewScheduling';
import { format } from 'date-fns';

export default function PanelDiscussion() {
  const navigate = useNavigate();
  const { activeEnrollment, activeEnrollmentId } = useEnrollmentContext();
  
  const { data: booking, isLoading } = useExistingBooking(
    activeEnrollmentId,
    activeEnrollment?.provider_id
  );

  const handleContinue = () => {
    navigate('/enroll/certification');
  };

  if (isLoading) {
    return (
      <WizardLayout currentStep={8} hideContinueButton>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </WizardLayout>
    );
  }

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
              <div className="text-center py-6">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No interview scheduled yet.
                </p>
                <Button 
                  className="mt-4"
                  onClick={() => navigate('/enroll/interview-slot')}
                >
                  Schedule Interview
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preparation Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Prepare for Your Interview
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
      </div>
    </WizardLayout>
  );
}
