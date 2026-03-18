// @ts-ignore
import { serve } from "https://deno.land/std@0.171.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Return a realistic mock scan result
    const scanResult = {
      crop_name: "Rice",
      status: "healthy",
      germination_rate: 92,
      confidence: 0.98,
      issues: [
        {
          type: "fungal infection",
          severity: "low",
          description: "Minor fungal spots detected on leaves",
          affected_percentage: 5,
        },
      ],
      recommendations: [
        "Apply mild fungicide treatment",
        "Monitor moisture levels",
        "Ensure proper sunlight exposure",
      ],
      summary: "Seedlings are healthy overall with minor fungal issues. High germination rate expected.",
    };

    return new Response(JSON.stringify(scanResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
