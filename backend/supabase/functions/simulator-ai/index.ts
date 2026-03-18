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
    const { crops, weather, market_change, seed_quality, district = "Kedah", language = "en" } = await req.json();
    // Return a realistic mock simulation result
    const simResult = {
      results: [
        {
          crop_name: crops?.[0] || "Rice",
          estimated_yield: 5.2,
          expected_revenue: 12000,
          failure_risk: 8,
          risk_level: "green",
          advice: "Yield is good, market stable, low risk.",
        },
      ],
      overall_assessment: "Simulation completed. Crops are healthy, market is stable, and weather is favorable.",
    };
    return new Response(JSON.stringify(simResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("simulator-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
