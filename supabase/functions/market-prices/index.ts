import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { district, language, farm_context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const fc = farm_context || {};
    const farmerCrops = [
      fc.current_crops, fc.preferred_crops, fc.primary_crop, fc.secondary_crops
    ].filter(Boolean).join(", ");

    const prompt = `You are an AI-powered agricultural market intelligence and crop recommendation engine.

YOU MUST RESPOND WITH VALID JSON ONLY. Do NOT ask for more information. Do NOT respond with prose. Use reasonable defaults for any unknown values. Even if some fields say "Unknown", generate your best estimates based on Malaysian agriculture.

Your job is to act as a FINANCIAL DECISION ENGINE for farmers. You analyze:
- 🌧️ Climate conditions (rainfall, temperature, humidity, flood/drought risk)
- 🌱 Farm characteristics (soil, drainage, irrigation, farm size)
- 📈 Market trends (prices, demand, supply)

Then you recommend the BEST crops using a SCORING SYSTEM.

═══════════════════════════════════════════
FARMER PROFILE
═══════════════════════════════════════════
Location: ${district || "Unknown"}, ${fc.state || "Unknown"}
Farm Size: ${fc.acreage || "Unknown"} acres
Soil Type: ${fc.soil_type || "Unknown"}
Irrigation: ${fc.irrigation_type || "Unknown"}
Drainage: ${fc.drainage_condition || "Unknown"}
Flood Risk: ${fc.flood_risk || "Unknown"}
Farming Style: ${fc.farming_style || "Unknown"}
Risk Tolerance: ${fc.risk_tolerance || "medium"}
Budget per Season: RM ${fc.budget_per_season || "Unknown"}
Selling Method: ${fc.selling_method || "Unknown"}
Current Crops: ${fc.current_crops || "None"}
Preferred Crops: ${fc.preferred_crops || "None"}
Primary Crop: ${fc.primary_crop || "None"}
Historical Issues: ${fc.historical_issues || "None"}

═══════════════════════════════════════════
SCORING FORMULA (USE THIS)
═══════════════════════════════════════════
Final Score (0-100) =
  (Climate Suitability × 0.4) +
  (Market Trend × 0.3) +
  (Demand Level × 0.2) +
  (Risk Factor × 0.1)

Climate Suitability: How well the crop matches current weather, soil, drainage.
Market Trend: Increasing price = high, Decreasing = low.
Demand Level: High demand = high score.
Risk Factor: Low risk for this farm = high score.

═══════════════════════════════════════════
REQUIRED OUTPUT — JSON ONLY
═══════════════════════════════════════════

{
  "recommended_crops": [
    {
      "name": "Ginger",
      "score": 87,
      "price_rm": 12.5,
      "unit": "/kg",
      "trend": "up",
      "change_percent": 15.2,
      "demand": "High",
      "risk_level": "Low",
      "climate_match": "Excellent",
      "growth_duration_days": 120,
      "estimated_cost_rm": 3500,
      "estimated_revenue_rm": 9800,
      "reason": "High rainfall tolerance and strong market demand. Matches your soil and drainage conditions well."
    }
  ],
  "market_prices": [
    {
      "crop": "Padi (Wet Rice)",
      "category": "Grain",
      "price_rm": 1280,
      "unit": "/ton",
      "change_percent": 3.5,
      "trend": "up",
      "prev_price_rm": 1236,
      "weekly_high": 1300,
      "weekly_low": 1250,
      "demand": "High",
      "farmer_relevance": "Your primary crop"
    }
  ],
  "avoid_crops": [
    {
      "name": "Tomato",
      "reason": "Flood risk too high for your farm conditions. Recent oversupply driving prices down.",
      "alternative": "Cassava",
      "alternative_reason": "Flood-resistant with stable pricing"
    }
  ],
  "preferred_crop_analysis": [
    {
      "crop": "Durian",
      "suitable": true,
      "suitability_score": 82,
      "verdict": "Good fit for your farm",
      "analysis": "Your soil type and climate support durian cultivation. Good market demand with rising prices.",
      "key_factors": ["Soil match: Good", "Climate: Suitable", "Market: Strong demand"],
      "challenges": ["Long gestation period (5-7 years)", "High initial investment"],
      "tips": "Start with Musang King variety for premium pricing. Ensure proper drainage.",
      "alternative": null,
      "alternative_reason": null
    },
    {
      "crop": "Strawberry",
      "suitable": false,
      "suitability_score": 25,
      "verdict": "Not recommended for your farm",
      "analysis": "Your lowland location and high temperatures make strawberry cultivation very difficult without controlled environment.",
      "key_factors": ["Climate: Too hot", "Altitude: Too low", "Cost: Very high setup"],
      "challenges": ["Requires cool highland climate", "Needs greenhouse investment"],
      "tips": null,
      "alternative": "Passion Fruit",
      "alternative_reason": "Similar premium fruit market but thrives in your lowland tropical climate with minimal setup cost"
    }
  ],
  "risk_alerts": [
    {
      "type": "weather",
      "severity": "high",
      "title": "Heavy Rainfall Warning",
      "message": "High rainfall detected — risk to flood-sensitive crops like Chili and Tomato",
      "affected_crops": ["Chili", "Tomato"],
      "action": "Consider switching to flood-resistant alternatives"
    }
  ],
  "last_updated": "${new Date().toISOString()}"
}

═══════════════════════════════════════════
CRITICAL RULES (REALISTIC FARMER MINDSET)
═══════════════════════════════════════════
1. Generate 5-8 recommended_crops sorted by score (highest first)
2. Generate 10-15 market_prices covering farmer's crops + regional crops
3. Generate 1-3 avoid_crops with specific alternatives
4. Generate 1-3 risk_alerts based on conditions
5. Farmer's current/preferred crops MUST appear in market_prices
6. For "preferred_crop_analysis": Analyze EVERY crop from the farmer's Preferred Crops list (${fc.preferred_crops || "None"}).
   - For each preferred crop, evaluate suitability based on soil type, climate, location, irrigation, flood risk, drainage, and budget
   - Give a suitability_score (0-100), verdict, detailed analysis, key_factors (3-4 bullet points), and challenges
   - If suitable: provide practical tips to get started
   - If NOT suitable: explain why clearly and suggest a BETTER alternative that fills a similar market niche but works with their farm conditions
   - If no preferred crops are set, return an empty array []
6. Use CONDITION-BASED filtering — NOT location hardcoding
7. Score must reflect the formula above
8. Prices in Malaysian Ringgit (RM), realistic FAMA-range
9. Be SPECIFIC and ACTIONABLE in reasons — no vague advice
10. RESPOND WITH VALID JSON ONLY — no markdown, no prose

IMPORTANT — REALISTIC ADVICE RULES:
11. Farmers are COMMITTED to their current crops. They have invested money, seeds, labor, and time.
12. NEVER casually suggest "switch crops" or "consider alternatives". Farmers don't pivot easily.
13. For risk_alerts: Give PRACTICAL protective actions (drainage, timing, storage, selling strategy) — NOT "switch to X crop"
14. Only recommend crop pivoting in "avoid_crops" section AND only for NEXT season planning — never mid-season
15. recommended_crops are for FUTURE planning, not immediate switching. Make this clear in advice.
16. For avoid_crops: Frame as "not recommended for NEXT season" with clear reasons, not "stop growing now"
17. Focus advice on: harvest timing, selling channels, input optimization, cost reduction, storage tips

${language === "ms" ? "Use Bahasa Melayu for reasons, messages, and explanations. Keep crop names in English." : ""}`;

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
          if (response.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
              status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (response.status === 402) {
            return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
              status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          const t = await response.text();
          console.error(`AI error (attempt ${attempt + 1}):`, response.status, t);
          lastError = new Error("AI gateway error");
          continue;
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || "";
        content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        
        // Robust JSON extraction
        const jsonStart = content.search(/[\{\[]/);
        const jsonEnd = content.lastIndexOf(jsonStart !== -1 && content[jsonStart] === '[' ? ']' : '}');
        if (jsonStart === -1 || jsonEnd === -1) {
          console.error("No JSON found in response, raw:", content.slice(0, 300));
          lastError = new Error("Invalid AI response");
          continue;
        }
        let jsonStr = content.substring(jsonStart, jsonEnd + 1);
        
        let marketData;
        try {
          marketData = JSON.parse(jsonStr);
        } catch {
          // Fix common issues
          jsonStr = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, "");
          try {
            marketData = JSON.parse(jsonStr);
          } catch {
            console.error("JSON parse failed, raw:", content.slice(0, 300));
            lastError = new Error("Invalid AI response");
            continue;
          }
        }

        // Backward compatibility: also expose "prices" and "alerts" keys
        if (!marketData.prices && marketData.market_prices) {
          marketData.prices = marketData.market_prices;
        }
        if (!marketData.alerts && marketData.risk_alerts) {
          marketData.alerts = marketData.risk_alerts.map((a: any) => ({
            crop: a.affected_crops?.[0] || "General",
            message: a.message,
            severity: a.severity,
            change_percent: 0,
          }));
        }

        return new Response(JSON.stringify(marketData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error(`Attempt ${attempt + 1} failed:`, e);
        lastError = e instanceof Error ? e : new Error("Unknown error");
      }
    }

    throw lastError || new Error("All attempts failed");
  } catch (e) {
    console.error("Market error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
