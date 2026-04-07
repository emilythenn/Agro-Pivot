
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('farmer', 'seed_seller', 'consumer');

-- 2. User roles table (per security guidelines - roles in separate table)
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS for user_roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view roles for public display" ON public.user_roles FOR SELECT TO anon USING (true);

-- 3. Security definer functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role::text FROM public.user_roles WHERE user_id = _user_id LIMIT 1 $$;

-- 4. Marketplace products
CREATE TABLE public.marketplace_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id uuid NOT NULL,
    product_type text NOT NULL DEFAULT 'crop',
    name text NOT NULL,
    description text,
    price numeric NOT NULL DEFAULT 0,
    unit text DEFAULT 'kg',
    quantity_available numeric DEFAULT 0,
    image_url text,
    category text,
    location_state text,
    location_district text,
    status text DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active products" ON public.marketplace_products FOR SELECT TO authenticated USING (status = 'active' OR seller_id = auth.uid());
CREATE POLICY "Sellers can insert own products" ON public.marketplace_products FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id AND (public.has_role(auth.uid(), 'farmer') OR public.has_role(auth.uid(), 'seed_seller')));
CREATE POLICY "Sellers can update own products" ON public.marketplace_products FOR UPDATE TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete own products" ON public.marketplace_products FOR DELETE TO authenticated USING (auth.uid() = seller_id);

-- 5. Marketplace orders
CREATE TABLE public.marketplace_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES public.marketplace_products(id) ON DELETE SET NULL,
    buyer_id uuid NOT NULL,
    seller_id uuid NOT NULL,
    product_name text NOT NULL,
    quantity numeric NOT NULL DEFAULT 1,
    total_price numeric NOT NULL DEFAULT 0,
    status text DEFAULT 'pending',
    buyer_notes text,
    seller_notes text,
    buyer_phone text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own orders" ON public.marketplace_orders FOR SELECT TO authenticated USING (auth.uid() = buyer_id);
CREATE POLICY "Sellers can view orders for their products" ON public.marketplace_orders FOR SELECT TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Authenticated users can create orders" ON public.marketplace_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Sellers can update order status" ON public.marketplace_orders FOR UPDATE TO authenticated USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

-- 6. Ratings
CREATE TABLE public.marketplace_ratings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
    rater_id uuid NOT NULL,
    rated_user_id uuid NOT NULL,
    rating integer NOT NULL,
    review text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(order_id, rater_id)
);
ALTER TABLE public.marketplace_ratings ENABLE ROW LEVEL SECURITY;

-- Validation trigger for rating range
CREATE OR REPLACE FUNCTION public.validate_rating() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER check_rating BEFORE INSERT OR UPDATE ON public.marketplace_ratings FOR EACH ROW EXECUTE FUNCTION public.validate_rating();

CREATE POLICY "Anyone can view ratings" ON public.marketplace_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Buyers can rate after order" ON public.marketplace_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = rater_id);

-- 7. Verification requests
CREATE TABLE public.verification_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    verification_type text NOT NULL DEFAULT 'farmer',
    documents jsonb DEFAULT '[]'::jsonb,
    reference_numbers jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'pending',
    submitted_at timestamptz NOT NULL DEFAULT now(),
    verified_at timestamptz,
    rejection_reason text
);
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verification" ON public.verification_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can submit verification" ON public.verification_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own verification" ON public.verification_requests FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 8. Update handle_new_user to also insert into user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, state, district, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'state', 'Kedah'),
    COALESCE(NEW.raw_user_meta_data->>'district', 'Kota Setar'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'farmer')
  );
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'farmer')::app_role);
  RETURN NEW;
END;
$function$;

-- 9. Storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-docs', 'verification-docs', false);
CREATE POLICY "Users can upload own verification docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'verification-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own verification docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'verification-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 10. Storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
CREATE POLICY "Sellers can upload product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Anyone can view product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Sellers can delete own product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 11. Function to get average rating for a user
CREATE OR REPLACE FUNCTION public.get_user_avg_rating(_user_id uuid)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE(AVG(rating), 0)::numeric FROM public.marketplace_ratings WHERE rated_user_id = _user_id $$;
