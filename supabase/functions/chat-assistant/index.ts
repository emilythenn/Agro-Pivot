import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are AgroPivot Voice & Chat Assistant — a friendly, knowledgeable farming advisor for Malaysian farmers.

You help farmers with:
- Weather forecasts and rainfall predictions
- Crop recommendations based on season, soil, and market conditions
- Market price trends and best selling times
- Pest/disease warnings and prevention
- Planting schedules and best practices

Key rules:
1. Keep answers SHORT and practical (2-4 sentences max for voice, slightly more for chat)
2. Support both English and Bahasa Malaysia — reply in the same language the user speaks
3. Always relate advice to Malaysian agriculture (padi, kelapa sawit, getah, sayur-sayuran, etc.)
4. If asked about weather, give general seasonal advice for Malaysia (monsoon seasons, etc.)
5. Be warm and encouraging — many users are smallholder farmers
6. When uncertain, say so honestly and suggest consulting local FAMA or DOA offices
7. Use simple language — avoid technical jargon
8. CRITICAL — REALISTIC ADVICE: Farmers don't switch crops easily. They have invested money, seeds, labor, and months of work. NEVER casually suggest "try planting X instead" or "switch to another crop". Instead, give practical advice to MANAGE and OPTIMIZE their current crops. Only mention crop alternatives if the farmer explicitly asks about next season planning or if crop failure is truly catastrophic (>60% total loss).

Example interactions:
- "Tanam apa sekarang?" → Give seasonal crop recommendation
- "Hujan minggu ini?" → Give weather outlook
- "Harga cili naik ke?" → Give market trend info
- "Is it safe to plant now?" → Assess current conditions`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, messages: chatHistory, mode, language } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userMessages = chatHistory 
      ? chatHistory.map((m: any) => ({ role: m.role, content: m.content }))
      : [{ role: "user", content: message }];

    const langMap: Record<string, string> = {
      en: "Reply ONLY in English.",
      ms: "Reply ONLY in Bahasa Malaysia (Malay).",
      zh: "Reply ONLY in Chinese (Simplified, 中文).",
      ta: "Reply ONLY in Tamil (தமிழ்).",
      hi: "Reply ONLY in Hindi (हिन्दी).",
      id: "Reply ONLY in Bahasa Indonesia.",
      th: "Reply ONLY in Thai (ภาษาไทย).",
      vi: "Reply ONLY in Vietnamese (Tiếng Việt).",
      tl: "Reply ONLY in Filipino (Tagalog).",
      my: "Reply ONLY in Burmese (မြန်မာ).",
      bn: "Reply ONLY in Bengali (বাংলা).",
      ja: "Reply ONLY in Japanese (日本語).",
      ko: "Reply ONLY in Korean (한국어).",
      ar: "Reply ONLY in Arabic (العربية).",
      fr: "Reply ONLY in French (Français).",
      es: "Reply ONLY in Spanish (Español).",
      pt: "Reply ONLY in Portuguese (Português).",
    };

    const langInstruction = language && language !== "auto" && langMap[language]
      ? `\n\nLANGUAGE OVERRIDE: ${langMap[language]}`
      : "\n\nCRITICAL LANGUAGE RULE: You MUST detect what language the user's latest message is written in and reply ENTIRELY in that SAME language. Support ALL languages — if the user writes in any language (Chinese, Tamil, Hindi, Thai, Japanese, Korean, Arabic, French, Spanish, etc.), reply fully in that same language. NEVER mix languages — always match the user's language exactly.";

    const systemContent = mode === "voice" 
      ? SYSTEM_PROMPT + langInstruction + "\n\nIMPORTANT: This is a VOICE interaction. Keep your reply to 1-3 short sentences. Be concise and natural-sounding when spoken aloud. Do NOT use markdown, bullet points, or formatting."
      : SYSTEM_PROMPT + langInstruction;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemContent },
          ...userMessages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Maaf, saya tidak dapat menjawab sekarang.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
