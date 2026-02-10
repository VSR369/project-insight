
-- =====================================================
-- REG-001/REG-002 Gap-Fill: Missing columns + indexes + storage
-- 6 new columns, 7 new indexes, 1 storage bucket
-- =====================================================

-- B1: Missing columns on seeker_organizations
ALTER TABLE public.seeker_organizations
  ADD COLUMN IF NOT EXISTS address_format_template JSONB,
  ADD COLUMN IF NOT EXISTS subsidized_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verification_expiry_date DATE;

-- B1: Missing columns on seeker_contacts
ALTER TABLE public.seeker_contacts
  ADD COLUMN IF NOT EXISTS department VARCHAR(100),
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(100);

-- B1: Missing column on email_otp_verifications
ALTER TABLE public.email_otp_verifications
  ADD COLUMN IF NOT EXISTS total_failed_attempts INTEGER NOT NULL DEFAULT 0;

-- B2: Performance indexes
CREATE INDEX IF NOT EXISTS idx_seeker_orgs_legal_name_country
  ON public.seeker_organizations(LOWER(legal_entity_name), hq_country_id);

CREATE INDEX IF NOT EXISTS idx_seeker_orgs_deleted
  ON public.seeker_organizations(is_deleted);

CREATE INDEX IF NOT EXISTS idx_seeker_orgs_reg_step
  ON public.seeker_organizations(registration_step);

CREATE INDEX IF NOT EXISTS idx_contacts_org_type
  ON public.seeker_contacts(organization_id, contact_type);

CREATE INDEX IF NOT EXISTS idx_otp_email_org
  ON public.email_otp_verifications(email, organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_otp_locked
  ON public.email_otp_verifications(email, locked_until)
  WHERE locked_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_blocked_domains_lower
  ON public.md_blocked_email_domains(LOWER(domain));

-- B4: Storage bucket for org documents (logo, profile docs, verification docs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-documents', 'org-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload to their org folder
CREATE POLICY "Authenticated users can upload org documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'org-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view org documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'org-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update own org documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'org-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete own org documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'org-documents' AND auth.role() = 'authenticated');
