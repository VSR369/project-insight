/**
 * Organization Identity Page (Step 1)
 * 
 * Route: /registration/organization-identity
 * Shell-first rendering: layout always renders first.
 * Placeholder until Phase 2 builds the full form.
 */

import { RegistrationWizardLayout } from '@/components/layouts/RegistrationWizardLayout';
import { Skeleton } from '@/components/ui/skeleton';

export default function OrganizationIdentityPage() {
  return (
    <RegistrationWizardLayout currentStep={1}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organization Identity</h1>
          <p className="text-muted-foreground mt-1">
            Tell us about your organization to personalize your experience.
          </p>
        </div>
        {/* Phase 2 will replace this with OrganizationIdentityForm */}
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </RegistrationWizardLayout>
  );
}
