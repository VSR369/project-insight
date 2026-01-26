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
import { Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useAdminDeleteSlot } from "@/hooks/queries/useAdminReviewerSlots";
import type { AdminSlotWithReviewer } from "@/hooks/queries/useAdminReviewerSlots";

const formSchema = z.object({
  reason: z.string().min(5, "Please provide a reason (min 5 characters)"),
});

type FormValues = z.infer<typeof formSchema>;

interface DeleteSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: AdminSlotWithReviewer | null;
}

export function DeleteSlotDialog({
  open,
  onOpenChange,
  slot,
}: DeleteSlotDialogProps) {
  const deleteSlot = useAdminDeleteSlot();

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

    await deleteSlot.mutateAsync({
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
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Interview Slot
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove the slot for{" "}
            <strong>{slot?.reviewer.name}</strong> on{" "}
            <strong>
              {slot ? format(new Date(slot.start_at), "PPP") : ""}
            </strong>{" "}
            at{" "}
            <strong>
              {slot
                ? `${format(new Date(slot.start_at), "h:mm a")} - ${format(
                    new Date(slot.end_at),
                    "h:mm a"
                  )}`
                : ""}
            </strong>
            . The reviewer will be notified.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Deletion</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Reviewer no longer available, Admin cleanup..."
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
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={deleteSlot.isPending}
              >
                {deleteSlot.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete Slot
              </Button>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
