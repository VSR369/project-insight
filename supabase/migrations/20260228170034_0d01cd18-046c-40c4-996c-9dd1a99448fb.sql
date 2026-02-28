-- Allow pre-auth NDA upload during registration (path-scoped to {tenant_id}/nda/)
CREATE POLICY "Pre-auth NDA upload during registration"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-documents'
    AND (storage.foldername(name))[2] = 'nda'
  );