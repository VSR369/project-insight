/**
 * SCR-01-02: Create Platform Admin Page
 */

import { useNavigate } from 'react-router-dom';
import { useCreatePlatformAdmin } from '@/hooks/mutations/usePlatformAdminMutations';
import { PlatformAdminForm } from '@/components/admin/platform-admins/PlatformAdminForm';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import type { PlatformAdminFormValues } from '@/components/admin/platform-admins/platformAdminForm.schema';

function CreateContent() {
  const navigate = useNavigate();
  const createMutation = useCreatePlatformAdmin();

  const handleSubmit = async (data: PlatformAdminFormValues) => {
    await createMutation.mutateAsync(data);
    navigate('/admin/platform-admins');
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Platform Admin</h1>
        <p className="text-muted-foreground">Add a new platform administrator.</p>
      </div>
      <PlatformAdminForm
        mode="create"
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
