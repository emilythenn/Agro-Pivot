
-- Remove hardcoded default values from profiles table
ALTER TABLE public.profiles ALTER COLUMN state DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN district DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN acreage DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN primary_crop DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN soil_type DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN farm_type DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN irrigation_type DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN flood_risk DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN planting_season DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN farming_style DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN risk_tolerance DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN drainage_condition DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN selling_method DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN main_crop_income DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

-- Update handle_new_user trigger to not insert default state/district
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'farmer')
  );
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'farmer')::app_role);
  RETURN NEW;
END;
$function$;
