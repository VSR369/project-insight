/**
 * ResourcePoolPage — SCR-01b Resource Pool List with filters
 * BRD Ref: BR-POOL-001–003, BR-PP-002, BR-PP-003
 */

import { useState, useCallback } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PoolFilterBar } from "@/components/admin/marketplace/PoolFilterBar";
import { PoolMemberTable } from "@/components/admin/marketplace/PoolMemberTable";
import { PoolMemberForm } from "@/components/admin/marketplace/PoolMemberForm";
import { SupervisorDeactivationConfirmModal } from "@/components/admin/marketplace/SupervisorDeactivationConfirmModal";
import { usePoolMembers, type PoolMemberFilters, type PoolMemberRow } from "@/hooks/queries/usePoolMembers";
import { useDeactivatePoolMember } from "@/hooks/queries/usePoolMembers";
import { usePoolPermissions } from "@/hooks/usePoolPermissions";
import { useAdminTier } from "@/hooks/useAdminTier";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ResourcePoolPage() {
  // ══════════ useState ══════════
  const [filters, setFilters] = useState<PoolMemberFilters>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editMember, setEditMember] = useState<PoolMemberRow | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<PoolMemberRow | null>(null);
  const [supervisorConfirmTarget, setSupervisorConfirmTarget] = useState<PoolMemberRow | null>(null);

  // ══════════ Custom hooks ══════════
  const { canWrite, isLoading: permLoading } = usePoolPermissions();
  const { tier, isSupervisor } = useAdminTier();

  // ══════════ Query/Mutation hooks ══════════
  const { data: members, isLoading } = usePoolMembers(filters);
  const deactivateMutation = useDeactivatePoolMember();

  // ══════════ Handlers ══════════
  const handleEdit = (member: PoolMemberRow) => {
    setEditMember(member);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditMember(null);
    setFormOpen(true);
  };

  /**
   * BR-PP-002: Check if pool member was created by Supervisor tier.
   * If actor is Senior Admin and member was created by Supervisor, show confirmation modal.
   */
  const handleDeactivateRequest = useCallback((member: PoolMemberRow) => {
    // Check if member has created_by that maps to a supervisor
    // For Senior Admins deactivating supervisor-created members, require confirmation
    const memberAny = member as any;
    const createdByTier = memberAny?.created_by_tier;

    if (!isSupervisor && createdByTier === 'supervisor') {
      setSupervisorConfirmTarget(member);
    } else {
      setDeactivateTarget(member);
    }
  }, [isSupervisor]);

  const handleDeactivateConfirm = async () => {
    if (deactivateTarget) {
      await deactivateMutation.mutateAsync(deactivateTarget.id);
      setDeactivateTarget(null);
    }
  };

  const handleSupervisorDeactivateConfirm = async () => {
    if (supervisorConfirmTarget) {
      await deactivateMutation.mutateAsync(supervisorConfirmTarget.id);
      setSupervisorConfirmTarget(null);
    }
  };

  // ══════════ Render ══════════
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <nav className="text-xs text-muted-foreground mb-1">
            Platform Admin &gt; Marketplace &gt; Resource Pool
          </nav>
          <h1 className="text-2xl font-bold text-foreground">Resource Pool</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the global SLM resource pool for Marketplace challenges.
          </p>
        </div>
        {canWrite && (
          <Button onClick={handleAdd} className="self-start">
            <Plus className="h-4 w-4 mr-2" />
            Add Pool Member
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <PoolFilterBar filters={filters} onChange={setFilters} />

      {/* Data Table */}
      <PoolMemberTable
        members={members ?? []}
        isLoading={isLoading || permLoading}
        canWrite={canWrite}
        onEdit={handleEdit}
        onDeactivate={handleDeactivateRequest}
      />

      {/* Add/Edit Form Sheet */}
      <PoolMemberForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editMember={editMember}
      />

      {/* Standard Deactivation Confirmation Dialog */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={() => setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Pool Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{deactivateTarget?.full_name}</strong>? 
              This will remove them from the available resource pool.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deactivateMutation.isPending ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Supervisor-created member confirmation (BR-PP-002) */}
      <SupervisorDeactivationConfirmModal
        open={!!supervisorConfirmTarget}
        onOpenChange={() => setSupervisorConfirmTarget(null)}
        memberName={supervisorConfirmTarget?.full_name ?? ""}
        onConfirm={handleSupervisorDeactivateConfirm}
        isPending={deactivateMutation.isPending}
      />
    </div>
  );
}
