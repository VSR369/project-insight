/**
 * MsmeQuickAssignModal — 3-tab bulk assign: Myself / New User / Existing Member
 * Purple info banner, user card, role checkboxes with badges, summary bar, warnings
 * 
 * "Myself" tab uses real admin profile from useCurrentAdminProfile — no hardcoded user data.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { EnrollModeToggle, type EnrollMode } from "@/components/rbac/shared/EnrollModeToggle";
import { deduplicateMembers } from "@/lib/roleUtils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { InitialsAvatar } from "@/components/admin/platform-admins/InitialsAvatar";
import { User, UserPlus, Users, Info, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useSlmRoleCodes, type SlmRoleCode } from "@/hooks/queries/useSlmRoleCodes";
import { useBulkCreateRoleAssignments, useDirectEnrollRole, useCreateRoleAssignment } from "@/hooks/queries/useRoleAssignments";
import { useCurrentAdminProfile } from "@/hooks/queries/useCurrentAdminProfile";
import { useAuth } from "@/hooks/useAuth";
import { useOrgContext } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import type { RoleAssignment } from "@/hooks/queries/useRoleAssignments";
import { ScopeMultiSelect } from "@/components/org/ScopeMultiSelect";
import { EMPTY_SCOPE, type DomainScope } from "@/hooks/queries/useDelegatedAdmins";

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
  const [activeTab, setActiveTab] = useState<"myself" | "new_user" | "existing">("myself");
  const [enrollMode, setEnrollMode] = useState<EnrollMode>("direct");
  const [taxonomyOpen, setTaxonomyOpen] = useState(false);
  const [domainScope, setDomainScope] = useState<DomainScope>({ ...EMPTY_SCOPE });
  const [selectedMemberEmail, setSelectedMemberEmail] = useState<string | null>(null);
  const { data: allRoles } = useSlmRoleCodes();
  const bulkCreate = useBulkCreateRoleAssignments();
  const directEnroll = useDirectEnrollRole();
  const createAssignment = useCreateRoleAssignment();
  const { data: adminProfile, isLoading: profileLoading } = useCurrentAdminProfile();
  const { user } = useAuth();
  const { orgName } = useOrgContext();

  const applicableRoles = allRoles?.filter((r) =>
    r.model_applicability === "agg" || r.model_applicability === "both"
  ) ?? [];

  // Derive existing team members from assignments (deduplicated by email)
  const existingMembers = useMemo(() => {
    const members = deduplicateMembers(assignments);
    // Flatten roles to simple string[] for this component's simpler data model
    return members.map((m) => ({
      email: m.email,
      name: m.name,
      roles: m.roles.map((r) => r.code),
    }));
  }, [assignments]);

  // Derive admin display values from real profile — never hardcoded
  const adminName = adminProfile?.full_name ?? "Current Admin";
  const adminEmail = user?.email ?? "";
  // adminInitials no longer needed — InitialsAvatar handles it

  const form = useForm<QuickAssignValues>({
    resolver: zodResolver(quickAssignSchema),
    defaultValues: {
      user_name: "",
      user_email: "",
      selected_roles: [],
    },
  });

  const selectedRoles = form.watch("selected_roles");
  const userEmail = form.watch("user_email");

  const isRoleFilled = (code: string) =>
    assignments.some((a) => a.role_code === code && (a.status === "active" || a.status === "invited"));

  const handleSelectAll = () => {
    form.setValue("selected_roles", applicableRoles.map((r) => r.code));
  };

  const handleClearAll = () => {
    form.setValue("selected_roles", []);
  };

  const onSubmit = async (data: QuickAssignValues) => {
    if (enrollMode === "direct") {
      // Direct mode: bulk insert as active, then send confirmation emails
      const inputs = data.selected_roles.map((roleCode) => ({
        org_id: orgId,
        role_code: roleCode,
        user_email: data.user_email,
        user_name: data.user_name,
        status: "active" as const,
        model_applicability: "both",
        domain_tags: domainScope as any,
      }));
      const results = await bulkCreate.mutateAsync(inputs);
      // Fire confirmation emails (non-blocking)
      for (const result of results ?? []) {
        supabase.functions.invoke("send-role-enrollment-confirmation", {
          body: { assignment_id: result.id, org_name: orgName },
        }).catch(() => {});
      }
    } else {
      // Invite mode: create individually with invited status, send invitation emails
      for (const roleCode of data.selected_roles) {
        const result = await createAssignment.mutateAsync({
          org_id: orgId,
          role_code: roleCode,
          user_email: data.user_email,
          user_name: data.user_name,
          model_applicability: "both",
          domain_tags: domainScope as any,
        });
        supabase.functions.invoke("send-role-invitation", {
          body: { assignment_id: result.id, org_name: orgName },
        }).catch(() => {});
      }
    }
    form.reset();
    setDomainScope({ ...EMPTY_SCOPE });
    onOpenChange(false);
  };

  const selectedRoleNames = applicableRoles
    .filter((r) => selectedRoles.includes(r.code))
    .map((r) => r.display_name);

  // Derive the effective email for summary display
  const effectiveEmail = activeTab === "myself" ? adminEmail : activeTab === "existing" ? selectedMemberEmail ?? "" : userEmail;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-0">
          <DialogTitle className="text-lg">MSME Quick Assign</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Assign one person to multiple roles at once
          </p>
        </DialogHeader>

        {/* Purple info banner */}
        <div className="shrink-0 mx-6 mt-3 flex items-start gap-2 text-xs bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-md px-3 py-2">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            MSME mode is active. One person can be assigned to all aggregator roles simultaneously.
          </span>
        </div>

        {/* Direct / Invite Toggle */}
        <div className="shrink-0 mx-6 mt-3">
          <EnrollModeToggle mode={enrollMode} onModeChange={setEnrollMode} primaryOption="direct" />
        </div>

        {/* Tab Toggle */}
        <div className="shrink-0 mx-6 mt-3 grid grid-cols-3 gap-1 bg-muted rounded-lg p-1">
          {(["myself", "new_user", "existing"] as const).map((tab) => {
            const icons = { myself: User, new_user: UserPlus, existing: Users };
            const labels = { myself: "Myself", new_user: `New User (${enrollMode === "direct" ? "Direct" : "Invite"})`, existing: "Existing Team Member" };
            const Icon = icons[tab];
            return (
              <button
                key={tab}
                type="button"
                className={`flex items-center justify-center gap-1 rounded-md px-2 py-2 text-[11px] font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                <Icon className="h-3 w-3" />
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {activeTab === "myself" ? (
            <div className="space-y-4">
              {/* User card — dynamic from admin profile */}
              {profileLoading ? (
                <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                  <InitialsAvatar name={adminName} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{adminName}</p>
                    <p className="text-xs text-muted-foreground truncate">{adminEmail}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {adminProfile?.admin_tier ?? "Platform Admin"} — self-assigning all selected roles
                    </p>
                  </div>
                </div>
              )}

              {/* Roles section */}
              <RoleSelectionSection
                applicableRoles={applicableRoles}
                selectedRoles={selectedRoles}
                isRoleFilled={isRoleFilled}
                form={form}
                onSelectAll={handleSelectAll}
                onClearAll={handleClearAll}
              />

            </div>
          ) : activeTab === "new_user" ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="msme-assign-form">
                <FormField
                  control={form.control}
                  name="user_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
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
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="user@organization.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <RoleSelectionSection
                  applicableRoles={applicableRoles}
                  selectedRoles={selectedRoles}
                  isRoleFilled={isRoleFilled}
                  form={form}
                  onSelectAll={handleSelectAll}
                  onClearAll={handleClearAll}
                />
              </form>
            </Form>
          ) : existingMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No existing team members yet. Use the "New User (Invite)" tab to add someone.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Member list */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Select a Team Member</Label>
                {existingMembers.map((member) => {
                  const isSelected = selectedMemberEmail === member.email;
                  return (
                    <button
                      key={member.email}
                      type="button"
                      className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "bg-background hover:bg-muted/50"
                      }`}
                      onClick={() => {
                        setSelectedMemberEmail(member.email);
                        form.setValue("user_name", member.name ?? "");
                        form.setValue("user_email", member.email);
                      }}
                    >
                      <InitialsAvatar name={member.name ?? member.email} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {member.name ?? "Unnamed"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-1 shrink-0">
                        {member.roles.map((rc) => {
                          const roleMeta = allRoles?.find((r) => r.code === rc);
                          return (
                            <Badge key={rc} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {roleMeta?.display_name ?? rc}
                            </Badge>
                          );
                        })}

                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Role selection — shown after member selected */}
              {selectedMemberEmail && (
                <RoleSelectionSection
                  applicableRoles={applicableRoles}
                  selectedRoles={selectedRoles}
                  isRoleFilled={isRoleFilled}
                  form={form}
                  onSelectAll={handleSelectAll}
                  onClearAll={handleClearAll}
                />
              )}
            </div>
          )}

          {/* Domain Taxonomy — shared across all tabs */}
          <Collapsible open={taxonomyOpen} onOpenChange={setTaxonomyOpen}>
            <CollapsibleTrigger asChild>
              <button type="button" className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors py-1">
                {taxonomyOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Domain Taxonomy (Optional)
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-6 pt-2">
                <ScopeMultiSelect
                  value={domainScope}
                  onChange={setDomainScope}
                  hideDepartments
                  allowAll
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Summary Bar + Footer */}
        <div className="shrink-0 border-t px-6 py-4 space-y-3">
          {selectedRoles.length > 0 && effectiveEmail && (
            <div className="flex items-center gap-2 text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-md px-3 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>
                Ready to {enrollMode === "direct" ? "assign" : "invite"} {selectedRoles.length} role{selectedRoles.length !== 1 ? "s" : ""} to {effectiveEmail || "user"}
              </span>
              <div className="flex flex-wrap gap-1 ml-1">
                {selectedRoleNames.slice(0, 3).map((name) => (
                  <Badge key={name} variant="outline" className="text-[10px] bg-green-100/50 dark:bg-green-900/30 border-green-300 dark:border-green-700">
                    {name}
                  </Badge>
                ))}
                {selectedRoleNames.length > 3 && (
                  <Badge variant="outline" className="text-[10px]">+{selectedRoleNames.length - 3}</Badge>
                )}
              </div>
            </div>
          )}

          {selectedRoles.length >= 4 && (
            <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                This person will hold all {selectedRoles.length} roles. This is typical for MSMEs but may need review for larger organisations.
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={bulkCreate.isPending || createAssignment.isPending || directEnroll.isPending || selectedRoles.length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {(bulkCreate.isPending || createAssignment.isPending || directEnroll.isPending)
                ? (enrollMode === "direct" ? "Assigning..." : "Inviting...")
                : enrollMode === "direct"
                  ? `Assign ${selectedRoles.length} Role${selectedRoles.length !== 1 ? "s" : ""}`
                  : `Invite ${selectedRoles.length} Role${selectedRoles.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Shared role checkbox section */
function RoleSelectionSection({
  applicableRoles,
  selectedRoles,
  isRoleFilled,
  form,
  onSelectAll,
  onClearAll,
}: {
  applicableRoles: SlmRoleCode[];
  selectedRoles: string[];
  isRoleFilled: (code: string) => boolean;
  form: ReturnType<typeof useForm<QuickAssignValues>>;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-medium">
          Roles to Assign ({selectedRoles.length} selected)
        </Label>
        <div className="flex items-center gap-2 text-xs">
          <button type="button" className="text-primary hover:underline" onClick={onSelectAll}>
            Select All
          </button>
          <span className="text-muted-foreground">|</span>
          <button type="button" className="text-muted-foreground hover:underline" onClick={onClearAll}>
            Clear
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        {applicableRoles.map((role) => {
          const filled = isRoleFilled(role.code);
          const isChecked = selectedRoles.includes(role.code);
          return (
            <div
              key={role.id}
              className="flex items-center gap-3 p-2.5 rounded-md border bg-background"
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={(checked) => {
                  const current = form.getValues("selected_roles");
                  if (checked) {
                    form.setValue("selected_roles", [...current, role.code]);
                  } else {
                    form.setValue("selected_roles", current.filter((c) => c !== role.code));
                  }
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{role.display_name}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {role.code}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="text-[10px]"
                  >
                    {role.is_core ? "core" : "challenge"}
                  </Badge>
                </div>
              </div>
              {filled && (
                <span className="text-[10px] text-green-600 dark:text-green-400 shrink-0">
                  Already filled — assigning will add as co-holder
                </span>
              )}
            </div>
          );
        })}
      </div>
      {form.formState.errors.selected_roles && (
        <p className="text-sm text-destructive mt-1">
          {form.formState.errors.selected_roles.message}
        </p>
      )}
    </div>
  );
}
