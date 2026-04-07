import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { crops, weather, market_change, seed_quality, district, language, farm_context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const fc = farm_context || {};

    const prompt = `You are a Malaysian agricultural risk simulator. Simulate crop outcomes for the following scenario:

District: ${district || "Unknown"}, ${fc.state || "Malaysia"}
Crops: ${(crops || []).join(", ")}
Weather Scenario: ${weather || "normal"}
Market Change: ${market_change || 0}%
Seed Quality: ${seed_quality || 90}%

Farmer Profile:
- Farm Name: ${fc.farm_name || "N/A"}
- Farm Size: ${fc.acreage || "Unknown"} acres
- Farm Type: ${fc.farm_type || "Unknown"}
- Soil Type: ${fc.soil_type || "Unknown"}
- Irrigation: ${fc.irrigation_type || "Unknown"}
- Drainage: ${fc.drainage_condition || "Unknown"}
- Flood Risk: ${fc.flood_risk || "Unknown"}
- Risk Tolerance: ${fc.risk_tolerance || "medium"}
- Budget per Season: RM ${fc.budget_per_season || "Unknown"}
- Selling Method: ${fc.selling_method || "Unknown"}
- Farming Style: ${fc.farming_style || "Unknown"}
- Historical Issues: ${fc.historical_issues || "None"}
- Main Income from Crops: ${fc.main_crop_income !== null ? (fc.main_crop_income ? "Yes" : "No") : "Unknown"}

CRITICAL: Use the farmer's ACTUAL farm size (${fc.acreage || "Unknown"} acres), budget (RM ${fc.budget_per_season || "Unknown"}), and soil type to calculate realistic yields and revenues. Factor in their risk tolerance and historical issues.

REALISTIC FARMER MINDSET (CRITICAL):
- The farmer is SIMULATING scenarios for crops they already grow or plan to grow. They are committed.
- In the "advice" field, give PRACTICAL management tips to improve outcomes — NOT "switch to another crop".
- Focus on: "Increase irrigation by X%", "Apply pesticide before week 3", "Harvest 1 week early to avoid price drop".
- Only suggest abandoning a crop if failure_risk > 80% AND it's early in the season.
- Be honest about risks but constructive — help them MANAGE risk, not flee from it.

Return JSON only (no markdown):
{
  "results": [
    {
      "crop_name": "Crop Name",
      "estimated_yield": number (ton/ha),
      "expected_revenue": number (RM based on actual farm size),
      "estimated_cost": number (RM),
      "estimated_profit": number (RM),
      "failure_risk": number (0-100),
      "risk_level": "green" | "yellow" | "red",
      "advice": "Specific advice tailored to this farmer's profile, soil, budget, and conditions",
      "risk_factors": ["factor1", "factor2"]
    }
  ],
  "overall_assessment": "Brief overall assessment considering the farmer's specific situation, budget constraints, and risk tolerance"
}

Generate realistic results for each crop. Consider this specific farmer's conditions.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) throw new Error("AI gateway error");

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(content);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Simulate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
