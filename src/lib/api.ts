import { supabase } from "@/integrations/supabase/client";

const CLOUD_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface FarmContext {
  district?: string;
  state?: string;
  farm_name?: string;
  acreage?: number | null;
  soil_type?: string | null;
  farm_type?: string | null;
  irrigation_type?: string | null;
  farming_style?: string | null;
  risk_tolerance?: string | null;
  flood_risk?: string | null;
  drainage_condition?: string | null;
  budget_per_season?: number | null;
  expected_yield_target?: string | null;
  selling_method?: string | null;
  main_crop_income?: boolean | null;
  planting_season?: string | null;
  current_crops?: string | null;
  preferred_crops?: string | null;
  primary_crop?: string | null;
  secondary_crops?: string | null;
  historical_issues?: string | null;
}

async function callFunction(name: string, body: any) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || ANON_KEY;
  
  const resp = await fetch(`${CLOUD_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `Function ${name} failed`);
  }
  return resp.json();
}

// Weather API
export async function fetchWeatherData(district: string, language: string = "en", user_id?: string, farmContext?: FarmContext) {
  return callFunction("weather-forecast", { district, language, user_id, farm_context: farmContext });
}

// Market Prices API
export async function fetchMarketPrices(district: string, language: string = "en", farmContext?: FarmContext) {
  return callFunction("market-prices", { district, language, farm_context: farmContext });
}

// Scan Analyze
export async function analyzeScan(params: {
  crop_name: string;
  image_base64?: string;
  gps_lat?: number;
  gps_lng?: number;
  language?: string;
  scan_mode?: string;
}) {
  return callFunction("scan-analyze", params);
}

// Crop Advisory
export async function fetchCropAdvisory(district: string, mode: string = "advisory", language: string = "en", farmContext?: FarmContext) {
  return callFunction("crop-advisory", { district, mode, language, farm_context: farmContext });
}

// Alert management
export async function markAlertRead(alertId: string) {
  const { error } = await supabase
    .from("alerts")
    .update({ read: true })
    .eq("id", alertId);
  if (error) throw error;
}

export async function markAllAlertsRead(userId: string) {
  const { error } = await supabase
    .from("alerts")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
}

// Run Simulation
export async function runSimulation(params: {
  crops: string[];
  weather: string;
  market_change: number;
  seed_quality: number;
  district: string;
  language?: string;
  farm_context?: FarmContext;
}) {
  return callFunction("simulate", params);
}

// Evidence Report
export async function createEvidenceReport(params: {
  user_id: string;
  scan_id: string;
  report_title: string;
  report_type: string;
  gps_data: any;
  ai_analysis: string;
}) {
  const hash = "SHA-256:" + Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(params))))).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16) + "...";
  
  const { error } = await supabase.from("evidence_reports").insert({
    user_id: params.user_id,
    scan_id: params.scan_id,
    report_title: params.report_title,
    report_type: params.report_type,
    gps_data: params.gps_data,
    ai_analysis: params.ai_analysis,
    report_hash: hash,
  });
  if (error) throw error;
  return { hash };
}

// DB queries
export async function getScanHistory(userId: string) {
  const { data, error } = await supabase
    .from("scan_results")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAlerts(userId: string) {
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getEvidenceReports(userId: string) {
  const { data: reports, error } = await supabase
    .from("evidence_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!reports?.length) return [];

  const scanIds = reports.map(r => r.scan_id).filter(Boolean);
  let scansMap: Record<string, any> = {};
  if (scanIds.length > 0) {
    const { data: scans } = await supabase
      .from("scan_results")
      .select("*")
      .in("id", scanIds);
    if (scans) {
      scansMap = Object.fromEntries(scans.map(s => [s.id, s]));
    }
  }

  return reports.map(r => ({
    ...r,
    scan_results: r.scan_id ? scansMap[r.scan_id] || null : null,
  }));
}

// Profile helpers
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getUnreadAlertCount(userId: string) {
  const { count, error } = await supabase
    .from("alerts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
  return count || 0;
}
