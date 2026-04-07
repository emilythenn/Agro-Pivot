
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'farmer',
  avatar_url TEXT,
  farm_name TEXT,
  district TEXT DEFAULT 'Kota Setar',
  state TEXT DEFAULT 'Kedah',
  acreage NUMERIC DEFAULT 0,
  primary_crop TEXT DEFAULT 'Padi',
  secondary_crops TEXT,
  soil_type TEXT DEFAULT 'Clay Loam',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- User Settings table
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  weather_alerts BOOLEAN DEFAULT true,
  market_updates BOOLEAN DEFAULT true,
  crop_advisory BOOLEAN DEFAULT true,
  seed_scan_results BOOLEAN DEFAULT true,
  email_digest BOOLEAN DEFAULT false,
  sms_alerts BOOLEAN DEFAULT true,
  sound_effects BOOLEAN DEFAULT true,
  quiet_hours_start TEXT DEFAULT '22:00',
  quiet_hours_end TEXT DEFAULT '06:00',
  temp_unit TEXT DEFAULT 'celsius',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  timezone TEXT DEFAULT 'Asia/Kuala_Lumpur',
  currency TEXT DEFAULT 'MYR',
  share_location BOOLEAN DEFAULT true,
  analytics_opt_in BOOLEAN DEFAULT true,
  public_profile BOOLEAN DEFAULT false,
  two_factor BOOLEAN DEFAULT false,
  data_export BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Scan Results table (Evidence Locker)
CREATE TABLE public.scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  crop_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  germination_rate NUMERIC,
  confidence NUMERIC,
  image_url TEXT,
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  weather_snapshot JSONB,
  ai_analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scan_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own scans" ON public.scan_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scans" ON public.scan_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scans" ON public.scan_results FOR UPDATE USING (auth.uid() = user_id);

-- Evidence Reports table
CREATE TABLE public.evidence_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scan_id UUID REFERENCES public.scan_results(id),
  report_title TEXT NOT NULL,
  report_type TEXT DEFAULT 'verification',
  gps_data JSONB,
  weather_data JSONB,
  ai_analysis TEXT,
  report_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.evidence_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reports" ON public.evidence_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reports" ON public.evidence_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Activity Log table
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own activity" ON public.activity_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity" ON public.activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Alerts table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  severity TEXT DEFAULT 'medium',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own alerts" ON public.alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON public.alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alerts" ON public.alerts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Storage bucket for scan images
INSERT INTO storage.buckets (id, name, public) VALUES ('scan-images', 'scan-images', true);
CREATE POLICY "Anyone can view scan images" ON storage.objects FOR SELECT USING (bucket_id = 'scan-images');
CREATE POLICY "Auth users can upload scan images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'scan-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Auth users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Auth users can update avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create auth trigger (must be after profiles + user_settings tables exist)
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
