/**
 * RegistrationWizardLayout
 * 
 * 5-step stepper layout for the Seeker Registration Wizard.
 * No sidebar. Step indicator at top. Content area below.
 * Shell-first rendering: layout always renders, content can be loading.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { StepIndicator } from '@/components/shared/StepIndicator';

interface RegistrationWizardLayoutProps {
  currentStep: number;
  completedSteps?: number[];
  children: React.ReactNode;
}

export function RegistrationWizardLayout({
  currentStep,
  completedSteps = [],
  children,
}: RegistrationWizardLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary">
            Registration
          </Link>
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="border-b bg-card shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 min-h-0">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Your data is encrypted and never shared with other organizations.
          </p>
          <p className="text-xs text-muted-foreground">
            Step {currentStep} of 5
          </p>
        </div>
      </footer>
    </div>
  );
}
