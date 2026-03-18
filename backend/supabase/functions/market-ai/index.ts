// @ts-ignore: Deno runtime and remote imports are not recognized by VS Code/TypeScript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Robust error handling and JSON response
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }
  try {
    const { language = "en" } = await req.json();
    // @ts-ignore
    // @ts-ignore
    const APRIFEAKS_API_KEY = Deno.env.get("APRIFEAKS_API_KEY");
    if (!APRIFEAKS_API_KEY) throw new Error("APRIFEAKS_API_KEY is not configured");
      // @ts-ignore
      // @ts-ignore
      const REGIONALSOIL_API_KEY = Deno.env.get("REGIONALSOIL_API_KEY");
      // Use REGIONALSOIL_API_KEY for regional soil/agriculture data API calls as needed
    const aprifeaksUrl = `https://api.aprifeaks.com/v1/commodities/prices?language=${language}`;
    const response = await fetch(aprifeaksUrl, {
      headers: {
        "Authorization": `Bearer ${APRIFEAKS_API_KEY}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      let errorMsg = "Aprifeaks service unavailable";
      try {
        errorMsg = await response.text();
      } catch {}
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const marketData = await response.json();
    return new Response(JSON.stringify(marketData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
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
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { language = "en" } = await req.json();
    // @ts-ignore
    const APRIFEAKS_API_KEY = Deno.env.get("APRIFEAKS_API_KEY");
    if (!APRIFEAKS_API_KEY) throw new Error("APRIFEAKS_API_KEY is not configured");

    // Fetch real commodity prices from Aprifeaks
    const aprifeaksUrl = `https://api.aprifeaks.com/v1/commodities/prices?language=${language}`;
    const response = await fetch(aprifeaksUrl, {
      headers: {
        "Authorization": `Bearer ${APRIFEAKS_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("Aprifeaks service unavailable");
    }

    const marketData = await response.json();
    return new Response(JSON.stringify(marketData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("market-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
