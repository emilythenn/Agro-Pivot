import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { crop_name, image_base64, gps_lat, gps_lng, language = "en" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    const isUnknownCrop = !crop_name || crop_name === "unknown";
    const lang = langMap[language] || "English";

    const messages: any[] = [
      {
        role: "system",
        content: `You are an AI seed integrity analyzer for Malaysian agriculture. Analyze seedling photos to detect anomalies, estimate germination rates, and identify potential issues like Padi Angin contamination, fungal infections, or poor germination. Provide detailed analysis suitable for legal evidence reports. ALL text responses (summary, issue descriptions, recommendations) MUST be in ${lang}.${isUnknownCrop ? " IMPORTANT: The user does not know the crop type. You MUST identify the crop species from the image first, then proceed with the full analysis." : ""}`,
      },
    ];

    if (image_base64) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: isUnknownCrop
              ? `I don't know what crop this is. Please: 1) Identify the crop species/variety from the image 2) Determine health status (healthy/anomaly) 3) Estimate germination rate 4) Detect any issues 5) Provide recommendations. Use the identified crop name in crop_name field. ALL text must be in ${lang}.`
              : `Analyze this ${crop_name} seedling image. Determine: 1) Health status (healthy/anomaly) 2) Estimated germination rate 3) Any detected issues 4) Recommendations. ALL text must be in ${lang}.`,
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${image_base64}` },
          },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: isUnknownCrop
          ? `Simulate an analysis for an unidentified crop from a farm at coordinates (${gps_lat || 6.12}, ${gps_lng || 100.37}). Pick a common Malaysian crop and generate a realistic analysis result. ALL text must be in ${lang}.`
          : `Simulate an analysis for ${crop_name} seedlings from a farm at coordinates (${gps_lat || 6.12}, ${gps_lng || 100.37}). Generate a realistic analysis result. ALL text must be in ${lang}.`,
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "return_scan_result",
              description: "Return seed scan analysis results",
              parameters: {
                type: "object",
                properties: {
                  crop_name: { type: "string", description: "The identified or confirmed crop species/variety name" },
                  status: { type: "string", enum: ["healthy", "anomaly"] },
                  germination_rate: { type: "number", description: "Estimated germination rate as a percentage (0-100)" },
                  confidence: { type: "number" },
                  issues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        severity: { type: "string", enum: ["low", "medium", "high"] },
                        description: { type: "string" },
                        affected_percentage: { type: "number" },
                      },
                      required: ["type", "severity", "description"],
                    },
                  },
                  recommendations: { type: "array", items: { type: "string" } },
                  summary: { type: "string" },
                },
                required: ["crop_name", "status", "germination_rate", "confidence", "issues", "recommendations", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_scan_result" } },
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
      const scanResult = JSON.parse(toolCall.function.arguments);

      // Save to database if auth token provided
      if (authHeader) {
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const supabase = createClient(supabaseUrl, supabaseKey);

          const token = authHeader.replace("Bearer ", "");
          const { data: { user } } = await supabase.auth.getUser(token);

          if (user) {
            await supabase.from("scan_results").insert({
              user_id: user.id,
              crop_name: scanResult.crop_name || crop_name || "Unknown",
              status: scanResult.status,
              germination_rate: scanResult.germination_rate,
              gps_lat: gps_lat || null,
              gps_lng: gps_lng || null,
              ai_analysis: scanResult,
            });
          }
        } catch (dbErr) {
          console.error("Failed to save scan result:", dbErr);
        }
      }

      return new Response(JSON.stringify(scanResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Failed to parse scan result");
  } catch (e) {
    console.error("scan-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
