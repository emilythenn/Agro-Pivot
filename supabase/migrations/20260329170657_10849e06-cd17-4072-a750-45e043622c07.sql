
CREATE TABLE public.active_crops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  crop_name text NOT NULL,
  crop_variety text,
  planting_date date,
  expected_harvest_date date,
  plot_name text,
  plot_size numeric,
  water_source text DEFAULT 'rain-fed',
  soil_condition text,
  drainage_condition text,
  current_season text DEFAULT 'wet',
  seed_source text,
  seed_cost numeric,
  total_budget numeric,
  fertilizer_plan text,
  labor_cost numeric,
  ai_monitoring boolean DEFAULT false,
  growth_stage text DEFAULT 'seedling',
  priority_goal text DEFAULT 'max_profit',
  risk_tolerance text DEFAULT 'medium',
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.active_crops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own crops" ON public.active_crops FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own crops" ON public.active_crops FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own crops" ON public.active_crops FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own crops" ON public.active_crops FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_active_crops_updated_at BEFORE UPDATE ON public.active_crops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
