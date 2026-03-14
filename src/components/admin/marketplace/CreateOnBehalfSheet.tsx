/**
 * SCR-BR-CORE-003: Platform Admin "Create On Behalf" Sheet
 * Allows Platform Admins to assign core roles (R2, R8, R9) on behalf of an org
 */

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, Info } from "lucide-react";
import { toast } from "sonner";
import { useCoreRoleCodes } from "@/hooks/queries/useSlmRoleCodes";
import { useCreateRoleAssignment } from "@/hooks/queries/useRoleAssignments";
import { supabase } from "@/integrations/supabase/client";

interface CreateOnBehalfSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** List of orgs admin can create for */
  organizations: { id: string; name: string }[];
}

export function CreateOnBehalfSheet({
  open,
  onOpenChange,
  organizations,
}: CreateOnBehalfSheetProps) {
  const { data: coreRoles = [] } = useCoreRoleCodes();
  const createAssignment = useCreateRoleAssignment();

  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedRoleCode, setSelectedRoleCode] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  const handleSubmit = async () => {
    if (!selectedOrgId || !selectedRoleCode || !userEmail) return;

    await createAssignment.mutateAsync({
      org_id: selectedOrgId,
      role_code: selectedRoleCode,
      user_email: userEmail,
      user_name: userName || undefined,
      status: "invited",
      model_applicability: "core",
    });

    toast.success(`Core role assigned on behalf of organization`);
    setSelectedOrgId("");
    setSelectedRoleCode("");
    setUserEmail("");
    setUserName("");
    onOpenChange(false);
  };

  const isValid = selectedOrgId && selectedRoleCode && userEmail.includes("@");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Create Role On Behalf
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Assign a core role to a user on behalf of an organization.
          </p>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-6 space-y-5">
          {/* Organization selector */}
          <div className="space-y-1.5">
            <Label>Organization <span className="text-destructive">*</span></Label>
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger>
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Role selector (core only: R2, R8, R9) */}
          <div className="space-y-1.5">
            <Label>Core Role <span className="text-destructive">*</span></Label>
            <Select value={selectedRoleCode} onValueChange={setSelectedRoleCode}>
              <SelectTrigger>
                <SelectValue placeholder="Select core role" />
              </SelectTrigger>
              <SelectContent>
                {coreRoles.map((role) => (
                  <SelectItem key={role.code} value={role.code}>
                    <div className="flex items-center gap-2">
                      {role.display_name}
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {role.code}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* User details */}
          <div className="space-y-1.5">
            <Label>User Email <span className="text-destructive">*</span></Label>
            <Input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="user@company.com"
              className="text-base"
            />
          </div>

          <div className="space-y-1.5">
            <Label>User Name</Label>
            <Input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Jane Smith"
            />
          </div>

          {/* Audit notice */}
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              This action will be recorded in the audit log as "Created by Platform Admin on behalf of the selected organization."
            </p>
          </div>
        </div>

        <SheetFooter className="shrink-0 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || createAssignment.isPending}
          >
            {createAssignment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Assign Role
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
