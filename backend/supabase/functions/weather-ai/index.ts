// @ts-ignore: Deno runtime and remote imports are not recognized by VS Code/TypeScript
import { serve } from "https://deno.land/std@0.168.0/http/server.js";

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
    const { district = "Kedah", language = "en" } = await req.json();
    // @ts-ignore: Deno global is available in Edge Functions
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
            content: `You are a weather data API for Malaysian agriculture. Generate realistic weather data for the ${district} district. Today is ${today}. Return ONLY valid JSON, no markdown. ALL text values (conditions, directions, alert messages, day names) MUST be in ${lang}.`,
          },
          {
            role: "user",
            content: `Generate a 7-day weather forecast for ${district}, Malaysia starting from today. Include current conditions. ALL text content must be in ${lang}. Return JSON with this exact structure:
{
  "current": { "temperature": number, "humidity": number, "wind_speed": number, "wind_direction": "string in ${lang}", "condition": "string in ${lang}", "rainfall_mm": number, "feels_like": number },
  "forecast": [{ "day": "string in ${lang}", "date": "YYYY-MM-DD", "icon": "emoji", "temp_high": number, "temp_low": number, "rain_percent": number, "wind_kmh": number, "humidity": number, "condition": "string in ${lang}" }],
  "alerts": [{ "type": "string in ${lang}", "severity": "high|medium|low", "message": "string in ${lang}" }]
}
Use realistic Malaysian tropical weather patterns. Temperatures 25-36°C, high humidity 70-95%.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_weather",
              description: "Return weather forecast data",
              parameters: {
                type: "object",
                properties: {
                  current: {
                    type: "object",
                    properties: {
                      temperature: { type: "number" },
                      humidity: { type: "number" },
                      wind_speed: { type: "number" },
                      wind_direction: { type: "string" },
                      condition: { type: "string" },
                      rainfall_mm: { type: "number" },
                      feels_like: { type: "number" },
                    },
                    required: ["temperature", "humidity", "wind_speed", "wind_direction", "condition", "rainfall_mm", "feels_like"],
                  },
                  forecast: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "string" },
                        date: { type: "string" },
                        icon: { type: "string" },
                        temp_high: { type: "number" },
                        temp_low: { type: "number" },
                        rain_percent: { type: "number" },
                        wind_kmh: { type: "number" },
                        humidity: { type: "number" },
                        condition: { type: "string" },
                      },
                      required: ["day", "date", "icon", "temp_high", "temp_low", "rain_percent", "wind_kmh", "humidity", "condition"],
                    },
                  },
                  alerts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        severity: { type: "string", enum: ["high", "medium", "low"] },
                        message: { type: "string" },
                      },
                      required: ["type", "severity", "message"],
                    },
                  },
                },
                required: ["current", "forecast", "alerts"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_weather" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI service unavailable");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const weatherData = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(weatherData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Failed to parse weather data");
  } catch (e) {
    console.error("weather-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
