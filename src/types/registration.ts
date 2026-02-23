/**
 * Registration Flow TypeScript Interfaces
 * 
 * All types for the 5-step Seeker Registration Wizard.
 * Per Project Knowledge: types in dedicated files, max ~200 lines.
 */

// ============================================================
// Step 1: Organization Identity
// ============================================================
export interface OrganizationIdentityData {
  legal_entity_name: string;
  trade_brand_name?: string;
  organization_type_id: string;
  industry_ids: string[];
  company_size_range: CompanySizeRange;
  annual_revenue_range: AnnualRevenueRange;
  year_founded: number;
  hq_country_id: string;
  state_province_id: string;
  city: string;
  operating_geography_ids: string[];
  logo_file?: File;
  profile_document?: File;
  verification_documents?: File[];
}

export type CompanySizeRange = '1-10' | '11-50' | '51-200' | '201-1000' | '1001-5000' | '5001+';
export type AnnualRevenueRange = '<1M' | '1M-10M' | '10M-50M' | '50M-250M' | '250M-1B' | '>1B';

// ============================================================
// Step 2: Primary Contact
// ============================================================
export interface PrimaryContactData {
  full_name: string;
  first_name?: string;
  last_name?: string;
  designation: string;
  email: string;
  phone: string;
  phone_country_code: string;
  department?: string;
  timezone: string;
  preferred_language_id: string;
  email_verified: boolean;
}

// ============================================================
// Step 3: Compliance
// ============================================================
export interface ComplianceData {
  tax_id: string;
  tax_id_label: string;
  export_control_status_id?: string;
  is_itar_restricted: boolean;
  data_residency_id?: string;
}

// ============================================================
// Step 4: Plan Selection
// ============================================================
export interface PlanSelectionData {
  tier_id: string;
  billing_cycle_id: string;
  engagement_model_id?: string; // Basic tier only
  membership_tier_id?: string;  // Annual / Multi-Year membership selection
  estimated_challenges_per_month: number;
}

// ============================================================
// Step 5: Billing
// ============================================================
export interface BillingData {
  payment_method: string;
  stripe_payment_intent_id?: string;
  is_internal_department: boolean;
  billing_entity_name?: string;
  billing_email?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_city?: string;
  billing_state_province_id?: string;
  billing_country_id?: string;
  billing_postal_code?: string;
  po_number?: string;
  tax_id?: string;
}

// ============================================================
// Combined Registration State
// ============================================================
export interface RegistrationState {
  currentStep: number;
  organizationId?: string;
  tenantId?: string;
  step1?: OrganizationIdentityData;
  step2?: PrimaryContactData;
  step3?: ComplianceData;
  step4?: PlanSelectionData;
  step5?: BillingData;
  // Derived from country selection
  localeInfo?: LocaleInfo;
  // Derived from org type
  orgTypeFlags?: OrgTypeFlags;
}

export interface LocaleInfo {
  currency_code: string;
  currency_symbol: string;
  phone_code: string;
  date_format: string;
  number_format: string;
  address_format_template: Record<string, unknown> | null;
}

export interface OrgTypeFlags {
  subsidized_eligible: boolean;
  compliance_required: boolean;
  zero_fee_eligible: boolean;
  startup_eligible: boolean;
  verification_required: boolean;
  tier_recommendation?: string;
  subsidized_discount_pct?: number;
}

// ============================================================
// Registration Steps Metadata
// ============================================================
export interface RegistrationStep {
  number: number;
  label: string;
  path: string;
  isCompleted: boolean;
  isActive: boolean;
}

export const REGISTRATION_STEPS: Omit<RegistrationStep, 'isCompleted' | 'isActive'>[] = [
  { number: 1, label: 'Organization', path: '/registration/organization-identity' },
  { number: 2, label: 'Contact', path: '/registration/primary-contact' },
  { number: 3, label: 'Compliance', path: '/registration/compliance' },
  { number: 4, label: 'Plan Selection', path: '/registration/plan-selection' },
  { number: 5, label: 'Billing', path: '/registration/billing' },
];
