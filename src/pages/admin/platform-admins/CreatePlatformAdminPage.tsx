/**
 * SCR-01-02: Create Platform Admin Page
 * Enhanced: navigates to new admin's profile on success, custom welcome toast.
 */

import { useNavigate } from 'react-router-dom';
import { useCreatePlatformAdmin } from '@/hooks/mutations/usePlatformAdminMutations';
import { useAdminTier } from '@/hooks/useAdminTier';
import { usePlatformTierDepth } from '@/hooks/queries/useTierDepthConfig';
import { PlatformAdminForm } from '@/components/admin/platform-admins/PlatformAdminForm';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import type { PlatformAdminFormValues } from '@/components/admin/platform-admins/platformAdminForm.schema';

function CreateContent() {
  const navigate = useNavigate();
  const createMutation = useCreatePlatformAdmin();
  const { isSupervisor, isSeniorAdmin } = useAdminTier();
  const { depth, isLoading: depthLoading } = usePlatformTierDepth();

  if (depthLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (depth === 1) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Admin creation is disabled in single-operator mode. Only the Supervisor role exists at the current tier depth.
      </div>
    );
  }

  if (!isSupervisor && !isSeniorAdmin) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        You don't have permission to create platform admins.
      </div>
    );
  }

  const handleSubmit = async (data: PlatformAdminFormValues) => {
    const result = await createMutation.mutateAsync({
      email: data.email,
      full_name: data.full_name,
      phone: data.phone,
      is_supervisor: data.admin_tier === 'supervisor',
      admin_tier: data.admin_tier,
      industry_expertise: data.industry_expertise,
      country_region_expertise: data.country_region_expertise,
      org_type_expertise: data.org_type_expertise,
      max_concurrent_verifications: data.max_concurrent_verifications,
      assignment_priority: data.assignment_priority,
    });
    toast.success(`${data.full_name} has been added as a platform admin. Welcome email sent to ${data.email}.`);
    // Navigate to the new admin's View Profile page
    const newAdminId = result?.id;
    if (newAdminId) {
      navigate(`/admin/platform-admins/${newAdminId}`);
    } else {
      navigate('/admin/platform-admins');
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Platform Admin</h1>
        <p className="text-muted-foreground">Add a new platform administrator.</p>
      </div>
      <PlatformAdminForm
        mode="create"
        callerTier={isSupervisor ? 'supervisor' : 'senior_admin'}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
        onCancel={() => navigate('/admin/platform-admins')}
      />
    </div>
  );
}

export default function CreatePlatformAdminPage() {
  return (
    <FeatureErrorBoundary featureName="Create Platform Admin">
      <CreateContent />
    </FeatureErrorBoundary>
  );
}
