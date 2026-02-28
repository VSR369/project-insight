-- Expand storage RLS to allow anon uploads for all registration document types
-- Previously only 'nda' path was allowed; now logo, profile, verification are also permitted

DROP POLICY IF EXISTS "Pre-auth NDA upload during registration" ON storage.objects;

CREATE POLICY "Pre-auth document upload during registration"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-documents'
    AND (storage.foldername(name))[2] IN ('logo', 'profile', 'verification', 'nda')
  );

-- Also allow anon SELECT on org-documents so uploaded files can be referenced
DROP POLICY IF EXISTS "Pre-auth document read during registration" ON storage.objects;

CREATE POLICY "Pre-auth document read during registration"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'org-documents'
  );

-- Allow anon INSERT on seeker_org_documents for pre-auth registration
DROP POLICY IF EXISTS "Anon can insert org documents during registration" ON public.seeker_org_documents;

CREATE POLICY "Anon can insert org documents during registration"
  ON public.seeker_org_documents FOR INSERT
  WITH CHECK (true);

-- Allow anon SELECT on seeker_org_documents for pre-auth registration  
DROP POLICY IF EXISTS "Anon can read org documents during registration" ON public.seeker_org_documents;

CREATE POLICY "Anon can read org documents during registration"
  ON public.seeker_org_documents FOR SELECT
  USING (true);