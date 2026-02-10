/**
 * Organization Identity Page (Step 1)
 * 
 * Route: /registration/organization-identity
 * Shell-first rendering: layout always renders first.
 * Implements REG-001 with full form, business rules, and validation.
 */

import { RegistrationWizardLayout } from '@/components/layouts/RegistrationWizardLayout';
import { OrganizationIdentityForm } from '@/components/registration/OrganizationIdentityForm';

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
        <OrganizationIdentityForm />
      </div>
    </RegistrationWizardLayout>
  );
}
