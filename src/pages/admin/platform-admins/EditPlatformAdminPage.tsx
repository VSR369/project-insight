/**
 * SCR-01-03: Edit Platform Admin Page
 */

import { useNavigate, useParams } from 'react-router-dom';
import { usePlatformAdminProfile } from '@/hooks/queries/usePlatformAdmins';
import { useUpdatePlatformAdmin } from '@/hooks/mutations/usePlatformAdminMutations';
import { PlatformAdminForm } from '@/components/admin/platform-admins/PlatformAdminForm';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { Skeleton } from '@/components/ui/skeleton';
import type { PlatformAdminFormValues } from '@/components/admin/platform-admins/platformAdminForm.schema';

function EditContent() {
  const { adminId } = useParams<{ adminId: string }>();
  const navigate = useNavigate();
  const { data: admin, isLoading } = usePlatformAdminProfile(adminId);
  const updateMutation = useUpdatePlatformAdmin();

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!admin) {
    return <div className="text-center py-12 text-muted-foreground">Admin not found.</div>;
  }

  const handleSubmit = async (data: PlatformAdminFormValues) => {
    const { email, ...updates } = data;
    await updateMutation.mutateAsync({ admin_id: admin.id, updates });
    navigate(`/admin/platform-admins/${admin.id}`);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Platform Admin</h1>
        <p className="text-muted-foreground">Update profile for {admin.full_name}</p>
      </div>
      <PlatformAdminForm
        mode="edit"
        defaultValues={{
          full_name: admin.full_name,
          email: admin.email,
          phone: admin.phone,
          is_supervisor: admin.is_supervisor,
          industry_expertise: admin.industry_expertise,
          country_region_expertise: admin.country_region_expertise ?? [],
          org_type_expertise: admin.org_type_expertise ?? [],
          max_concurrent_verifications: admin.max_concurrent_verifications,
          assignment_priority: admin.assignment_priority,
        }}
        onSubmit={handleSubmit}
        isSubmitting={updateMutation.isPending}
        onCancel={() => navigate(`/admin/platform-admins/${admin.id}`)}
      />
    </div>
  );
}

export default function EditPlatformAdminPage() {
  return (
    <FeatureErrorBoundary featureName="Edit Platform Admin">
      <EditContent />
    </FeatureErrorBoundary>
  );
}
