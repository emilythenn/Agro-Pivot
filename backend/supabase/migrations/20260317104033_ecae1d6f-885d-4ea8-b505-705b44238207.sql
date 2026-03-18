
-- Create scan-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('scan-images', 'scan-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own scan images
CREATE POLICY "Users can upload scan images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'scan-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own scan images
CREATE POLICY "Users can update own scan images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'scan-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access to scan images
CREATE POLICY "Public read scan images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'scan-images');
