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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { crops, weather, market_change, seed_quality, district = "Kedah", language = "en" } = await req.json();
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
            content: `You are a farm risk simulator for Malaysian agriculture. Simulate crop outcomes based on given parameters. Use realistic Malaysian agricultural data. ALL text responses (advice, overall_assessment) MUST be in ${lang}.`,
          },
          {
            role: "user",
            content: `Simulate farming outcomes for ${district} with these parameters:
- Crops: ${JSON.stringify(crops)}
- Weather scenario: ${weather} (normal/more_rain/drought/monsoon_shift)
- Market fluctuation: ${market_change}%
- Seed germination quality: ${seed_quality}%

For each crop, calculate estimated yield (ton/ha), expected revenue (RM), and failure risk (%). ALL advice text and overall assessment must be in ${lang}.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_simulation",
              description: "Return simulation results",
              parameters: {
                type: "object",
                properties: {
                  results: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        crop_name: { type: "string" },
                        estimated_yield: { type: "number" },
                        expected_revenue: { type: "number" },
                        failure_risk: { type: "number" },
                        risk_level: { type: "string", enum: ["green", "yellow", "red"] },
                        advice: { type: "string" },
                      },
                      required: ["crop_name", "estimated_yield", "expected_revenue", "failure_risk", "risk_level", "advice"],
                    },
                  },
                  overall_assessment: { type: "string" },
                },
                required: ["results", "overall_assessment"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_simulation" } },
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
      const simResult = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(simResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Failed to parse simulation");
  } catch (e) {
    console.error("simulator-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
