/**
 * AdminContactProfilePage — SCR-19: Platform Admin contact details
 * Back link, simple form, API info note, last updated timestamp
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Info, Save } from "lucide-react";
import { useAdminContact, useUpsertAdminContact } from "@/hooks/queries/useAdminContact";
import { adminContactSchema, type AdminContactFormValues } from "@/lib/validations/roleAssignment";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PhoneInputSplit, parsePhoneIntl, formatPhoneIntl } from "@/components/ui/PhoneInputSplit";
import { format } from "date-fns";

export default function AdminContactProfilePage() {
  const navigate = useNavigate();
  const { data: contact, isLoading } = useAdminContact();
  const upsert = useUpsertAdminContact();

  const form = useForm<AdminContactFormValues>({
    resolver: zodResolver(adminContactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone_country_code: "",
      phone_number: "",
    },
  });

  useEffect(() => {
    if (contact) {
      const parsed = parsePhoneIntl(contact.phone_intl);
      form.reset({
        name: contact.name,
        email: contact.email,
        phone_country_code: parsed.countryCode,
        phone_number: parsed.phoneNumber,
      });
    }
  }, [contact, form]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const onSubmit = async (data: AdminContactFormValues) => {
    const combined = formatPhoneIntl(data.phone_country_code || "", data.phone_number || "");
    await upsert.mutateAsync({
      id: contact?.id,
      name: data.name,
      email: data.email,
      phone_intl: combined || undefined,
    });
  };

  const lastUpdated = contact?.updated_at
    ? format(new Date(contact.updated_at), "dd MMM yyyy, HH:mm")
    : null;

  return (
    <ErrorBoundary componentName="AdminContactProfilePage">
      <div className="space-y-6 p-6">
        {/* Back link */}
        <button
          onClick={() => navigate("/admin/marketplace")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Role Management
        </button>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Contact Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Platform Admin contact details exposed via the Role Readiness API
          </p>
        </div>

        {/* Form Card */}
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
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
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="admin@platform.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Split phone: Country Code + Number */}
                <div>
                  <FormLabel>Phone (international format)</FormLabel>
                  <div className="mt-1.5">
                    <PhoneInputSplit
                      countryCode={form.watch("phone_country_code") || ""}
                      phoneNumber={form.watch("phone_number") || ""}
                      onCountryCodeChange={(v) => form.setValue("phone_country_code", v, { shouldDirty: true })}
                      onPhoneNumberChange={(v) => form.setValue("phone_number", v, { shouldDirty: true })}
                    />
                  </div>
                </div>

                {/* Info note */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2.5">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    This contact information is exposed via the Role Readiness API to the CLM module.
                    Changes will be reflected immediately in all API consumers.
                  </span>
                </div>

                {/* Last updated + Save */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    {lastUpdated && (
                      <p className="text-xs text-muted-foreground">
                        Last updated: {lastUpdated}
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={upsert.isPending || !form.formState.isDirty}
                    className="gap-1.5"
                  >
                    <Save className="h-4 w-4" />
                    {upsert.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
