import { useState } from "react";
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
  FormDescription,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format, addHours, setHours, setMinutes, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useActiveReviewers,
  useAdminCreateSlotForReviewer,
} from "@/hooks/queries/useAdminReviewerSlots";

const formSchema = z
  .object({
    reviewerId: z.string().min(1, "Please select a reviewer"),
    date: z.date({ required_error: "Please select a date" }),
    startTime: z.string().min(1, "Please select a start time"),
    endTime: z.string().min(1, "Please select an end time"),
    notifyReviewer: z.boolean().default(true),
  })
  .refine(
    (data) => {
      const [startHour, startMin] = data.startTime.split(":").map(Number);
      const [endHour, endMin] = data.endTime.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      return endMinutes > startMinutes;
    },
    { message: "End time must be after start time", path: ["endTime"] }
  );

type FormValues = z.infer<typeof formSchema>;

interface AddSlotForReviewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
});

export function AddSlotForReviewerDialog({
  open,
  onOpenChange,
}: AddSlotForReviewerDialogProps) {
  const { data: reviewers, isLoading: loadingReviewers } = useActiveReviewers();
  const createSlot = useAdminCreateSlotForReviewer();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reviewerId: "",
      startTime: "09:00",
      endTime: "10:00",
      notifyReviewer: true,
    },
  });

  const selectedReviewer = reviewers?.find(
    (r) => r.id === form.watch("reviewerId")
  );

  const onSubmit = async (values: FormValues) => {
    if (!selectedReviewer) return;

    const [startHour, startMin] = values.startTime.split(":").map(Number);
    const [endHour, endMin] = values.endTime.split(":").map(Number);

    const startAt = setMinutes(setHours(values.date, startHour), startMin);
    const endAt = setMinutes(setHours(values.date, endHour), endMin);

    // Validate future time
    if (isBefore(startAt, new Date())) {
      form.setError("date", { message: "Slot must be in the future" });
      return;
    }

    await createSlot.mutateAsync({
      reviewerId: values.reviewerId,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      notifyReviewer: values.notifyReviewer,
      reviewerEmail: selectedReviewer.email,
      reviewerName: selectedReviewer.name,
    });

    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Slot for Reviewer</DialogTitle>
          <DialogDescription>
            Create an interview availability slot on behalf of a reviewer.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Reviewer Selection */}
            <FormField
              control={form.control}
              name="reviewerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reviewer</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={loadingReviewers}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reviewer..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {reviewers?.map((reviewer) => (
                        <SelectItem key={reviewer.id} value={reviewer.id}>
                          <div className="flex flex-col">
                            <span>{reviewer.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {reviewer.email}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Selection */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
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

            {/* Notify Checkbox */}
            <FormField
              control={form.control}
              name="notifyReviewer"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Notify reviewer by email</FormLabel>
                    <FormDescription>
                      Send an email to inform the reviewer about this new slot.
                    </FormDescription>
                  </div>
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
              <Button type="submit" disabled={createSlot.isPending}>
                {createSlot.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Slot
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
