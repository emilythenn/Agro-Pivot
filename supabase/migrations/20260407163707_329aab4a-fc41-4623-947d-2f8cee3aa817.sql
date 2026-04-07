
-- Prevent duplicate ratings
ALTER TABLE public.marketplace_ratings 
ADD CONSTRAINT unique_order_rater UNIQUE (order_id, rater_id);

-- Upload policy for product-images (select policy already exists)
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');
