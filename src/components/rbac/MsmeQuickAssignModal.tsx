/**
 * MsmeQuickAssignModal — 3-tab bulk assign: Myself / New User / Existing Member
 * Role checkboxes from md_slm_role_codes — no hardcoded values
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { User, UserPlus, Users, Zap } from "lucide-react";
import { useSlmRoleCodes, type SlmRoleCode } from "@/hooks/queries/useSlmRoleCodes";
import { useBulkCreateRoleAssignments } from "@/hooks/queries/useRoleAssignments";
import type { RoleAssignment } from "@/hooks/queries/useRoleAssignments";

const quickAssignSchema = z.object({
  user_name: z.string().trim().min(1, "Name is required").max(120),
  user_email: z.string().email("Invalid email"),
  selected_roles: z.array(z.string()).min(1, "Select at least one role"),
});
type QuickAssignValues = z.infer<typeof quickAssignSchema>;

interface MsmeQuickAssignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  assignments: RoleAssignment[];
}

export function MsmeQuickAssignModal({ open, onOpenChange, orgId, assignments }: MsmeQuickAssignModalProps) {
  const [activeTab, setActiveTab] = useState("new_user");
  const { data: allRoles } = useSlmRoleCodes();
  const bulkCreate = useBulkCreateRoleAssignments();

  // Get all applicable roles (core + challenge)
  const applicableRoles = allRoles?.filter((r) =>
    r.model_applicability === "mp" || r.model_applicability === "both"
  ) ?? [];

  const form = useForm<QuickAssignValues>({
    resolver: zodResolver(quickAssignSchema),
    defaultValues: {
      user_name: "",
      user_email: "",
      selected_roles: [],
    },
  });

  const isRoleFilled = (code: string) =>
    assignments.some((a) => a.role_code === code && (a.status === "active" || a.status === "invited"));

  const onSubmit = async (data: QuickAssignValues) => {
    const inputs = data.selected_roles.map((roleCode) => ({
      org_id: orgId,
      role_code: roleCode,
      user_email: data.user_email,
      user_name: data.user_name,
      status: "active" as const,
      model_applicability: "both",
    }));
    await bulkCreate.mutateAsync(inputs);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Assign All Roles
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="shrink-0 grid w-full grid-cols-3">
            <TabsTrigger value="myself" className="gap-1 text-xs">
              <User className="h-3.5 w-3.5" />
              Myself
            </TabsTrigger>
            <TabsTrigger value="new_user" className="gap-1 text-xs">
              <UserPlus className="h-3.5 w-3.5" />
              New User
            </TabsTrigger>
            <TabsTrigger value="existing" className="gap-1 text-xs">
              <Users className="h-3.5 w-3.5" />
              Existing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="myself" className="flex-1 min-h-0 overflow-y-auto py-4">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <User className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                "Assign to Myself" will auto-populate your profile details. This requires authentication context.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="new_user" className="flex-1 min-h-0 overflow-y-auto py-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                <div>
                  <Label className="text-sm font-medium">Select Roles</Label>
                  <div className="mt-2 space-y-2">
                    {applicableRoles.map((role) => {
                      const filled = isRoleFilled(role.code);
                      return (
                        <RoleCheckboxItem
                          key={role.id}
                          role={role}
                          isFilled={filled}
                          form={form}
                        />
                      );
                    })}
                  </div>
                  {form.formState.errors.selected_roles && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.selected_roles.message}
                    </p>
                  )}
                </div>

                <DialogFooter className="shrink-0 pt-4">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={bulkCreate.isPending}>
                    {bulkCreate.isPending ? "Assigning..." : "Assign Selected Roles"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="existing" className="flex-1 min-h-0 overflow-y-auto py-4">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Existing team member selection will be available once team members are onboarded.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function RoleCheckboxItem({
  role,
  isFilled,
  form,
}: {
  role: SlmRoleCode;
  isFilled: boolean;
  form: ReturnType<typeof useForm<QuickAssignValues>>;
}) {
  const selectedRoles = form.watch("selected_roles");

  return (
    <div className="flex items-center gap-3 p-2 rounded-md border bg-background">
      <Checkbox
        checked={selectedRoles.includes(role.code)}
        disabled={isFilled}
        onCheckedChange={(checked) => {
          const current = form.getValues("selected_roles");
          if (checked) {
            form.setValue("selected_roles", [...current, role.code]);
          } else {
            form.setValue("selected_roles", current.filter((c) => c !== role.code));
          }
        }}
      />
      <div className="flex-1">
        <span className="text-sm font-medium text-foreground">{role.display_name}</span>
        <Badge variant="outline" className="ml-2 text-[10px]">
          {role.is_core ? "core" : "challenge"}
        </Badge>
      </div>
      {isFilled && (
        <Badge variant="secondary" className="text-[10px]">
          Already filled
        </Badge>
      )}
    </div>
  );
}
