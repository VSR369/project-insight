/**
 * AssignRoleSheet — SCR-09: Side-sheet for role assignment
 * Dynamic title "Assign {role.display_name}", role badge, toggle tabs,
 * collapsible 4-level domain taxonomy.
 * Includes role selector dropdown when no role is pre-selected.
 */

import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Info, Users, UserPlus } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import { roleInviteSchema, type RoleInviteFormValues } from "@/lib/validations/roleAssignment";
import { useCreateRoleAssignment, useRoleAssignments } from "@/hooks/queries/useRoleAssignments";
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
  const [taxonomyOpen, setTaxonomyOpen] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [selectedSubDomain, setSelectedSubDomain] = useState<string>("");
  const [manualRoleCode, setManualRoleCode] = useState<string>("");
  const [selectedMemberEmail, setSelectedMemberEmail] = useState<string>("");
  // ══════════════════════════════════════
  // SECTION 2: Query/Mutation hooks
  // ══════════════════════════════════════
  const createAssignment = useCreateRoleAssignment();
  const { data: existingAssignments } = useRoleAssignments(orgId);
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
    }
  }, [preSelectedRoleCode, open, form]);

  // Reset cascading selectors
  useEffect(() => {
    setSelectedSubDomain("");
  }, [selectedIndustry]);

  // ══════════════════════════════════════
  // SECTION 5: Derived state
  // ══════════════════════════════════════
  const effectiveRoleCode = preSelectedRoleCode || manualRoleCode;
  const selectedRole = availableRoles.find((r) => r.code === effectiveRoleCode);
  const roleTitle = selectedRole?.display_name ?? "Role";
  const showRoleSelector = !preSelectedRoleCode && availableRoles.length > 0;

  // Build deduplicated existing team members from active/invited assignments
  const existingMembers = (() => {
    if (!existingAssignments) return [];
    const memberMap = new Map<string, { email: string; name: string | null; roles: string[] }>();
    for (const a of existingAssignments) {
      if (a.status !== "active" && a.status !== "invited") continue;
      const existing = memberMap.get(a.user_email);
      if (existing) {
        existing.roles.push(a.role_code);
      } else {
        memberMap.set(a.user_email, { email: a.user_email, name: a.user_name, roles: [a.role_code] });
      }
    }
    return Array.from(memberMap.values());
  })();
  const [selectedMemberEmail, setSelectedMemberEmail] = useState<string>("");

  // ══════════════════════════════════════
  // SECTION 6: Event handlers
  // ══════════════════════════════════════
  const handleRoleChange = (code: string) => {
    setManualRoleCode(code);
    form.setValue("role_code", code);
  };

  const onSubmitInvite = async (data: RoleInviteFormValues) => {
    await createAssignment.mutateAsync({
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
    if (!effectiveRoleCode || !selectedMemberEmail) return;
    const member = existingMembers.find((m) => m.email === selectedMemberEmail);
    if (!member) return;
    await createAssignment.mutateAsync({
      org_id: orgId,
      role_code: effectiveRoleCode,
      user_email: member.email,
      user_name: member.name ?? undefined,
      model_applicability: "both",
    });
    setSelectedMemberEmail("");
    setManualRoleCode("");
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
          <SheetDescription>Invite a user to fill an organizational role</SheetDescription>
        </SheetHeader>

        {/* Role Badge (when pre-selected) */}
        {selectedRole && !showRoleSelector && (
          <div className="shrink-0 mt-2">
            <Badge variant="outline" className="text-xs font-mono bg-muted/50 px-2.5 py-1">
              {selectedRole.code} | {selectedRole.display_name}
            </Badge>
          </div>
        )}

        {/* Role Selector Dropdown (when no role pre-selected) */}
        {showRoleSelector && (
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

        {/* Tab Toggle */}
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
                    Domain tags are optional — role will apply to all domains if left empty.
                  </span>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              {existingMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No team members onboarded yet. Use "New User (Invite)" to add the first member.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Select an existing team member to assign the <span className="font-medium text-foreground">{roleTitle}</span> role.
                  </p>
                  <div className="space-y-2">
                    {existingMembers.map((member) => {
                      const isSelected = selectedMemberEmail === member.email;
                      const alreadyHasRole = effectiveRoleCode ? member.roles.includes(effectiveRoleCode) : false;
                      return (
                        <button
                          key={member.email}
                          type="button"
                          disabled={alreadyHasRole}
                          onClick={() => setSelectedMemberEmail(isSelected ? "" : member.email)}
                          className={`w-full text-left rounded-lg border p-3 transition-colors ${
                            alreadyHasRole
                              ? "opacity-50 cursor-not-allowed border-muted bg-muted/30"
                              : isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border hover:border-primary/40 hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                              {member.name
                                ? member.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
                                : "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {member.name ?? member.email}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                            </div>
                            <div className="flex flex-wrap gap-1 shrink-0">
                              {member.roles.map((rc) => (
                                <Badge key={rc} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {rc}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          {alreadyHasRole && (
                            <p className="text-[10px] text-muted-foreground mt-1 ml-11">
                              Already assigned to this role
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
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
              disabled={createAssignment.isPending || !effectiveRoleCode}
            >
              {createAssignment.isPending ? "Saving..." : "Save & Invite"}
            </Button>
          )}
          {activeTab === "existing" && existingMembers.length > 0 && (
            <Button
              type="button"
              onClick={onSubmitExisting}
              disabled={createAssignment.isPending || !effectiveRoleCode || !selectedMemberEmail}
            >
              {createAssignment.isPending ? "Assigning..." : "Assign Role"}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
