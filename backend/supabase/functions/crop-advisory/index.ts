// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

serve(async (req: Request)=> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { district = "Kedah", season = "current", language = "en" } = await req.json();
      const REGIONALSOIL_API_KEY = Deno.env.get("REGIONALSOIL_API_KEY");
      if (!REGIONALSOIL_API_KEY) throw new Error("REGIONALSOIL_API_KEY is not configured");
    const url = `https://api.regionalsoil.com/advisory?district=${encodeURIComponent(district)}&season=${encodeURIComponent(season)}&lang=${language}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${REGIONALSOIL_API_KEY}` }
    });
    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "API credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("Crop advisory service unavailable");
    }
    const recommendations = await response.json();
    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("crop-advisory error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
