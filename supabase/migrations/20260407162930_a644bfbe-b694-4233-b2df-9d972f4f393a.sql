
-- Create a security definer function to get public seller profiles
-- This avoids exposing PII (email, phone) while allowing seller name/avatar to be visible
CREATE OR REPLACE FUNCTION public.get_seller_profiles(seller_ids uuid[])
RETURNS TABLE(id uuid, full_name text, avatar_url text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url, p.role
  FROM public.profiles p
  WHERE p.id = ANY(seller_ids);
$$;
