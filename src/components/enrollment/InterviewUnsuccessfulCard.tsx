/**
 * Interview Unsuccessful Card
 * 
 * Dashboard card shown when enrollment status = 'interview_unsuccessful'.
 * Displays cooling-off countdown and provides two pathways:
 * - Path A: Schedule Re-Interview (after cooling-off)
 * - Path B: Modify Expertise (triggers re-flow)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Calendar, RefreshCw, Clock, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useReinterviewEligibility } from '@/hooks/queries/useReinterviewEligibility';
import { formatEligibilityDate } from '@/services/interviewRetakeService';
import { getCoolingOffDays } from '@/constants/interview-retake.constants';
import { cn } from '@/lib/utils';

interface InterviewUnsuccessfulCardProps {
  enrollmentId: string;
  industryName?: string;
  onModifyExpertise: () => void;
}

export function InterviewUnsuccessfulCard({
  enrollmentId,
  industryName,
  onModifyExpertise,
}: InterviewUnsuccessfulCardProps) {
  const navigate = useNavigate();
  const { data: eligibility, isLoading } = useReinterviewEligibility(enrollmentId);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Calculate time remaining string
  useEffect(() => {
    if (!eligibility?.eligibleAfter) return;

    const updateTimeRemaining = () => {
      const now = new Date();
      const eligible = new Date(eligibility.eligibleAfter!);
      const diff = eligible.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Eligible now');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) {
        setTimeRemaining(`${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`);
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${hours}h ${minutes}m`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [eligibility?.eligibleAfter]);

  if (isLoading) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-6">
          <div className="animate-pulse flex items-center gap-4">
            <div className="h-12 w-12 bg-amber-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-amber-200 rounded w-3/4" />
              <div className="h-3 bg-amber-200 rounded w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!eligibility) return null;

  const totalCoolingDays = getCoolingOffDays(eligibility.attemptCount);
  const elapsedDays = totalCoolingDays - eligibility.daysRemaining;
  const progressPercent = Math.min(100, (elapsedDays / totalCoolingDays) * 100);

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-amber-800">
                Interview Unsuccessful
              </CardTitle>
              <CardDescription className="text-amber-700">
                {industryName && `${industryName} • `}
                Attempt #{eligibility.attemptCount}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
            Re-attempt Available
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Cooling-Off Progress */}
        {!eligibility.isEligible && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-amber-700 font-medium flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Cooling-off Period
              </span>
              <span className="text-amber-800 font-semibold">
                {timeRemaining}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2 bg-amber-200" />
            <p className="text-xs text-amber-600">
              Eligible after: {formatEligibilityDate(eligibility.eligibleAfter)}
            </p>
          </div>
        )}

        {/* Eligible Message */}
        {eligibility.isEligible && (
          <div className="flex items-center gap-2 p-3 bg-green-100 border border-green-200 rounded-lg">
            <Calendar className="h-5 w-5 text-green-600" />
            <span className="text-green-800 font-medium">
              You are now eligible to schedule a re-interview!
            </span>
          </div>
        )}

        {/* Two Pathways */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Path A: Re-Interview */}
          <div className={cn(
            "p-4 rounded-lg border-2",
            eligibility.isEligible 
              ? "border-green-300 bg-green-50" 
              : "border-muted bg-muted/50"
          )}>
            <div className="flex items-start gap-3">
              <Calendar className={cn(
                "h-5 w-5 mt-0.5",
                eligibility.isEligible ? "text-green-600" : "text-muted-foreground"
              )} />
              <div className="flex-1">
                <h4 className={cn(
                  "font-semibold",
                  eligibility.isEligible ? "text-green-800" : "text-muted-foreground"
                )}>
                  Path A: Re-Interview
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Keep your current expertise and schedule another interview.
                </p>
                <Button
                  onClick={() => navigate(`/enroll/interview`)}
                  disabled={!eligibility.isEligible}
                  className="mt-3 w-full"
                  variant={eligibility.isEligible ? "default" : "outline"}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Re-Interview
                </Button>
              </div>
            </div>
          </div>

          {/* Path B: Modify Expertise */}
          <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
            <div className="flex items-start gap-3">
              <RefreshCw className="h-5 w-5 mt-0.5 text-blue-600" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-blue-800">
                    Path B: Modify Expertise
                  </h4>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-blue-500" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Changing expertise will reset your proof points and assessment.
                          You'll need to complete them again before the interview.
                          The cooling-off period still applies.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Change your level or specialities. Proof points and assessment will be reset.
                </p>
                <Button
                  onClick={onModifyExpertise}
                  variant="outline"
                  className="mt-3 w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Modify Expertise
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Info Note */}
        <p className="text-xs text-muted-foreground text-center pt-2 border-t">
          Industry segment cannot be changed. Create a new enrollment for a different industry.
        </p>
      </CardContent>
    </Card>
  );
}
