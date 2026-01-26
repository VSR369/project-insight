import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format, setHours, setMinutes, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useAdminModifySlot } from "@/hooks/queries/useAdminReviewerSlots";
import type { AdminSlotWithReviewer } from "@/hooks/queries/useAdminReviewerSlots";

const formSchema = z
  .object({
    date: z.date({ required_error: "Please select a date" }),
    startTime: z.string().min(1, "Please select a start time"),
    endTime: z.string().min(1, "Please select an end time"),
    reason: z.string().min(5, "Please provide a reason (min 5 characters)"),
  })
  .refine(
    (data) => {
      const [startHour, startMin] = data.startTime.split(":").map(Number);
      const [endHour, endMin] = data.endTime.split(":").map(Number);
      return endHour * 60 + endMin > startHour * 60 + startMin;
    },
    { message: "End time must be after start time", path: ["endTime"] }
  );

type FormValues = z.infer<typeof formSchema>;

interface ModifySlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: AdminSlotWithReviewer | null;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
});

export function ModifySlotDialog({
  open,
  onOpenChange,
  slot,
}: ModifySlotDialogProps) {
  const modifySlot = useAdminModifySlot();

  const slotDate = slot ? new Date(slot.start_at) : new Date();
  const startTimeStr = slot
    ? format(new Date(slot.start_at), "HH:mm")
    : "09:00";
  const endTimeStr = slot ? format(new Date(slot.end_at), "HH:mm") : "10:00";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: slotDate,
      startTime: startTimeStr,
      endTime: endTimeStr,
      reason: "",
    },
  });

  // Reset form when slot changes
  if (slot && form.getValues("date").toISOString() !== slotDate.toISOString()) {
    form.reset({
      date: slotDate,
      startTime: startTimeStr,
      endTime: endTimeStr,
      reason: "",
    });
  }

  const onSubmit = async (values: FormValues) => {
    if (!slot) return;

    const [startHour, startMin] = values.startTime.split(":").map(Number);
    const [endHour, endMin] = values.endTime.split(":").map(Number);

    const newStartAt = setMinutes(setHours(values.date, startHour), startMin);
    const newEndAt = setMinutes(setHours(values.date, endHour), endMin);

    if (isBefore(newStartAt, new Date())) {
      form.setError("date", { message: "Slot must be in the future" });
      return;
    }

    await modifySlot.mutateAsync({
      slotId: slot.id,
      reviewerId: slot.reviewer_id,
      newStartAt: newStartAt.toISOString(),
      newEndAt: newEndAt.toISOString(),
      reason: values.reason,
      reviewerEmail: slot.reviewer.email,
      reviewerName: slot.reviewer.name,
    });

    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modify Slot Time</DialogTitle>
          <DialogDescription>
            Change the date/time for {slot?.reviewer.name}'s slot. The reviewer
            will be notified.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Date Selection */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>New Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          isBefore(date, startOfDay(new Date()))
                        }
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Selection */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60">
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60">
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Change</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Schedule conflict, Admin adjustment..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={modifySlot.isPending}>
                {modifySlot.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
