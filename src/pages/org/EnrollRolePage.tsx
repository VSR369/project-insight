/**
 * EnrollRolePage — Dedicated page for enrolling users into org roles.
 * Supports two modes:
 *   - Direct: Admin enters details → status = "active" immediately → confirmation email sent
 *   - Invite: Admin enters details → status = "invited" → invitation email sent → user accepts/declines
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useOrgContext } from "@/contexts/OrgContext";
import { useSlmRoleCodes } from "@/hooks/queries/useSlmRoleCodes";
import { useCreateRoleAssignment, useDirectEnrollRole, type CreateRoleAssignmentInput } from "@/hooks/queries/useRoleAssignments";
import { roleInviteSchema, type RoleInviteFormValues } from "@/lib/validations/roleAssignment";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Send, Zap, Loader2 } from "lucide-react";
import { FeatureErrorBoundary } from "@/components/ErrorBoundary";

type EnrollMode = "direct" | "invite";

function EnrollRolePageContent() {
  const [mode, setMode] = useState<EnrollMode>("invite");
  const { organizationId, orgName } = useOrgContext();
  const { data: roleCodes = [], isLoading: rolesLoading } = useSlmRoleCodes();
  const createAssignment = useCreateRoleAssignment();
  const directEnroll = useDirectEnrollRole();

  // Filter to agg/both roles (SOA context)
  const availableRoles = roleCodes.filter(
    (r) => r.model_applicability === "agg" || r.model_applicability === "both"
  );

  const form = useForm<RoleInviteFormValues>({
    resolver: zodResolver(roleInviteSchema),
    defaultValues: {
      org_id: organizationId || "",
      role_code: "",
      user_email: "",
      user_name: "",
      model_applicability: "both",
    },
  });

  const isSubmitting = createAssignment.isPending || directEnroll.isPending;

  const onSubmit = async (values: RoleInviteFormValues) => {
    if (!organizationId) {
      toast.error("Organization context missing");
      return;
    }

    const input: CreateRoleAssignmentInput = {
      org_id: organizationId,
      role_code: values.role_code,
      user_email: values.user_email,
      user_name: values.user_name,
      model_applicability: values.model_applicability,
    };

    try {
      if (mode === "direct") {
        const result = await directEnroll.mutateAsync(input);
        try {
          await supabase.functions.invoke("send-role-enrollment-confirmation", {
            body: { assignment_id: result.id, org_name: orgName },
          });
        } catch {
          toast.warning("Role enrolled but confirmation email could not be sent");
        }
      } else {
        const result = await createAssignment.mutateAsync(input);
        try {
          await supabase.functions.invoke("send-role-invitation", {
            body: { assignment_id: result.id, org_name: orgName },
          });
        } catch {
          toast.warning("Role assigned but invitation email could not be sent");
        }
      }
      form.reset({ org_id: organizationId, role_code: "", user_email: "", user_name: "", model_applicability: "both" });
    } catch {
      // Error handled by mutation onError
    }
  };

  const selectedRole = availableRoles.find((r) => r.code === form.watch("role_code"));

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Enroll Role User</h1>
        <p className="text-sm text-muted-foreground">
          Assign a user to an organizational role — choose Direct enrollment or send an Invitation.
        </p>
      </div>

      {/* Mode Toggle */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as EnrollMode)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invite" className="gap-2">
            <Send className="h-4 w-4" />
            Invite
          </TabsTrigger>
          <TabsTrigger value="direct" className="gap-2">
            <Zap className="h-4 w-4" />
            Direct
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Mode Description */}
      <Card className="border-dashed">
        <CardContent className="pt-4 pb-3">
          {mode === "invite" ? (
            <p className="text-sm text-muted-foreground">
              <Badge variant="secondary" className="mr-2">Invite</Badge>
              The user will receive an invitation email with accept/decline options. The role becomes active only when the user accepts.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Badge variant="default" className="mr-2">Direct</Badge>
              The role is activated immediately. The user receives a confirmation email with their active role details.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5 text-primary" />
            {mode === "invite" ? "Send Role Invitation" : "Direct Enrollment"}
          </CardTitle>
          <CardDescription>
            Enter the user's details and select a role to {mode === "invite" ? "invite them" : "enroll them directly"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="user_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="user_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="jane@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={rolesLoading ? "Loading roles…" : "Select a role"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role.id} value={role.code}>
                            <span className="flex items-center gap-2">
                              {role.display_name}
                              {role.is_core && (
                                <Badge variant="outline" className="text-[10px] ml-1">Core</Badge>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {selectedRole?.description && (
                      <p className="text-xs text-muted-foreground mt-1">{selectedRole.description}</p>
                    )}
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === "invite" ? "Sending Invitation…" : "Enrolling…"}
                  </>
                ) : (
                  <>
                    {mode === "invite" ? <Send className="mr-2 h-4 w-4" /> : <Zap className="mr-2 h-4 w-4" />}
                    {mode === "invite" ? "Send Invitation" : "Enroll Now"}
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EnrollRolePage() {
  return (
    <FeatureErrorBoundary featureName="Enroll Role">
      <EnrollRolePageContent />
    </FeatureErrorBoundary>
  );
}
