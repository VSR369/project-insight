
-- Create challenge-media storage bucket (public for read access)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('challenge-media', 'challenge-media', true, 26214400)
ON CONFLICT (id) DO NOTHING;

-- RLS: Authenticated users can upload files
CREATE POLICY "Authenticated users can upload challenge media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'challenge-media');

-- RLS: Public read access
CREATE POLICY "Public read access for challenge media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'challenge-media');

-- RLS: Owners can delete their own uploads
CREATE POLICY "Users can delete own challenge media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'challenge-media' AND (storage.foldername(name))[1] = auth.uid()::text);
