
-- Create storage bucket for challenge editor images
INSERT INTO storage.buckets (id, name, public)
VALUES ('challenge-assets', 'challenge-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload to their own tenant folder
CREATE POLICY "auth_users_upload_challenge_assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'challenge-assets');

-- RLS: anyone can view challenge assets (public bucket)
CREATE POLICY "public_read_challenge_assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'challenge-assets');

-- RLS: owners can delete their uploads
CREATE POLICY "auth_users_delete_own_challenge_assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'challenge-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
