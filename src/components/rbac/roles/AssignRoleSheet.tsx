/**
 * AssignRoleSheet — SCR-09: Side-sheet for role assignment
 * User-centric flow: existing members can be assigned ANY available role.
 * Includes role selector dropdown per member, filtering out already-held roles.
 * Shows full member details with role display names and assignment statuses.
 */

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Info, Users, UserPlus, CheckCircle, Zap } from "lucide-react";
import { EnrollModeToggle, type EnrollMode } from "@/components/rbac/shared/EnrollModeToggle";
import { deduplicateMembers } from "@/lib/roleUtils";
import { InitialsAvatar } from "@/components/admin/platform-admins/InitialsAvatar";
import type { Json } from "@/integrations/supabase/types";
import { roleInviteSchema, type RoleInviteFormValues } from "@/lib/validations/roleAssignment";
import { useCreateRoleAssignment, useDirectEnrollRole, useRoleAssignments } from "@/hooks/queries/useRoleAssignments";
import { useOrgContext } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useSlmRoleCodes } from "@/hooks/queries/useSlmRoleCodes";
import type { SlmRoleCode } from "@/hooks/queries/useSlmRoleCodes";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import { useSubDomains } from "@/hooks/queries/useProficiencyTaxonomy";
import { useSpecialities } from "@/hooks/queries/useProficiencyTaxonomy";
import { useProficiencyLevels } from "@/hooks/queries/useProficiencyLevels";

interface AssignRoleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  preSelectedRoleCode?: string;
  availableRoles: SlmRoleCode[];
}

export function AssignRoleSheet({
  open,
  onOpenChange,
  orgId,
  preSelectedRoleCode,
  availableRoles,
}: AssignRoleSheetProps) {
  // ══════════════════════════════════════
  // SECTION 1: useState hooks
  // ══════════════════════════════════════
  const [activeTab, setActiveTab] = useState<"invite" | "existing">("invite");
  const [enrollMode, setEnrollMode] = useState<EnrollMode>("invite");
  const [taxonomyOpen, setTaxonomyOpen] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [selectedSubDomain, setSelectedSubDomain] = useState<string>("");
  const [manualRoleCode, setManualRoleCode] = useState<string>("");
  const [selectedMemberEmail, setSelectedMemberEmail] = useState<string>("");
  const [existingMemberRoleCode, setExistingMemberRoleCode] = useState<string>("");

  // ══════════════════════════════════════
  // SECTION 2: Query/Mutation hooks
  // ══════════════════════════════════════
  const { orgName } = useOrgContext();
  const createAssignment = useCreateRoleAssignment();
  const directEnroll = useDirectEnrollRole();
  const { data: existingAssignments } = useRoleAssignments(orgId);
  const { data: allRoleCodes } = useSlmRoleCodes();
  const { data: industries } = useIndustrySegments();
  const { data: subDomains } = useSubDomains(selectedIndustry || undefined);
  const { data: specialties } = useSpecialities(selectedSubDomain || undefined);
  const { data: proficiencyLevels } = useProficiencyLevels();

  // ══════════════════════════════════════
  // SECTION 3: Form hooks
  // ══════════════════════════════════════
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

  // ══════════════════════════════════════
  // SECTION 4: useEffect hooks
  // ══════════════════════════════════════
  useEffect(() => {
    if (open) {
      const code = preSelectedRoleCode || "";
      form.setValue("role_code", code);
      setManualRoleCode(code);
      setSelectedMemberEmail("");
      setExistingMemberRoleCode("");
    }
  }, [preSelectedRoleCode, open, form]);

  // Reset cascading selectors
  useEffect(() => {
    setSelectedSubDomain("");
  }, [selectedIndustry]);

  // Reset role selection when member changes
  useEffect(() => {
    setExistingMemberRoleCode("");
  }, [selectedMemberEmail]);

  // ══════════════════════════════════════
  // SECTION 5: Derived state
  // ══════════════════════════════════════
  const effectiveRoleCode = preSelectedRoleCode || manualRoleCode;
  const selectedRole = availableRoles.find((r) => r.code === effectiveRoleCode);
  const roleTitle = selectedRole?.display_name ?? "Role";
  const showRoleSelector = !preSelectedRoleCode && availableRoles.length > 0;

  const existingMembers = deduplicateMembers(existingAssignments);

  // Use the full role catalog for computing assignable roles
  const fullRoleCatalog = (allRoleCodes ?? availableRoles).filter(
    (r) => r.model_applicability !== "mp"
  );

  // For the selected member, compute which roles they can still be assigned
  const selectedMember = existingMembers.find((m) => m.email === selectedMemberEmail);
  const memberRoleCodes = selectedMember?.roles.map((r) => r.code) ?? [];
  const assignableRolesForMember = selectedMember
    ? fullRoleCatalog.filter((r) => !memberRoleCodes.includes(r.code))
    : [];

  // Group assignable roles by category
  const coreAssignableRoles = assignableRolesForMember.filter((r) => r.is_core);
  const challengeAssignableRoles = assignableRolesForMember.filter((r) => !r.is_core);

  const hasExistingMembers = existingMembers.length > 0;

  // ══════════════════════════════════════
  // SECTION 6: Event handlers
  // ══════════════════════════════════════
  const handleRoleChange = (code: string) => {
    setManualRoleCode(code);
    form.setValue("role_code", code);
  };

  const isMutating = createAssignment.isPending || directEnroll.isPending;

  const executeAssignment = async (input: {
    org_id: string;
    role_code: string;
    user_email: string;
    user_name?: string;
    domain_tags?: Json;
    model_applicability: string;
  }) => {
    if (enrollMode === "direct") {
      const result = await directEnroll.mutateAsync(input);
      try {
        await supabase.functions.invoke("send-role-enrollment-confirmation", {
          body: { assignment_id: result.id, org_name: orgName },
        });
      } catch {
        // Email failure is non-blocking
      }
    } else {
      const result = await createAssignment.mutateAsync(input);
      try {
        await supabase.functions.invoke("send-role-invitation", {
          body: { assignment_id: result.id, org_name: orgName },
        });
      } catch {
        // Email failure is non-blocking
      }
    }
  };

  const onSubmitInvite = async (data: RoleInviteFormValues) => {
    await executeAssignment({
      org_id: data.org_id,
      role_code: data.role_code,
      user_email: data.user_email,
      user_name: data.user_name,
      domain_tags: (data.domain_tags as Json) ?? undefined,
      model_applicability: data.model_applicability,
    });
    form.reset();
    setManualRoleCode("");
    onOpenChange(false);
  };

  const onSubmitExisting = async () => {
    if (!existingMemberRoleCode || !selectedMemberEmail) return;
    const member = existingMembers.find((m) => m.email === selectedMemberEmail);
    if (!member) return;
    await executeAssignment({
      org_id: orgId,
      role_code: existingMemberRoleCode,
      user_email: member.email,
      user_name: member.name ?? undefined,
      model_applicability: fullRoleCatalog.find((r) => r.code === existingMemberRoleCode)?.model_applicability ?? "both",
    });
    setSelectedMemberEmail("");
    setExistingMemberRoleCode("");
    onOpenChange(false);
  };

  // ══════════════════════════════════════
  // SECTION 7: Render
  // ══════════════════════════════════════
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col overflow-hidden">
        <SheetHeader className="shrink-0 space-y-1">
          <SheetTitle>Assign {roleTitle}</SheetTitle>
          <SheetDescription>Invite a user or assign a new role to an existing team member</SheetDescription>
        </SheetHeader>

        {/* Enroll Mode Toggle — Direct / Invite */}
        <div className="shrink-0 mt-3">
          <EnrollModeToggle mode={enrollMode} onModeChange={setEnrollMode} />
        </div>

        {/* Role Badge (when pre-selected — invite tab only) */}
        {selectedRole && !showRoleSelector && activeTab === "invite" && (
          <div className="shrink-0 mt-2">
            <Badge variant="outline" className="text-xs font-mono bg-muted/50 px-2.5 py-1">
              {selectedRole.code} | {selectedRole.display_name}
            </Badge>
          </div>
        )}

        {/* Role Selector Dropdown (when no role pre-selected — invite tab only) */}
        {showRoleSelector && activeTab === "invite" && (
          <div className="shrink-0 mt-3">
            <label className="text-sm font-medium text-foreground">Select Role *</label>
            <Select value={manualRoleCode} onValueChange={handleRoleChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a role to assign" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.code} value={role.code}>
                    {role.display_name} ({role.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRole && (
              <p className="text-xs text-muted-foreground mt-1">{selectedRole.description}</p>
            )}
          </div>
        )}

        {/* Tab Toggle — only show if there are existing members */}
        {hasExistingMembers && (
          <div className="shrink-0 mt-4 grid grid-cols-2 gap-1 bg-muted rounded-lg p-1">
            <button
              type="button"
              className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === "invite"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("invite")}
            >
              <UserPlus className="h-3.5 w-3.5" />
              New User (Invite)
            </button>
            <button
              type="button"
              className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === "existing"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("existing")}
            >
              <Users className="h-3.5 w-3.5" />
              Existing Team Member
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto mt-4">
          {activeTab === "invite" ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitInvite)} className="space-y-4" id="assign-role-form">
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

                {/* Collapsible Domain Taxonomy */}
                <Collapsible open={taxonomyOpen} onOpenChange={setTaxonomyOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors py-2"
                    >
                      {taxonomyOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      Domain Taxonomy
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-3 pt-1 pb-2 pl-6">
                      {/* Industry Segment */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Industry Segment</label>
                        <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="All Industries" />
                          </SelectTrigger>
                          <SelectContent>
                            {(industries ?? []).map((ind: { id: string; name: string }) => (
                              <SelectItem key={ind.id} value={ind.id}>
                                {ind.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Sub-Domain */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Sub-Domain</label>
                        <Select value={selectedSubDomain} onValueChange={setSelectedSubDomain} disabled={!selectedIndustry}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="All Sub-Domains" />
                          </SelectTrigger>
                          <SelectContent>
                            {(subDomains ?? []).map((sd: { id: string; name: string }) => (
                              <SelectItem key={sd.id} value={sd.id}>
                                {sd.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Specialty */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Specialty</label>
                        <Select disabled={!selectedSubDomain}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="All Specialties" />
                          </SelectTrigger>
                          <SelectContent>
                            {(specialties ?? []).map((sp: { id: string; name: string }) => (
                              <SelectItem key={sp.id} value={sp.id}>
                                {sp.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Proficiency Level */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Proficiency Level</label>
                        <Select>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="All Levels" />
                          </SelectTrigger>
                          <SelectContent>
                            {(proficiencyLevels ?? []).map((pl) => (
                              <SelectItem key={pl.id} value={pl.id}>
                                {pl.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Info note */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    {enrollMode === "invite"
                      ? "An invitation email will be sent. The user must accept to activate this role."
                      : "The role will be activated immediately and a confirmation email sent."}
                  </span>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select a team member and choose a new role to assign. Each role requires separate acceptance.
              </p>

              {/* Member list */}
              <div className="space-y-2">
                {existingMembers.map((member) => {
                  const isSelected = selectedMemberEmail === member.email;
                  const memberCodes = member.roles.map((r) => r.code);
                  const memberAssignableRoles = fullRoleCatalog.filter(
                    (r) => !memberCodes.includes(r.code)
                  );
                  const allRolesAssigned = memberAssignableRoles.length === 0;

                  return (
                    <button
                      key={member.email}
                      type="button"
                      disabled={allRolesAssigned}
                      onClick={() => setSelectedMemberEmail(isSelected ? "" : member.email)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        allRolesAssigned
                          ? "opacity-50 cursor-not-allowed border-muted bg-muted/30"
                          : isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                        <div className="flex items-start gap-3">
                        <InitialsAvatar name={member.name ?? member.email} size="sm" className="mt-0.5 h-9 w-9 text-xs" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {member.name ?? member.email}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          {/* Current roles with display names and statuses */}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {member.roles.map((role) => {
                              const roleMeta = fullRoleCatalog.find((r) => r.code === role.code);
                              const displayLabel = roleMeta
                                ? `${roleMeta.display_name} (${role.code})`
                                : role.code;
                              const isInvited = role.status === "invited";
                              return (
                                <Badge
                                  key={role.code}
                                  variant={isInvited ? "outline" : "secondary"}
                                  className={`text-[10px] px-1.5 py-0 ${
                                    isInvited ? "border-dashed text-muted-foreground" : ""
                                  }`}
                                >
                                  {displayLabel}
                                  {isInvited && (
                                    <span className="ml-1 text-[9px] opacity-70">(Pending)</span>
                                  )}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      {allRolesAssigned && (
                        <p className="text-[10px] text-muted-foreground mt-1.5 ml-12 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          All available roles assigned
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Role selector for selected member — grouped by core/challenge */}
              {selectedMember && assignableRolesForMember.length > 0 && (
                <div className="border-t border-border pt-4 space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      Assign new role to {selectedMember.name ?? selectedMember.email} *
                    </label>
                    <Select value={existingMemberRoleCode} onValueChange={setExistingMemberRoleCode}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {coreAssignableRoles.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Core Roles</SelectLabel>
                            {coreAssignableRoles.map((role) => (
                              <SelectItem key={role.code} value={role.code}>
                                {role.display_name} ({role.code})
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {challengeAssignableRoles.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Challenge Roles</SelectLabel>
                            {challengeAssignableRoles.map((role) => (
                              <SelectItem key={role.code} value={role.code}>
                                {role.display_name} ({role.code})
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>
                    {existingMemberRoleCode && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {fullRoleCatalog.find((r) => r.code === existingMemberRoleCode)?.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      {enrollMode === "invite"
                        ? "An invitation will be sent. The user must accept to activate this role."
                        : "The role will be activated immediately and a confirmation email sent."}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <SheetFooter className="shrink-0 pt-4 flex gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {activeTab === "invite" && (
            <Button
              type="submit"
              form="assign-role-form"
              disabled={isMutating || !effectiveRoleCode}
            >
              {isMutating
                ? "Processing..."
                : enrollMode === "direct"
                ? "Enroll Now"
                : "Save & Invite"}
            </Button>
          )}
          {activeTab === "existing" && hasExistingMembers && (
            <Button
              type="button"
              onClick={onSubmitExisting}
              disabled={isMutating || !existingMemberRoleCode || !selectedMemberEmail}
            >
              {isMutating
                ? "Processing..."
                : enrollMode === "direct"
                ? "Enroll Now"
                : "Assign & Invite"}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
