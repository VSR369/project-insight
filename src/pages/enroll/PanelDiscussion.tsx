/**
 * Panel Discussion Page
 * 
 * Placeholder page for Step 8 of enrollment - Panel Interview stage
 * Shown when lifecycle_status = 'panel_scheduled'
 */

import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, ArrowLeft, CheckCircle2, Info } from 'lucide-react';
import { useEnrollmentContext } from '@/contexts/EnrollmentContext';
import { useExistingBooking } from '@/hooks/queries/useInterviewScheduling';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

export default function PanelDiscussion() {
  const navigate = useNavigate();
  const { activeEnrollment } = useEnrollmentContext();
  
  const { data: booking, isLoading } = useExistingBooking(
    activeEnrollment?.id,
    activeEnrollment?.provider_id
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">Panel Interview</h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Step 8 of 9
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Your panel interview with industry experts
          </p>
        </div>

        {/* Interview Status Card */}
        <Card className="mb-6">
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
    </div>
  );
}
