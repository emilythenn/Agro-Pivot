// @ts-ignore
import { serve } from "https://deno.land/std@0.171.0/http/server.ts";

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

// @ts-ignore
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, language = "en" } = await req.json();
    const lang = langMap[language] || "English";
    const today = new Date().toISOString().split("T")[0];

    // Return a realistic mock voice assistant result
    const reply = `Voice assistant is ready. No external AI required. Language: ${lang}. Today is ${today}.`;
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
