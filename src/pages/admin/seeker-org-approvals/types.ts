/**
 * TypeScript interfaces for Seeker Organization Approvals module.
 * Matches database schema from seeker_organizations, seeker_contacts,
 * seeker_compliance, seeker_subscriptions, seeker_billing_info,
 * seeker_org_documents, and org_users tables.
 */

export interface SeekerOrg {
  id: string;
  organization_name: string;
  trade_brand_name: string | null;
  legal_entity_name: string | null;
  organization_type_id: string | null;
  registration_number: string | null;
  tax_id: string | null;
  website_url: string | null;
  founding_year: number | null;
  employee_count_range: string | null;
  annual_revenue_range: string | null;
  is_enterprise: boolean;
  organization_description: string | null;
  logo_url: string | null;
  hq_address_line1: string | null;
  hq_address_line2: string | null;
  hq_city: string | null;
  hq_postal_code: string | null;
  hq_country_id: string | null;
  hq_state_province_id: string | null;
  nda_preference: string | null;
  nda_review_status: string | null;
  verification_status: string;
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  registration_step: number;
  created_at: string;
  updated_at: string | null;
  // Joined relations
  countries?: { name: string; code: string } | null;
  organization_types?: { name: string } | null;
}

export interface SeekerOrgListItem {
  id: string;
  organization_name: string;
  verification_status: string;
  created_at: string;
  registration_step: number;
  hq_country_id: string | null;
  organization_type_id: string | null;
  is_enterprise: boolean;
  countries?: { name: string } | null;
  organization_types?: { name: string } | null;
}

export interface SeekerContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  email_verified: boolean;
  phone_country_code: string | null;
  phone_number: string | null;
  job_title: string | null;
  department: string | null;
  contact_type: string;
  is_primary: boolean;
  is_decision_maker: boolean;
  timezone: string | null;
}

export interface SeekerCompliance {
  id: string;
  organization_id: string;
  itar_certified: boolean;
  itar_certification_expiry: string | null;
  gdpr_compliant: boolean;
  hipaa_compliant: boolean;
  soc2_compliant: boolean;
  iso27001_certified: boolean;
  compliance_notes: string | null;
  export_control_status_id: string | null;
  data_residency_id: string | null;
  additional_certifications: unknown;
  // Joined relations
  md_export_control_statuses?: { name: string } | null;
  md_data_residency?: { name: string } | null;
}

export interface SeekerSubscription {
  id: string;
  status: string | null;
  payment_type: string | null;
  monthly_base_price: number | null;
  discount_percentage: number | null;
  effective_monthly_cost: number | null;
  auto_renew: boolean | null;
  md_subscription_tiers?: { name: string; code: string } | null;
  md_billing_cycles?: { name: string; months: number } | null;
  md_engagement_models?: { name: string } | null;
}

export interface SeekerBilling {
  id: string;
  billing_entity_name: string | null;
  payment_method: string | null;
  billing_email: string | null;
  po_number: string | null;
  tax_id: string | null;
  tax_id_verified: boolean | null;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_postal_code: string | null;
  countries?: { name: string } | null;
}

export interface SeekerDocument {
  id: string;
  file_name: string;
  document_type: string;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string;
  verification_status: string;
  rejection_reason: string | null;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
}

export interface OrgUser {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  is_active: boolean;
}

export interface SeekerOrgIndustry {
  id: string;
  industry_id: string;
  industry_segments?: { name: string } | null;
}

export interface SeekerOrgGeography {
  id: string;
  country_id: string;
  countries?: { name: string } | null;
}

export interface SeekerOrgDetailData {
  org: SeekerOrg;
  contacts: SeekerContact[];
  compliance: SeekerCompliance | null;
  subscription: SeekerSubscription | null;
  billing: SeekerBilling | null;
  documents: SeekerDocument[];
  industries: SeekerOrgIndustry[];
  geographies: SeekerOrgGeography[];
  orgUsers: OrgUser[];
}
