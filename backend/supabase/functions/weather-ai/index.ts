// @ts-ignore: Deno runtime and remote imports are not recognized by VS Code/TypeScript
import { serve } from "https://deno.land/std@0.168.0/http/server.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const langMap: Record<string, string> = {
  en: "English",
  ms: "Bahasa Melayu",
  zh: "Chinese (Simplified)",
  ta: "Tamil",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { district = "Kedah", language = "en" } = await req.json();
    // Real API fetch for weather
    const MET_TOKEN = Deno.env.get("MET_TOKEN");
    if (!MET_TOKEN) throw new Error("MET_TOKEN is not configured");
    const url = `https://api.data.gov.my/weather/forecast?district=${encodeURIComponent(district)}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${MET_TOKEN}` }
    });
    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "API credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("Weather API error:", response.status, t);
      throw new Error("Weather API unavailable");
    }
    const weatherData = await response.json();
    return new Response(JSON.stringify(weatherData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weather-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
