/**
 * Registration Preview Page (Step 6 — Post-Submit)
 *
 * Read-only summary of all 5 registration steps.
 * Displayed after successful account creation.
 * "Go to Login" button clears state and navigates to /login.
 */

import { useNavigate } from 'react-router-dom';
import {
  Building2, User, Shield, CreditCard, FileText, CheckCircle2, LogIn, Printer,
} from 'lucide-react';

import { useRegistrationContext } from '@/contexts/RegistrationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// ============================================================
// Helper: render a labeled value row
// ============================================================
function Field({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === undefined || value === null || value === '') return null;
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{display}</span>
    </div>
  );
}

export default function RegistrationPreviewPage() {
  const { state, reset } = useRegistrationContext();
  const navigate = useNavigate();

  const s1 = state.step1;
  const s2 = state.step2;
  const s3 = state.step3;
  const s4 = state.step4;
  const s5 = state.step5;

  const handleGoToLogin = () => {
    reset();
    navigate('/login');
  };

  // Guard: if state is empty (e.g. direct URL access after reset)
  if (!s1 && !s2 && !s3 && !s4 && !s5) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Shield className="h-10 w-10 mx-auto text-muted-foreground" />
            <h3 className="font-semibold text-foreground">No Registration Data</h3>
            <p className="text-sm text-muted-foreground">
              Your registration session has expired or was already completed.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              <LogIn className="h-4 w-4 mr-2" /> Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-primary">Registration</span>
          <Badge variant="default" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Complete
          </Badge>
        </div>
      </header>

      {/* Success Banner */}
      <div className="bg-primary/5 border-b">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mx-auto">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Registration Complete!</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your organization has been registered. Please review the summary below, then log in to get started.
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 min-h-0">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

          {/* Step 1: Organization Identity */}
          {s1 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Organization Identity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Field label="Legal Entity Name" value={s1.legal_entity_name} />
                  <Field label="Trade / Brand Name" value={s1.trade_brand_name} />
                  <Field label="Company Size" value={s1.company_size_range} />
                  <Field label="Annual Revenue" value={s1.annual_revenue_range} />
                  <Field label="Year Founded" value={s1.year_founded} />
                  <Field label="City" value={s1.city} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Primary Contact */}
          {s2 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Primary Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Field label="Full Name" value={s2.full_name} />
                  <Field label="Designation" value={s2.designation} />
                  <Field label="Email" value={s2.email} />
                  <Field label="Phone" value={`${s2.phone_country_code} ${s2.phone}`} />
                  <Field label="Department" value={s2.department} />
                  <Field label="Timezone" value={s2.timezone} />
                  <Field label="Email Verified" value={s2.email_verified} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Compliance */}
          {s3 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> Compliance & Export Control
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Field label="Tax ID" value={s3.tax_id} />
                  <Field label="Tax ID Label" value={s3.tax_id_label} />
                  <Field label="ITAR Restricted" value={s3.is_itar_restricted} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Plan Selection */}
          {s4 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Plan Selection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Field label="Estimated Challenges / Month" value={s4.estimated_challenges_per_month} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Billing */}
          {s5 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" /> Billing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Field label="Billing Entity" value={s5.billing_entity_name} />
                  <Field label="Billing Email" value={s5.billing_email} />
                  <Field label="Payment Method" value={s5.payment_method} />
                  <Field label="Address" value={[s5.billing_address_line1, s5.billing_address_line2, s5.billing_city].filter(Boolean).join(', ')} />
                  <Field label="Postal Code" value={s5.billing_postal_code} />
                  <Field label="PO Number" value={s5.po_number} />
                  <Field label="Tax ID" value={s5.tax_id} />
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleGoToLogin} size="lg" className="gap-2">
              <LogIn className="h-4 w-4" /> Go to Login
            </Button>
            <Button variant="outline" size="lg" className="gap-2" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print Summary
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">
            A confirmation email has been sent to your registered email address.
          </p>
        </div>
      </footer>
    </div>
  );
}
