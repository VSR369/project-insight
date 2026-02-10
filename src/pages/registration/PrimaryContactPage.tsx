/**
 * Primary Contact Page (Step 2)
 * 
 * Route: /registration/primary-contact
 * Shell-first rendering: layout always renders first.
 * Implements REG-002 with contact form, email domain validation, OTP.
 */

import { RegistrationWizardLayout } from '@/components/layouts/RegistrationWizardLayout';
import { PrimaryContactForm } from '@/components/registration/PrimaryContactForm';

export default function PrimaryContactPage() {
  return (
    <RegistrationWizardLayout currentStep={2} completedSteps={[1]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Primary Contact</h1>
          <p className="text-muted-foreground mt-1">
            Provide the primary point of contact for your organization.
          </p>
        </div>
        <PrimaryContactForm />
      </div>
    </RegistrationWizardLayout>
  );
}
