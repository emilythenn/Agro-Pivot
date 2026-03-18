import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// ---- Weather API ----
export async function fetchWeatherData(state = "Putrajaya", district = "237") {
  // Use Vite env variable for backend URL
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
  const url = `${backendUrl}/weather/forecast?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`;
  const res = await fetch(url);
  if (!res.ok) {
    let errorMsg = "Failed to fetch weather data";
    try {
      const text = await res.text();
      errorMsg = text;
    } catch {}
    throw new Error(errorMsg);
  }
  try {
    return await res.json();
  } catch (e) {
    throw new Error("Weather API did not return valid JSON.");
  }
// ...existing code...
}

// ---- Market AI ----
export async function fetchMarketData(language = "en") {
  const { data, error } = await supabase.functions.invoke("market-ai", {
    body: { language },
  });
  if (error) throw new Error(error.message || "Failed to fetch market data");
  return data;
}

// ---- Crop Advisory ----
export async function fetchCropAdvisory(district = "Kedah", season = "current", language = "en") {
  const { data, error } = await supabase.functions.invoke("crop-advisory", {
    body: { district, season, language },
  });
  if (error) throw new Error(error.message || "Failed to fetch crop advisory");
  return data;
}

// ---- Scan Analyze ----
export async function analyzeScan(params: {
  crop_name: string;
  image_base64?: string;
  gps_lat?: number;
  gps_lng?: number;
  language?: string;
}) {
  const { data, error } = await supabase.functions.invoke("scan-analyze", {
    body: params,
  });
  if (error) throw new Error(error.message || "Failed to analyze scan");
  return data;
}

// ---- Simulator AI ----
export async function runSimulation(params: {
  crops: string[];
  weather: string;
  market_change: number;
  seed_quality: number;
  district?: string;
  language?: string;
}) {
  const { data, error } = await supabase.functions.invoke("simulator-ai", {
    body: params,
  });
  if (error) throw new Error(error.message || "Failed to run simulation");
  return data;
}

// ---- Chat streaming (existing) ----
export async function streamChat({
  messages,
  onDelta,
  onDone,
}: {
  messages: { role: "user" | "assistant"; content: string }[];
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/agro-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { streamDone = true; break; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  // Final flush
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}

// ---- Database helpers ----
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: Record<string, any>) {
  const { error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

export async function getUserSettings(userId: string) {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateUserSettings(userId: string, updates: Record<string, any>) {
  const { error } = await supabase
    .from("user_settings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function getScanHistory(userId: string) {
  const { data, error } = await supabase
    .from("scan_results")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getEvidenceReports(userId: string) {
  const { data, error } = await supabase
    .from("evidence_reports")
    .select("*, scan_results(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createEvidenceReport(report: {
  user_id: string;
  scan_id?: string;
  report_title: string;
  report_type: string;
  gps_data?: any;
  weather_data?: any;
  ai_analysis?: string;
}) {
  const { data, error } = await supabase
    .from("evidence_reports")
    .insert(report)
    .select()
    .single();
  if (error) throw error;
  return data;
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
