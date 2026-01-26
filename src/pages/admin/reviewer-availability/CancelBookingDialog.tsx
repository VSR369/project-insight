import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useAdminCancelBookedSlot } from "@/hooks/queries/useAdminReviewerSlots";
import type { AdminSlotWithReviewer } from "@/hooks/queries/useAdminReviewerSlots";

const formSchema = z.object({
  reason: z.string().min(5, "Please provide a reason (min 5 characters)"),
});

type FormValues = z.infer<typeof formSchema>;

interface CancelBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: AdminSlotWithReviewer | null;
}

export function CancelBookingDialog({
  open,
  onOpenChange,
  slot,
}: CancelBookingDialogProps) {
  const cancelBooking = useAdminCancelBookedSlot();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = async (values: FormValues) => {
    if (!slot) return;

    const slotDate = format(new Date(slot.start_at), "EEEE, MMMM d, yyyy");
    const slotTime = `${format(new Date(slot.start_at), "h:mm a")} - ${format(
      new Date(slot.end_at),
      "h:mm a"
    )}`;

    await cancelBooking.mutateAsync({
      slotId: slot.id,
      reason: values.reason,
      reviewerEmail: slot.reviewer.email,
      reviewerName: slot.reviewer.name,
      slotDate,
      slotTime,
    });

    onOpenChange(false);
    form.reset();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Cancel Booked Interview
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will cancel the interview booking for{" "}
            <strong>{slot?.reviewer.name}</strong> on{" "}
            <strong>
              {slot ? format(new Date(slot.start_at), "PPP") : ""}
            </strong>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Both the reviewer AND the provider will
            be notified about this cancellation. The provider will need to
            reschedule their interview.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Cancellation</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Reviewer emergency, Panel unavailable..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <AlertDialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Keep Booking
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={cancelBooking.isPending}
              >
                {cancelBooking.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Cancel Booking
              </Button>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
