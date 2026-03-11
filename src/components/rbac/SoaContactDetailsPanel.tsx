/**
 * SoaContactDetailsPanel — SCR-20: Collapsible accordion with inline SOA contact edit
 * "Contact Details — {name}" header, 3-column form, save button
 */

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ChevronDown, ChevronRight, Info, Save } from "lucide-react";
import { useAdminContact, useUpsertAdminContact } from "@/hooks/queries/useAdminContact";
import { adminContactSchema, type AdminContactFormValues } from "@/lib/validations/roleAssignment";
import { format } from "date-fns";

export function SoaContactDetailsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: contact } = useAdminContact();
  const upsert = useUpsertAdminContact();

  const form = useForm<AdminContactFormValues>({
    resolver: zodResolver(adminContactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone_intl: "",
    },
  });

  useEffect(() => {
    if (contact) {
      form.reset({
        name: contact.name,
        email: contact.email,
        phone_intl: contact.phone_intl ?? "",
      });
    }
  }, [contact, form]);

  const onSubmit = async (data: AdminContactFormValues) => {
    await upsert.mutateAsync({
      id: contact?.id,
      name: data.name,
      email: data.email,
      phone_intl: data.phone_intl || undefined,
    });
  };

  const contactName = contact?.name || "Not configured";
  const lastUpdated = contact?.updated_at
    ? format(new Date(contact.updated_at), "dd MMM yyyy, HH:mm")
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="name"
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
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="admin@org.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone_intl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
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
                  disabled={upsert.isPending || !form.formState.isDirty}
                  className="gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  {upsert.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
