/**
 * SoaContactDetailsPanel — SCR-20: Collapsible accordion with inline SOA contact edit
 * "Contact Details — {name}" header, form fields, save button
 * Data source: seeking_org_admins (SOA's own profile)
 */

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ChevronDown, ChevronRight, Info, Save } from "lucide-react";
import { useSoaProfile, useUpdateSoaProfile } from "@/hooks/queries/useSoaProfile";
import { useOrgContext } from "@/contexts/OrgContext";
import { z } from "zod";
import { format } from "date-fns";

const soaContactSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(100),
  phone: z.string().max(30).optional().or(z.literal("")),
  title: z.string().max(100).optional().or(z.literal("")),
});

type SoaContactFormValues = z.infer<typeof soaContactSchema>;

export function SoaContactDetailsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { organizationId } = useOrgContext();
  const { data: profile } = useSoaProfile(organizationId);
  const updateProfile = useUpdateSoaProfile();

  const form = useForm<SoaContactFormValues>({
    resolver: zodResolver(soaContactSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      title: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        title: profile.title || "",
      });
    }
  }, [profile, form]);

  const onSubmit = async (data: SoaContactFormValues) => {
    if (!profile?.id) return;
    await updateProfile.mutateAsync({
      id: profile.id,
      full_name: data.full_name,
      phone: data.phone || undefined,
      title: data.title || undefined,
    });
  };

  const contactName = profile?.full_name || "Not configured";
  const lastUpdated = profile?.updated_at
    ? format(new Date(profile.updated_at), "dd MMM yyyy, HH:mm")
    : null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-left hover:bg-accent/50 transition-colors">
          <span className="text-sm font-medium text-foreground">
            Contact Details — {contactName}
          </span>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border border-t-0 rounded-b-lg px-4 py-4 bg-card">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      value={profile?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Email is linked to your auth account</p>
                </FormItem>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 555-000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title / Designation</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Program Manager" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  This contact is surfaced when your challenge has a role gap.
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  {lastUpdated && (
                    <p className="text-xs text-muted-foreground">
                      Last updated: {lastUpdated}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updateProfile.isPending || !form.formState.isDirty}
                  className="gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  {updateProfile.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
