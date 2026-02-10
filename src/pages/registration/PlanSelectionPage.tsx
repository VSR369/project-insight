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
      <PlanSelectionForm />
    </RegistrationWizardLayout>
  );
}
