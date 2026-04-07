import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { district, mode, language, farm_context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const fc = farm_context || {};
    const farmProfile = `
Farm Profile:
- Location: ${district || "Unknown"}, ${fc.state || "Unknown"}
- Farm Name: ${fc.farm_name || "N/A"}
- Farm Size: ${fc.acreage || "Unknown"} acres
- Farm Type: ${fc.farm_type || "Unknown"}
- Soil Type: ${fc.soil_type || "Unknown"}
- Irrigation: ${fc.irrigation_type || "Unknown"}
- Drainage: ${fc.drainage_condition || "Unknown"}
- Flood Risk: ${fc.flood_risk || "Unknown"}
- Farming Style: ${fc.farming_style || "Unknown"}
- Risk Tolerance: ${fc.risk_tolerance || "medium"}
- Budget per Season: RM ${fc.budget_per_season || "Unknown"}
- Selling Method: ${fc.selling_method || "Unknown"}
- Expected Yield Target: ${fc.expected_yield_target || "Unknown"}
- Planting Season: ${fc.planting_season || "Unknown"}
- Current Crops: ${fc.current_crops || "None"}
- Preferred Crops: ${fc.preferred_crops || "None"}
- Primary Crop: ${fc.primary_crop || "None"}
- Secondary Crops: ${fc.secondary_crops || "None"}
- Historical Issues: ${fc.historical_issues || "None"}
- Main Income from Crops: ${fc.main_crop_income !== null ? (fc.main_crop_income ? "Yes" : "No") : "Unknown"}`;

    const prompt = `You are a Malaysian agricultural advisory AI. Generate crop recommendations for ${district || "Unknown"}, ${fc.state || "Malaysia"}.

${farmProfile}

Mode: ${mode || "advisory"} (advisory = general planting advice, rescue = short-cycle recovery crops for failed batches)

CRITICAL INSTRUCTIONS:
- Tailor recommendations to the farmer's ACTUAL profile above
- Consider their budget (RM ${fc.budget_per_season || "Unknown"}) when suggesting crops
- Factor in soil type (${fc.soil_type || "Unknown"}) and irrigation (${fc.irrigation_type || "Unknown"}) for suitability
- Account for flood risk (${fc.flood_risk || "Unknown"}) and drainage (${fc.drainage_condition || "Unknown"})
- Respect their risk tolerance (${fc.risk_tolerance || "medium"})
- Consider their farm size (${fc.acreage || "Unknown"} acres) for yield estimates
- If they have historical issues like "${fc.historical_issues || "none"}", recommend crops that avoid those problems

REALISTIC FARMER MINDSET (CRITICAL):
- Farmers are COMMITTED to their current crops. They don't pivot easily.
- ALWAYS prioritize their current/preferred crops FIRST. Give advice on how to OPTIMIZE them.
- Only suggest alternatives for NEXT season planning, not immediate switching.
- For "advisory" mode: Focus on improving what they already grow — fertilizer timing, pest management, harvest optimization.
- For "rescue" mode ONLY: This is for genuine crop failure (>50% loss). Only then suggest short-cycle rescue crops.
- Frame new crop suggestions as "worth considering for next season" — never "switch now".
- Give practical, actionable advice: specific fertilizer amounts, watering schedules, pest treatments.

IMPORTANT: You MUST respond with valid JSON only. No markdown, no prose, no explanations outside JSON.

{
  "recommendations": [
    {
      "crop": "Crop Name",
      "climate_risk": "low" | "medium" | "high",
      "market_trend": "up" | "down" | "stable",
      "action": "plant" | "hold" | "avoid",
      "advice": "Specific actionable advice tailored to this farmer's profile",
      "season_window": "45 days",
      "expected_yield": "2.5 ton/ha",
      "profit_score": 85,
      "estimated_cost_rm": 5000,
      "estimated_revenue_rm": 12000,
      "suitability_reason": "Why this crop suits this specific farmer"
    }
  ]
}

Generate 5-8 crop recommendations. For "rescue" mode, focus on short-cycle crops (30-60 days). Use realistic Malaysian agricultural data. ${language === "ms" ? "Respond in Bahasa Melayu." : ""}`;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
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

        if (!response.ok) {
          const t = await response.text();
          console.error(`AI error (attempt ${attempt + 1}):`, response.status, t);
          lastError = new Error("AI gateway error");
          continue;
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || "";
        content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        
        let result;
        try {
          result = JSON.parse(content);
        } catch {
          console.error("JSON parse failed, raw:", content.slice(0, 200));
          lastError = new Error("Invalid AI response");
          continue;
        }

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error(`Attempt ${attempt + 1} failed:`, e);
        lastError = e instanceof Error ? e : new Error("Unknown error");
      }
    }

    throw lastError || new Error("All attempts failed");
  } catch (e) {
    console.error("Advisory error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
