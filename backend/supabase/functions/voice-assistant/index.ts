// @ts-ignore: Deno runtime and remote imports are not recognized by VS Code/TypeScript
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
    const { query, language = "en" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lang = langMap[language] || "English";
    const today = new Date().toISOString().split("T")[0];

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
            content: `You are Agro-Pivot Voice Assistant — a friendly, concise agricultural advisor for Malaysian farmers. Today is ${today}.

Your job: Answer the farmer's spoken question in 2-3 short sentences. Be warm, practical, and direct. 

You have knowledge of:
- Malaysian weather patterns and forecasts
- Crop recommendations for Malaysian districts (Kedah, Perak, Johor, etc.)
- Market prices for Malaysian agricultural commodities (Padi, Oil Palm, Rubber, Chili, Ginger, etc.)
- Seed quality and planting advice
- Risk assessment for crops

IMPORTANT RULES:
1. Reply ONLY in ${lang}
2. Keep responses under 60 words — this will be spoken aloud
3. Be conversational and friendly, like talking to a neighbor
4. Give specific, actionable advice
5. If asked about weather, mention rainfall/temperature trends
6. If asked about crops, mention best options and risks
7. If asked about market, mention price trends
8. End with a brief encouraging note when appropriate`,
          },
          {
            role: "user",
            content: query,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI service unavailable");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't process your question.";

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
