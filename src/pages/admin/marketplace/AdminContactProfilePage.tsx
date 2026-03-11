/**
 * AdminContactProfilePage — SCR-19: Platform Admin contact details
 * Exposed via Role Readiness API for org admins to reach out
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, Phone, Mail, User, Save } from "lucide-react";
import { useAdminContact, useUpsertAdminContact } from "@/hooks/queries/useAdminContact";
import { adminContactSchema, type AdminContactFormValues } from "@/lib/validations/roleAssignment";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useEffect } from "react";

export default function AdminContactProfilePage() {
  // ══════════════════════════════════════
  // SECTION 1: Query hooks
  // ══════════════════════════════════════
  const { data: contact, isLoading } = useAdminContact();
  const upsert = useUpsertAdminContact();

  // ══════════════════════════════════════
  // SECTION 2: Form hooks
  // ══════════════════════════════════════
  const form = useForm<AdminContactFormValues>({
    resolver: zodResolver(adminContactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone_intl: "",
    },
  });

  // ══════════════════════════════════════
  // SECTION 3: useEffect hooks
  // ══════════════════════════════════════
  useEffect(() => {
    if (contact) {
      form.reset({
        name: contact.name,
        email: contact.email,
        phone_intl: contact.phone_intl ?? "",
      });
    }
  }, [contact, form]);

  // ══════════════════════════════════════
  // SECTION 4: Conditional returns (AFTER ALL HOOKS)
  // ══════════════════════════════════════
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // ══════════════════════════════════════
  // SECTION 5: Event handlers
  // ══════════════════════════════════════
  const onSubmit = async (data: AdminContactFormValues) => {
    await upsert.mutateAsync({
      id: contact?.id,
      name: data.name,
      email: data.email,
      phone_intl: data.phone_intl || undefined,
    });
  };

  // ══════════════════════════════════════
  // SECTION 6: Render
  // ══════════════════════════════════════
  return (
    <ErrorBoundary componentName="AdminContactProfilePage">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <nav className="text-xs text-muted-foreground mb-1">
            Platform Admin &gt; Marketplace &gt; Admin Contact
          </nav>
          <h1 className="text-2xl font-bold text-foreground">Admin Contact Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Contact details exposed to seeking organizations via the Role Readiness API.
          </p>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 rounded-lg border bg-primary/5 border-primary/20 p-4">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Role Readiness API Contact</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              These details are shown to organization admins when their role configuration is incomplete (NOT READY status).
              They can use this contact to request assistance with role assignments.
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Details</CardTitle>
            <CardDescription>
              Update the platform administrator contact information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        Full Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter admin name" {...field} />
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
                      <FormLabel className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="admin@platform.com" {...field} />
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
                      <FormLabel className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        Phone (International)
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={upsert.isPending} className="gap-1.5">
                  <Save className="h-4 w-4" />
                  {upsert.isPending ? "Saving..." : "Save Contact"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
