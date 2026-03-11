/**
 * AssignRoleModal — SCR-09: Two-tab assign flow
 * Tab 1: New User (Invite) — name, email, domain taxonomy
 * Tab 2: Existing Team Member — select from org members
 * Role codes populated from md_slm_role_codes master data
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UserPlus, Users } from "lucide-react";
import { roleInviteSchema, type RoleInviteFormValues } from "@/lib/validations/roleAssignment";
import { useCreateRoleAssignment } from "@/hooks/queries/useRoleAssignments";
import type { SlmRoleCode } from "@/hooks/queries/useSlmRoleCodes";

interface AssignRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  preSelectedRoleCode?: string;
  availableRoles: SlmRoleCode[];
}

export function AssignRoleModal({
  open,
  onOpenChange,
  orgId,
  preSelectedRoleCode,
  availableRoles,
}: AssignRoleModalProps) {
  const [activeTab, setActiveTab] = useState("invite");
  const createAssignment = useCreateRoleAssignment();

  const form = useForm<RoleInviteFormValues>({
    resolver: zodResolver(roleInviteSchema),
    defaultValues: {
      org_id: orgId,
      role_code: preSelectedRoleCode ?? "",
      user_email: "",
      user_name: "",
      model_applicability: "both",
    },
  });

  const onSubmitInvite = async (data: RoleInviteFormValues) => {
    await createAssignment.mutateAsync({
      org_id: data.org_id,
      role_code: data.role_code,
      user_email: data.user_email,
      user_name: data.user_name,
      domain_tags: data.domain_tags as Record<string, unknown> | undefined,
      model_applicability: data.model_applicability,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Assign Role</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="shrink-0 grid w-full grid-cols-2">
            <TabsTrigger value="invite" className="gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              New User (Invite)
            </TabsTrigger>
            <TabsTrigger value="existing" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Existing Member
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="flex-1 min-h-0 overflow-y-auto py-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitInvite)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="role_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableRoles.map((role) => (
                            <SelectItem key={role.id} value={role.code}>
                              {role.display_name} ({role.code})
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
                  name="user_name"
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
                  name="user_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="user@organization.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="shrink-0 pt-4">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createAssignment.isPending}>
                    {createAssignment.isPending ? "Sending..." : "Send Invite"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="existing" className="flex-1 min-h-0 overflow-y-auto py-4">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Existing team member assignment will be available once team members are onboarded.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
