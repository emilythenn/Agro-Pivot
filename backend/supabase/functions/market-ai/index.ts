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
    const { language = "en" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const today = new Date().toISOString().split("T")[0];
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
            content: `You are a Malaysian agricultural market data API (FAMA). Generate realistic current market prices for Malaysian crops as of ${today}. Return ONLY valid JSON. Crop names and volume text MUST be in ${lang}.`,
          },
          {
            role: "user",
            content: `Generate current Malaysian agricultural commodity market data for these crops: Padi, Ginger, Chili, Mung Bean, Cassava, Corn, Cucumber, Sweet Potato, Oil Palm, Rubber. ALL crop names and volume descriptions must be in ${lang}. Return JSON array with structure:
[{ "crop": "string in ${lang}", "price": number (RM/ton), "unit": "RM/ton", "change": number (%), "trend": "up|down|stable", "weekHigh": number, "weekLow": number, "volume": "string in ${lang} (e.g. 2.4k tons)" }]
Use realistic Malaysian agricultural prices.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_market_data",
              description: "Return market price data",
              parameters: {
                type: "object",
                properties: {
                  commodities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        crop: { type: "string" },
                        price: { type: "number" },
                        unit: { type: "string" },
                        change: { type: "number" },
                        trend: { type: "string", enum: ["up", "down", "stable"] },
                        weekHigh: { type: "number" },
                        weekLow: { type: "number" },
                        volume: { type: "string" },
                      },
                      required: ["crop", "price", "unit", "change", "trend", "weekHigh", "weekLow", "volume"],
                    },
                  },
                },
                required: ["commodities"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_market_data" } },
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
      const marketData = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(marketData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Failed to parse market data");
  } catch (e) {
    console.error("market-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
