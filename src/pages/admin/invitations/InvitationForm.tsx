import * as React from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";

const invitationSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email must be 255 characters or less"),
  first_name: z.string().trim().max(100, "First name must be 100 characters or less").optional().nullable(),
  last_name: z.string().trim().max(100, "Last name must be 100 characters or less").optional().nullable(),
  invitation_type: z.enum(["standard", "vip_expert"]),
  industry_segment_id: z.string().uuid().optional().nullable(),
  message: z.string().trim().max(1000, "Message must be 1000 characters or less").optional().nullable(),
});

type InvitationFormData = z.infer<typeof invitationSchema>;

interface InvitationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InvitationFormData) => Promise<void>;
  isLoading?: boolean;
}

export function InvitationForm({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: InvitationFormProps) {
  const { data: industrySegments = [] } = useIndustrySegments(false);

  const form = useForm<InvitationFormData>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      invitation_type: "standard",
      industry_segment_id: null,
      message: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        email: "",
        first_name: "",
        last_name: "",
        invitation_type: "standard",
        industry_segment_id: null,
        message: "",
      });
    }
  }, [open, form]);

  const handleSubmit = async (data: InvitationFormData) => {
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch {
      // Error handled by parent
    }
  };

  const invitationType = form.watch("invitation_type");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Invitation</DialogTitle>
          <DialogDescription>
            Invite a solution provider to join the platform
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="provider@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Invitation Type */}
            <FormField
              control={form.control}
              name="invitation_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invitation Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="vip_expert">VIP Expert</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {invitationType === "vip_expert"
                      ? "VIP experts receive priority verification and enhanced visibility"
                      : "Standard providers go through regular verification process"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Industry Segment */}
            <FormField
              control={form.control}
              name="industry_segment_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry Segment</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {industrySegments.map((segment) => (
                        <SelectItem key={segment.id} value={segment.id}>
                          {segment.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Pre-select an industry segment for the provider
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a personal message to the invitation..."
                      className="min-h-[80px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional message included in the invitation email
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
