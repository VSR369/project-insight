import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { WizardLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CalendarCheck, 
  CheckCircle, 
  AlertTriangle, 
  ArrowLeft,
  Loader2,
  ShieldCheck
} from "lucide-react";
import { useEnrollmentContext } from "@/contexts/EnrollmentContext";
import { useCurrentProvider } from "@/hooks/queries/useProvider";
import { useExpertiseLevels } from "@/hooks/queries/useExpertiseLevels";
import {
  useCompositeSlots,
  useExistingBooking,
  useQuorumRequirement,
  useBookInterviewSlot,
  useCancelBooking,
  useCanScheduleInterview,
} from "@/hooks/queries/useInterviewScheduling";
import {
  useRescheduleEligibility,
  useCancelEligibility,
  useMaxReschedules,
} from "@/hooks/queries/useRescheduleEligibility";
import {
  InterviewCalendar,
  SlotDetailsPanel,
  BookingConfirmDialog,
  ExistingBookingCard,
  TimeZoneSelector,
  getUserTimezone,
} from "@/components/interview";
import { CompositeSlot } from "@/hooks/queries/useInterviewScheduling";

export default function InterviewScheduling() {
  const navigate = useNavigate();
  const { activeEnrollment, activeEnrollmentId, activeLifecycleRank } = useEnrollmentContext();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const { data: expertiseLevels } = useExpertiseLevels();

  // Interview scheduling hooks
  const { data: compositeSlots, isLoading: slotsLoading } = useCompositeSlots(
    activeEnrollmentId ?? undefined,
    activeEnrollment?.expertise_level_id ?? undefined,
    activeEnrollment?.industry_segment_id ?? undefined
  );

  const { data: existingBooking, isLoading: bookingLoading } = useExistingBooking(
    activeEnrollmentId ?? undefined,
    provider?.id
  );

  const { data: quorumRequirement } = useQuorumRequirement(
    activeEnrollment?.expertise_level_id ?? undefined,
    activeEnrollment?.industry_segment_id ?? undefined
  );

  const bookSlot = useBookInterviewSlot();
  const cancelBooking = useCancelBooking();
  const { canSchedule, isEligible, reason } = useCanScheduleInterview(
    activeEnrollmentId ?? undefined,
    activeLifecycleRank
  );

  // Reschedule/Cancel eligibility hooks
  const rescheduleEligibility = useRescheduleEligibility(existingBooking ?? null, compositeSlots);
  const cancelEligibility = useCancelEligibility(existingBooking ?? null);
  const maxReschedules = useMaxReschedules();

  // UI State
  const [timezone, setTimezone] = useState(getUserTimezone());
  const [selectedSlot, setSelectedSlot] = useState<CompositeSlot | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Derived data
  const expertiseLevelName = expertiseLevels?.find(
    (l) => l.id === activeEnrollment?.expertise_level_id
  )?.name;

  const isLoading = providerLoading || slotsLoading || bookingLoading;

  // Handlers
  const handleBookSlot = () => {
    if (!selectedSlot) return;
    setShowConfirmDialog(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !provider?.id || !activeEnrollmentId) return;

    await bookSlot.mutateAsync({
      providerId: provider.id,
      enrollmentId: activeEnrollmentId,
      compositeSlotId: selectedSlot.id,
    });

    setShowConfirmDialog(false);
    setSelectedSlot(null);
    setIsRescheduling(false);
  };

  const handleCancelBooking = async (reason: string) => {
    if (!existingBooking) return;
    await cancelBooking.mutateAsync({
      bookingId: existingBooking.id,
      reason,
    });
  };

  const handleReschedule = () => {
    setIsRescheduling(true);
  };

  const handleBackToResults = () => {
    navigate("/enroll/assessment/results");
  };

  // Loading state
  if (isLoading) {
    return (
      <WizardLayout currentStep={7}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </WizardLayout>
    );
  }

  // Gate: Not eligible (assessment not passed)
  if (!isEligible) {
    return (
      <WizardLayout currentStep={7}>
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Assessment Required</AlertTitle>
            <AlertDescription>
              {reason || "You must pass the knowledge assessment before scheduling a panel interview."}
            </AlertDescription>
          </Alert>
          <div className="mt-6 flex justify-center">
            <Button onClick={() => navigate("/enroll/assessment")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Assessment
            </Button>
          </div>
        </div>
      </WizardLayout>
    );
  }

  // Show existing booking (not rescheduling mode)
  if (existingBooking && !isRescheduling) {
    return (
      <WizardLayout currentStep={7}>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Panel Interview</h1>
            <p className="text-muted-foreground">
              Your interview has been scheduled
            </p>
          </div>

          {/* Timezone selector */}
          <div className="flex justify-end">
            <TimeZoneSelector value={timezone} onChange={setTimezone} />
          </div>

          {/* Existing booking card */}
          <ExistingBookingCard
            booking={existingBooking}
            quorumRequirement={quorumRequirement ?? null}
            timezone={timezone}
            expertiseLevelName={expertiseLevelName}
            onReschedule={handleReschedule}
            onCancel={handleCancelBooking}
            maxReschedules={maxReschedules}
            isCancelling={cancelBooking.isPending}
            rescheduleEligibility={rescheduleEligibility}
            cancelEligibility={cancelEligibility}
          />

          {/* Navigation */}
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={handleBackToResults}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Results
            </Button>
            <Button onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </WizardLayout>
    );
  }

  // Main scheduling UI
  return (
    <WizardLayout currentStep={7}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarCheck className="h-6 w-6 text-primary" />
              Schedule Panel Interview
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome, {provider?.first_name}. Select an available time for your verification interview.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Knowledge Assessment Passed
            </Badge>
            {expertiseLevelName && (
              <Badge variant="outline">
                <ShieldCheck className="h-3 w-3 mr-1" />
                {expertiseLevelName}
              </Badge>
            )}
          </div>
        </div>

        {/* Timezone selector */}
        <div className="flex justify-end">
          <TimeZoneSelector value={timezone} onChange={setTimezone} />
        </div>

        {isRescheduling && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Rescheduling Mode</AlertTitle>
            <AlertDescription>
              Select a new time slot. Your current booking will be cancelled when you confirm.
              <Button 
                variant="link" 
                className="p-0 h-auto ml-2"
                onClick={() => setIsRescheduling(false)}
              >
                Cancel rescheduling
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Calendar and Slot Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar - 2 columns */}
          <div className="lg:col-span-2">
            <InterviewCalendar
              slots={compositeSlots || []}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              timezone={timezone}
              isLoading={slotsLoading}
            />

            {/* No slots message */}
            {!slotsLoading && (!compositeSlots || compositeSlots.length === 0) && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No Available Slots</AlertTitle>
                <AlertDescription>
                  There are currently no interview slots available for your expertise level and industry.
                  Please check back later or contact support for assistance.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Slot Details Panel - 1 column */}
          <div className="lg:col-span-1">
            <SlotDetailsPanel
              slot={selectedSlot}
              quorumRequirement={quorumRequirement ?? null}
              timezone={timezone}
              expertiseLevelName={expertiseLevelName}
              onBookSlot={handleBookSlot}
              isBooking={bookSlot.isPending}
            />
          </div>
        </div>

        <Separator />

        {/* Back navigation */}
        <div className="flex justify-start">
          <Button variant="ghost" onClick={handleBackToResults}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assessment Results
          </Button>
        </div>
      </div>

      {/* Booking Confirmation Dialog */}
      <BookingConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        slot={selectedSlot}
        quorumRequirement={quorumRequirement ?? null}
        timezone={timezone}
        expertiseLevelName={expertiseLevelName}
        onConfirm={handleConfirmBooking}
        isConfirming={bookSlot.isPending}
      />
    </WizardLayout>
  );
}
