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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { district = "Kedah", season = "current", language = "en" } = await req.json();
    // @ts-ignore
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lang = langMap[language] || "English";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an AI agricultural advisor for Malaysian farmers in ${district}. Provide crop recommendations considering current climate, market trends, and regional suitability. ALL text responses (crop names can stay in English, but advice, season_window, expected_yield text) MUST be in ${lang}.`,
          },
          {
            role: "user",
            content: `Generate 5 crop recommendations for ${district}, Malaysia for the ${season} season. Consider climate risks, market trends, and profitability. ALL advice and descriptive text must be in ${lang}. Return structured data.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_recommendations",
              description: "Return crop recommendations",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        crop: { type: "string" },
                        action: { type: "string", enum: ["plant", "hold", "avoid"] },
                        climate_risk: { type: "string", enum: ["low", "medium", "high"] },
                        market_trend: { type: "string", enum: ["up", "stable", "down"] },
                        profit_score: { type: "number" },
                        advice: { type: "string" },
                        season_window: { type: "string" },
                        expected_yield: { type: "string" },
                      },
                      required: ["crop", "action", "climate_risk", "market_trend", "profit_score", "advice"],
                    },
                  },
                },
                required: ["recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_recommendations" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI service unavailable");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const recommendations = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(recommendations), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Failed to parse recommendations");
  } catch (e) {
    console.error("crop-advisory error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
