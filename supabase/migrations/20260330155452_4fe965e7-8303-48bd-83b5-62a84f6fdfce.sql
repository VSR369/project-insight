
-- Create challenge-attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('challenge-attachments', 'challenge-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload challenge attachments
CREATE POLICY "Authenticated users can upload challenge attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'challenge-attachments');

-- RLS: authenticated users can read challenge attachments
CREATE POLICY "Authenticated users can read challenge attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'challenge-attachments');

-- RLS: authenticated users can delete challenge attachments
CREATE POLICY "Authenticated users can delete challenge attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'challenge-attachments');
