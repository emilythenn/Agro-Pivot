-- ============================================================
-- Agri-Guardian Complete Database Schema
-- Safe to run multiple times (idempotent)
-- ============================================================

-- ============================================================
-- TABLE: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT DEFAULT '',
  email           TEXT DEFAULT '',
  phone           TEXT DEFAULT '',
  role            TEXT DEFAULT 'farmer',
  farm_name       TEXT DEFAULT '',
  district        TEXT DEFAULT 'Kedah',
  state           TEXT DEFAULT 'Kedah',
  acreage         NUMERIC DEFAULT 0,
  primary_crop    TEXT DEFAULT '',
  secondary_crops TEXT DEFAULT '',
  soil_type       TEXT DEFAULT '',
  avatar_url      TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- ============================================================
-- TABLE: scan_results
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scan_results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  crop_name        TEXT NOT NULL,
  scan_date        TIMESTAMPTZ DEFAULT NOW(),
  status           TEXT DEFAULT 'pending',
  germination_rate NUMERIC DEFAULT 0,
  image_url        TEXT DEFAULT '',
  gps_lat          NUMERIC,
  gps_lng          NUMERIC,
  ai_analysis      JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.scan_results ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='scan_results' AND policyname='Users can view own scans') THEN
    CREATE POLICY "Users can view own scans" ON public.scan_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='scan_results' AND policyname='Users can insert own scans') THEN
    CREATE POLICY "Users can insert own scans" ON public.scan_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='scan_results' AND policyname='Users can update own scans') THEN
    CREATE POLICY "Users can update own scans" ON public.scan_results FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- TABLE: evidence_reports
-- ============================================================
CREATE TABLE IF NOT EXISTS public.evidence_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scan_id      UUID REFERENCES public.scan_results(id) ON DELETE SET NULL,
  report_title TEXT NOT NULL,
  report_type  TEXT DEFAULT 'anomaly',
  status       TEXT DEFAULT 'pending',
  gps_data     JSONB DEFAULT '{}',
  weather_data JSONB DEFAULT '{}',
  ai_analysis  TEXT DEFAULT '',
  pdf_url      TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.evidence_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='evidence_reports' AND policyname='Users can view own reports') THEN
    CREATE POLICY "Users can view own reports" ON public.evidence_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='evidence_reports' AND policyname='Users can insert own reports') THEN
    CREATE POLICY "Users can insert own reports" ON public.evidence_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='evidence_reports' AND policyname='Users can update own reports') THEN
    CREATE POLICY "Users can update own reports" ON public.evidence_reports FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- TABLE: alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type       TEXT NOT NULL,
  severity   TEXT DEFAULT 'medium',
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='alerts' AND policyname='Users can view own alerts') THEN
    CREATE POLICY "Users can view own alerts" ON public.alerts FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='alerts' AND policyname='Users can update own alerts') THEN
    CREATE POLICY "Users can update own alerts" ON public.alerts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='alerts' AND policyname='Users can insert own alerts') THEN
    CREATE POLICY "Users can insert own alerts" ON public.alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Enable realtime for alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;

-- ============================================================
-- TABLE: user_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  weather_alerts     BOOLEAN DEFAULT TRUE,
  market_updates     BOOLEAN DEFAULT TRUE,
  crop_advisory      BOOLEAN DEFAULT TRUE,
  seed_scan_results  BOOLEAN DEFAULT TRUE,
  email_digest       BOOLEAN DEFAULT TRUE,
  sms_alerts         BOOLEAN DEFAULT FALSE,
  sound_effects      BOOLEAN DEFAULT TRUE,
  quiet_hours_start  TEXT DEFAULT '22:00',
  quiet_hours_end    TEXT DEFAULT '07:00',
  temp_unit          TEXT DEFAULT 'celsius',
  date_format        TEXT DEFAULT 'DD/MM/YYYY',
  timezone           TEXT DEFAULT 'Asia/Kuala_Lumpur',
  currency           TEXT DEFAULT 'MYR',
  share_location     BOOLEAN DEFAULT TRUE,
  analytics_opt_in   BOOLEAN DEFAULT FALSE,
  public_profile     BOOLEAN DEFAULT FALSE,
  two_factor         BOOLEAN DEFAULT FALSE,
  data_export        BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_settings' AND policyname='Users can view own settings') THEN
    CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_settings' AND policyname='Users can update own settings') THEN
    CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_settings' AND policyname='Users can insert own settings') THEN
    CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- TABLE: user_activities
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_activities (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT DEFAULT '',
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_activities' AND policyname='Users can view own activities') THEN
    CREATE POLICY "Users can view own activities" ON public.user_activities FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_activities' AND policyname='Users can insert own activities') THEN
    CREATE POLICY "Users can insert own activities" ON public.user_activities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities (user_id, created_at DESC);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('scan-images', 'scan-images', true)
  ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Users can upload own avatar') THEN
    CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Users can update own avatar') THEN
    CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Anyone can view avatars') THEN
    CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Users can upload scan images') THEN
    CREATE POLICY "Users can upload scan images" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'scan-images' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Users can update own scan images') THEN
    CREATE POLICY "Users can update own scan images" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'scan-images' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Public read scan images') THEN
    CREATE POLICY "Public read scan images" ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'scan-images');
  END IF;
END $$;

-- ============================================================
-- TRIGGERS: auto-create profile + settings on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'farmer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();

-- ============================================================
-- AUTH: auto-confirm email so users can login immediately
-- ============================================================
UPDATE auth.users
SET
  email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

CREATE OR REPLACE FUNCTION public.auto_confirm_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, NOW());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_confirm_auth_user_trigger ON auth.users;
CREATE TRIGGER auto_confirm_auth_user_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_auth_user();
