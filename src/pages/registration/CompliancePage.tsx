/**
 * Compliance Page (Step 3)
 * 
 * Route: /registration/compliance
 * Implements REG-003 with export control, ITAR, data residency.
 */

import { RegistrationWizardLayout } from '@/components/layouts/RegistrationWizardLayout';
import { ComplianceForm } from '@/components/registration/ComplianceForm';

export default function CompliancePage() {
  return (
    <RegistrationWizardLayout currentStep={3} completedSteps={[1, 2]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compliance & Export Control</h1>
          <p className="text-muted-foreground mt-1">
            Provide your organization's compliance and regulatory details.
          </p>
        </div>
        <ComplianceForm />
      </div>
    </RegistrationWizardLayout>
  );
}
