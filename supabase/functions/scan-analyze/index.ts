import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { crop_name, image_base64, gps_lat, gps_lng, language, identify_only, scan_mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const mode = scan_mode || "seedling";

    // ═══════════════════════════════════════════════════════
    // 🌱 SEEDLING SCAN PROMPT (CORE FEATURE — MAIN)
    // ═══════════════════════════════════════════════════════
    const seedlingPrompt = `You are an agricultural AI expert specializing in early-stage crop analysis for Malaysian smallholder farms.

Analyze the provided image of crop seedlings (7–14 days after planting).

Your task is to detect early signs of seed failure, abnormal growth, or contamination (such as Padi Angin in rice fields).

Evaluate the following:

1. Germination Density:
- Are there visible gaps or missing seedlings?
- Estimate germination success percentage.

2. Growth Uniformity:
- Are the seedlings evenly distributed and consistent in size?
- Identify irregular or patchy growth.

3. Seedling Height & Vigor:
- Are the seedlings at expected height for day 7–14?
- Detect stunted or weak growth.

4. Morphological Anomalies:
- For rice: check for signs of Padi Angin (e.g., abnormal leaf angle, unusual coloration at stem base, faster-than-normal growth).
- Identify any abnormal leaf shapes or inconsistent structure.

5. Overall Field Health:
- Assess whether the crop is healthy, at risk, or failing.

6. Financial Impact:
- Estimate potential loss in Malaysian Ringgit (RM) if farmer continues without action.
- Estimate savings percentage if farmer acts now.

7. Recovery Options:
- If failure detected, suggest alternative crops that fit remaining season window (e.g., mung bean, kangkung, short-cycle maize).

CRITICAL: If germination appears below 70%, consider it a SERIOUS issue. If large gaps or uneven growth are visible, flag as potential seed quality problem. Be DECISIVE and PRACTICAL — never say "monitor the situation". Give SPECIFIC actionable advice.

Return your analysis STRICTLY as valid JSON (no markdown, no prose):

{
  "crop_name": "${crop_name || 'unknown'}",
  "detected_crop": "actual plant you see in image",
  "seed_variety": "specific variety if identifiable",
  "scan_mode": "seedling",
  "overall_status": "healthy | warning | critical",
  "status": "healthy or anomaly",
  "germination_rate": 0-100,
  "germination_label": "HIGH | MODERATE | LOW | CRITICAL",
  "growth_uniformity": "Good | Moderate | Poor",
  "growth_uniformity_detail": "description of uniformity",
  "average_height_expected_cm": 0,
  "average_height_actual_cm": 0,
  "height_status": "Normal | Stunted | Overgrown",
  "gap_detection_percent": 0-100,
  "gap_detail": "description of missing plants/gaps",
  "padi_angin_risk": "Not Applicable | Low | Medium | High",
  "padi_angin_detail": "explanation if applicable",
  "confidence": 0-100,
  "summary": "2-3 sentence overview",
  "diagnosis": "Clear interpretation — e.g. 'Low germination likely due to poor seed quality' or 'Growth inconsistency detected — possible fake seeds'",
  "action_items": ["STOP fertilizer application immediately", "Switch to short-cycle crop within 5 days"],
  "urgency": "Action required within 3-5 days. Delay may result in 60% loss.",
  "estimated_loss_if_continue_rm": 0,
  "estimated_savings_if_act_percent": 0,
  "issues": [{"type": "issue type", "description": "details"}],
  "recommendations": ["recommendation 1"],
  "rescue_crops": [{"name": "Mung Bean", "reason": "Fits remaining season window, low risk, quick harvest"}]
}`;

    // ═══════════════════════════════════════════════════════
    // 🌰 SEED SCAN PROMPT (SUPPORTING FUNCTION ONLY)
    // ═══════════════════════════════════════════════════════
    const seedPrompt = `You are an agricultural AI assistant.

Analyze the provided image of seeds before planting.

⚠️ IMPORTANT: This is a SUPPORTING function only. Visual seed inspection has LIMITED accuracy. Be honest about limitations.

Evaluate:

1. Physical Condition:
- Are seeds intact or damaged?
- Any cracks, deformities, or irregular shapes?

2. Color & Surface:
- Are there discolorations, mold, or unusual textures?

3. Consistency:
- Are seeds uniform in size and shape?

CRITICAL: State clearly that visual inspection cannot fully guarantee seed quality. Avoid overconfidence. Keep expectations realistic.

Return STRICTLY as valid JSON (no markdown, no prose):

{
  "crop_name": "${crop_name || 'unknown'}",
  "detected_crop": "what you see",
  "seed_variety": "variety if identifiable",
  "scan_mode": "seed",
  "overall_status": "healthy | warning | critical",
  "status": "healthy or anomaly",
  "seed_condition": "Healthy | Damaged | Suspicious",
  "color_abnormality": "description or None",
  "texture_abnormality": "description or None",
  "moisture_mold_indication": "description or None",
  "confidence": 0-100,
  "summary": "2-3 sentence overview",
  "diagnosis": "brief explanation",
  "disclaimer": "Visual analysis only — verify seed quality after planting. This scan provides basic visual assessment and cannot guarantee seed viability or authenticity.",
  "recommendations": ["e.g., safe to plant", "monitor closely after planting"],
  "issues": [{"type": "issue", "description": "detail"}]
}`;

    // ═══════════════════════════════════════════════════════
    // 🌾 PLANT SCAN PROMPT (SUPPORTING FUNCTION — MONITORING)
    // ═══════════════════════════════════════════════════════
    const plantPrompt = `You are an agricultural AI expert.

Analyze the provided image of growing crops (beyond seedling stage).

⚠️ This is a SUPPORTING monitoring function. Focus on practical advice, avoid overly technical explanations.

Evaluate:

1. Plant Health:
- Leaf color (yellowing, browning)
- Signs of stress or disease

2. Growth Condition:
- Are plants growing uniformly?
- Any visible stunting or overgrowth?

3. Structural Issues:
- Damaged leaves, holes, or irregular shapes

CRITICAL: Focus on practical farming advice. Be specific and actionable — never say "monitor the situation".

Return STRICTLY as valid JSON (no markdown, no prose):

{
  "crop_name": "${crop_name || 'unknown'}",
  "detected_crop": "what you see",
  "seed_variety": "variety if identifiable",
  "scan_mode": "plant",
  "overall_status": "healthy | warning | critical",
  "status": "healthy or anomaly",
  "growth_health": "Healthy | Stressed | Diseased",
  "disease_signs": "description or None detected",
  "maturity_stage": "Vegetative | Flowering | Fruiting | Mature",
  "leaf_color_status": "Normal | Yellowing | Browning | Spotting",
  "leaf_color_detail": "description",
  "height_assessment": "description",
  "confidence": 0-100,
  "summary": "2-3 sentence overview",
  "diagnosis": "brief practical explanation",
  "action_items": ["specific actionable instruction"],
  "urgency": "time window if applicable",
  "issues": [{"type": "issue", "description": "detail"}],
  "recommendations": ["practical recommendation"]
}`;

    const promptMap: Record<string, string> = {
      seedling: seedlingPrompt,
      seed: seedPrompt,
      plant: plantPrompt,
    };

    const systemPrompt = promptMap[mode] || seedlingPrompt;

    const userContent: any[] = [{ 
      type: "text", 
      text: `Analyze this image. GPS: ${gps_lat || "N/A"}, ${gps_lng || "N/A"}. Language: ${language || "en"}. ${crop_name && crop_name !== "unknown" ? `User says crop is: "${crop_name}"` : "User does not know the crop — identify it from the image."}` 
    }];
    
    if (image_base64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${image_base64}` }
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
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
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      result = {
        crop_name: crop_name || "unknown",
        scan_mode: mode,
        overall_status: "warning",
        status: "anomaly",
        germination_rate: 0,
        confidence: 0,
        summary: content.slice(0, 300) || "AI could not produce a structured analysis.",
        diagnosis: "Analysis could not be completed. Please try again with a clearer image.",
        issues: [{ type: "Parse Error", description: "AI response was not valid JSON" }],
        recommendations: ["Please try again with a clearer image"],
        rescue_crops: [{ name: "Kangkung", reason: "Quick harvest, low risk" }],
      };
    }

    // Ensure scan_mode is set
    result.scan_mode = mode;

    // Save to database
    if (!identify_only) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (user) {
          await supabase.from("scan_results").insert({
            user_id: user.id,
            crop_name: result.detected_crop || result.crop_name || crop_name || "unknown",
            status: result.status || "pending",
            germination_rate: result.germination_rate,
            confidence: result.confidence,
            gps_lat,
            gps_lng,
            ai_analysis: result,
          });

          // Generate alerts
          const scanAlerts: any[] = [];
          
          if (result.overall_status === "critical" || (result.germination_rate !== undefined && result.germination_rate < 50)) {
            scanAlerts.push({
              user_id: user.id,
              alert_type: "Crop Health",
              severity: "high",
              title: "🔴 Critical Issue Detected",
              message: result.diagnosis || `Critical issue with ${result.detected_crop || crop_name}. ${result.summary || ""}`,
            });
          } else if (result.overall_status === "warning" || (result.germination_rate !== undefined && result.germination_rate < 70)) {
            scanAlerts.push({
              user_id: user.id,
              alert_type: "Crop Health",
              severity: "medium",
              title: "🟡 Warning Detected",
              message: result.diagnosis || `Warning for ${result.detected_crop || crop_name}. ${result.summary || ""}`,
            });
          }

          if (scanAlerts.length > 0) {
            await supabase.from("alerts").insert(scanAlerts);
          }
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Scan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
