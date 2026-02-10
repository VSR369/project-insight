/**
 * Plan Selection Page (Step 4)
 * 
 * Route: /registration/plan-selection
 * Implements REG-004 with tier comparison, pricing, billing cycle.
 */

import { RegistrationWizardLayout } from '@/components/layouts/RegistrationWizardLayout';
import { PlanSelectionForm } from '@/components/registration/PlanSelectionForm';

export default function PlanSelectionPage() {
  return (
    <RegistrationWizardLayout currentStep={4} completedSteps={[1, 2, 3]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Choose Your Plan</h1>
          <p className="text-muted-foreground mt-1">
            Select the subscription tier that best fits your organization's needs.
          </p>
        </div>
        <PlanSelectionForm />
      </div>
    </RegistrationWizardLayout>
  );
}
