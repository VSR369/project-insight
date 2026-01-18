/**
 * Reviewer Availability Page
 * 
 * Calendar-based interface for reviewers to manage their interview availability.
 * Supports multi-industry/expertise reviewers.
 */

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { ReviewerLayout } from "@/components/reviewer/ReviewerLayout";
import {
  AvailabilityCalendar,
  TimeSlotSelector,
  SelectedSlotsPanel,
} from "@/components/reviewer/availability";
import {
  useCurrentReviewer,
  useReviewerSlots,
  useCreateReviewerSlots,
  useDeleteReviewerSlot,
} from "@/hooks/queries/useReviewerAvailability";
import {
  draftToTimeSlot,
  checkSlotOverlap,
  type DraftSlot,
  type TimeSlot,
} from "@/services/availabilityService";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Globe, UserX, ShieldX, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function ReviewerAvailability() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [draftSlots, setDraftSlots] = useState<DraftSlot[]>([]);

  // Calculate month range for fetching slots
  const monthStart = useMemo(() => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [currentMonth]);

  const monthEnd = useMemo(() => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    date.setHours(23, 59, 59, 999);
    return date;
  }, [currentMonth]);

  // Fetch current reviewer profile
  const { data: reviewer, isLoading: isLoadingReviewer, error: reviewerError } = useCurrentReviewer();

  // Fetch existing slots
  const { 
    data: existingSlots = [], 
    isLoading: isLoadingSlots 
  } = useReviewerSlots(reviewer?.id, monthStart, monthEnd);

  // Mutations
  const createSlotsMutation = useCreateReviewerSlots();
  const deleteSlotMutation = useDeleteReviewerSlot();

  // Convert existing slots to TimeSlot format for overlap checking
  const existingTimeslots: TimeSlot[] = useMemo(() => {
    return existingSlots.map((slot) => ({
      id: slot.id,
      startAt: new Date(slot.start_at),
      endAt: new Date(slot.end_at),
      status: slot.status as TimeSlot['status'],
    }));
  }, [existingSlots]);

  // Track draft slot keys for duplicate prevention
  const existingDraftKeys = useMemo(() => {
    return new Set(draftSlots.map((s) => s.key));
  }, [draftSlots]);

  // Handle adding a draft slot
  const handleAddSlot = useCallback((newSlot: DraftSlot) => {
    const newTimeSlot = draftToTimeSlot(newSlot);

    // Check for past time
    if (newTimeSlot.startAt < new Date()) {
      toast.error("Start time must be in the future");
      return;
    }

    // Check overlap with existing slots
    const existingOverlap = checkSlotOverlap(existingTimeslots, newTimeSlot);
    if (existingOverlap.overlaps) {
      toast.error("You already have a slot scheduled during this time");
      return;
    }

    // Check overlap with other draft slots
    const draftTimeslots: TimeSlot[] = draftSlots.map(draftToTimeSlot);
    const draftOverlap = checkSlotOverlap(draftTimeslots, newTimeSlot);
    if (draftOverlap.overlaps) {
      toast.error("This time overlaps with another draft slot");
      return;
    }

    setDraftSlots((prev) => [...prev, newSlot]);
    toast.success("Slot added to selection");
  }, [existingTimeslots, draftSlots]);

  // Handle removing a draft slot
  const handleRemoveDraft = useCallback((key: string) => {
    setDraftSlots((prev) => prev.filter((s) => s.key !== key));
  }, []);

  // Handle deleting an existing slot
  const handleDeleteExisting = useCallback((slotId: string) => {
    deleteSlotMutation.mutate(slotId);
  }, [deleteSlotMutation]);

  // Handle clearing all draft slots
  const handleClearAllDrafts = useCallback(() => {
    setDraftSlots([]);
    toast.info("All draft slots cleared");
  }, []);

  // Handle confirming selection (bulk save)
  const handleConfirmSelection = useCallback(async () => {
    if (!reviewer?.id || draftSlots.length === 0) return;

    // Convert drafts to database format
    const slotsToCreate = draftSlots.map((draft) => {
      const timeSlot = draftToTimeSlot(draft);
      return {
        start_at: timeSlot.startAt.toISOString(),
        end_at: timeSlot.endAt.toISOString(),
      };
    });

    createSlotsMutation.mutate(
      { reviewerId: reviewer.id, slots: slotsToCreate },
      {
        onSuccess: () => {
          setDraftSlots([]);
        },
      }
    );
  }, [reviewer?.id, draftSlots, createSlotsMutation]);

  // Get user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Loading state
  if (isLoadingReviewer) {
    return (
      <ReviewerLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </ReviewerLayout>
    );
  }

  // Error state with specific messages
  if (reviewerError || !reviewer) {
    const errorCode = reviewerError?.message;
    
    let ErrorIcon = AlertCircle;
    let errorTitle = "Access Denied";
    let errorDescription = "Unable to load reviewer profile.";
    
    if (errorCode === "NOT_AUTHENTICATED") {
      ErrorIcon = LogIn;
      errorTitle = "Not Logged In";
      errorDescription = "Please log in to access this page.";
    } else if (errorCode === "NOT_A_REVIEWER") {
      ErrorIcon = UserX;
      errorTitle = "Not a Panel Reviewer";
      errorDescription = "You are not registered as a panel reviewer. This page is only accessible to approved panel reviewers.";
    } else if (errorCode === "REVIEWER_INACTIVE") {
      ErrorIcon = ShieldX;
      errorTitle = "Account Inactive";
      errorDescription = "Your reviewer account is currently inactive. Please contact the platform administrator.";
    }
    
    return (
      <ReviewerLayout>
        <div className="max-w-md mx-auto mt-12">
          <Alert variant="destructive">
            <ErrorIcon className="h-4 w-4" />
            <AlertTitle>{errorTitle}</AlertTitle>
            <AlertDescription className="mt-2">
              {errorDescription}
            </AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')} 
            className="mt-4 w-full"
          >
            Return to Dashboard
          </Button>
        </div>
      </ReviewerLayout>
    );
  }

  return (
    <ReviewerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Manage Availability</h1>
            <p className="text-muted-foreground">
              Set your available time slots for conducting interviews
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span>Times in {userTimezone}</span>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Calendar + Time Selector */}
          <div className="lg:col-span-2 space-y-6">
            <AvailabilityCalendar
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              existingSlots={existingSlots}
              draftSlots={draftSlots}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
            <TimeSlotSelector
              selectedDate={selectedDate}
              onAddSlot={handleAddSlot}
              existingDraftKeys={existingDraftKeys}
            />
          </div>

          {/* Right Column: Selected Slots Panel */}
          <div className="lg:h-[calc(100vh-16rem)]">
            <SelectedSlotsPanel
              draftSlots={draftSlots}
              existingSlots={existingSlots}
              onRemoveDraft={handleRemoveDraft}
              onDeleteExisting={handleDeleteExisting}
              onClearAllDrafts={handleClearAllDrafts}
              onConfirmSelection={handleConfirmSelection}
              isSubmitting={createSlotsMutation.isPending}
            />
          </div>
        </div>

        {/* Loading overlay for slots */}
        {isLoadingSlots && (
          <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="mt-2 text-sm text-muted-foreground">Loading slots...</p>
            </div>
          </div>
        )}
      </div>
    </ReviewerLayout>
  );
}
