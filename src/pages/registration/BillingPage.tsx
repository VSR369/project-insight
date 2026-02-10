/**
 * Billing Page (Step 5)
 * 
 * Route: /registration/billing
 * Implements REG-005 with payment, billing address, terms acceptance.
 */

import { RegistrationWizardLayout } from '@/components/layouts/RegistrationWizardLayout';
import { BillingForm } from '@/components/registration/BillingForm';

export default function BillingPage() {
  return (
    <RegistrationWizardLayout currentStep={5} completedSteps={[1, 2, 3, 4]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing Setup</h1>
          <p className="text-muted-foreground mt-1">
            Complete your billing details and review your order summary.
          </p>
        </div>
        <BillingForm />
      </div>
    </RegistrationWizardLayout>
  );
}
