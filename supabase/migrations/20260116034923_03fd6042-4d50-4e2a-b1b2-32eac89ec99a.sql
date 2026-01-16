-- Add storage bucket for proof point files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('proof-point-files', 'proof-point-files', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for proof-point-files bucket
CREATE POLICY "Providers can upload own files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'proof-point-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Providers can view own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'proof-point-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Providers can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'proof-point-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);