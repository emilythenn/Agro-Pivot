import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DISTRICT_COORDS: Record<string, [number, number]> = {
  "Kota Setar": [6.12, 100.37], "Kuala Muda": [5.75, 100.50], "Kubang Pasu": [6.44, 100.36],
  "Sik": [5.81, 100.74], "Baling": [5.67, 100.93], "Kulim": [5.38, 100.56],
  "Langkawi": [6.35, 99.73], "Yan": [5.80, 100.38], "Pendang": [5.99, 100.50],
  "Kangar": [6.44, 100.19], "Arau": [6.43, 100.27],
  "George Town": [5.41, 100.34], "Ipoh": [4.60, 101.08], "Taiping": [4.85, 100.74],
  "Kota Bharu": [6.13, 102.24], "Kuala Terengganu": [5.31, 103.13],
  "Kuantan": [3.81, 103.33], "Shah Alam": [3.07, 101.52], "Seremban": [2.73, 101.94],
  "Johor Bahru": [1.49, 103.74], "Kuching": [1.55, 110.35], "Kota Kinabalu": [5.98, 116.07],
  "Kuala Lumpur": [3.14, 101.69], "Putrajaya": [2.93, 101.69],
};

// Expiry durations per severity
const EXPIRY_DAYS: Record<string, number> = { high: 5, medium: 10, low: 14 };

// Dedup windows per severity (avoid re-creating same alert too soon)
const DEDUP_HOURS: Record<string, number> = { high: 48, medium: 72, low: 168 };

// Max active (non-expired) alerts per severity
const MAX_ACTIVE: Record<string, number> = { high: 3, medium: 5, low: 5 };

interface AlertPayload {
  user_id: string;
  title: string;
  message: string;
  alert_type: string;
  severity: "high" | "medium" | "low";
  expires_at: string;
}

function computeExpiry(severity: string): string {
  const days = EXPIRY_DAYS[severity] || 14;
  return new Date(Date.now() + days * 24 * 3600000).toISOString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("Missing Supabase config");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { user_id } = await req.json();

    // Get user profile
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user_id).single();
    if (!profile) throw new Error("User profile not found");

    // Get user settings
    const { data: settings } = await supabase.from("user_settings").select("*").eq("user_id", user_id).single();

    // Get active crops from DB
    const { data: activeCropsDb } = await supabase.from("active_crops").select("crop_name, status, water_source, drainage_condition").eq("user_id", user_id).eq("status", "active");

    const district = profile.district || "Kota Setar";
    const state = profile.state || "Malaysia";
    const coords = DISTRICT_COORDS[district] || DISTRICT_COORDS["Kota Setar"];
    const [lat, lng] = coords;

    // Build user's crop list
    const cropSet = new Set<string>();
    for (const c of (activeCropsDb || [])) cropSet.add(c.crop_name);
    if (profile.primary_crop) cropSet.add(profile.primary_crop);
    if (profile.current_crops) profile.current_crops.split(",").map((s: string) => s.trim()).filter(Boolean).forEach((c: string) => cropSet.add(c));
    if (profile.preferred_crops) profile.preferred_crops.split(",").map((s: string) => s.trim()).filter(Boolean).forEach((c: string) => cropSet.add(c));
    const userCrops = [...cropSet].join(", ");

    if (!userCrops) {
      return new Response(JSON.stringify({ total_generated: 0, new_alerts: 0, deduplicated: 0, alerts: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allAlerts: AlertPayload[] = [];

    // ─── 1. WEATHER ANALYSIS ───
    if (settings?.weather_alerts !== false) {
      try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max&timezone=Asia/Kuala_Lumpur&forecast_days=7`;
        const weatherResp = await fetch(weatherUrl);
        if (weatherResp.ok) {
          const weather = await weatherResp.json();
          const daily = weather.daily;
          let worstRainDay: { date: string; prob: number; sum: number } | null = null;
          let worstWindDay: { date: string; speed: number } | null = null;
          let worstHeatDay: { date: string; temp: number } | null = null;
          let hasThunderstorm = false;

          for (let i = 0; i < (daily?.time?.length || 0); i++) {
            const rainProb = daily.precipitation_probability_max?.[i] || 0;
            const rainSum = daily.precipitation_sum?.[i] || 0;
            const windMax = daily.wind_speed_10m_max?.[i] || 0;
            const tempMax = daily.temperature_2m_max?.[i] || 30;
            const wmoCode = daily.weather_code?.[i] || 0;

            if (rainProb >= 85 && rainSum >= 30 && (!worstRainDay || rainSum > worstRainDay.sum)) {
              worstRainDay = { date: daily.time[i], prob: rainProb, sum: rainSum };
            }
            if (windMax >= 50 && (!worstWindDay || windMax > worstWindDay.speed)) {
              worstWindDay = { date: daily.time[i], speed: windMax };
            }
            if (tempMax >= 38 && (!worstHeatDay || tempMax > worstHeatDay.temp)) {
              worstHeatDay = { date: daily.time[i], temp: tempMax };
            }
            if (wmoCode >= 95) hasThunderstorm = true;
          }

          const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" });

          // Weather thresholds:
          // 🔴 HIGH: >60mm rain, >80km/h wind, >42°C, 7/7 dry days (extreme flood/drought)
          // 🟡 MEDIUM: >30mm rain, >50km/h wind, >38°C, 5-6 dry days (above normal +10-20%)
          // 🟢 LOW: slight variation
          if (worstRainDay) {
            const sev: "high" | "medium" | "low" = worstRainDay.sum >= 60 ? "high" : worstRainDay.sum >= 30 ? "medium" : "low";
            allAlerts.push({
              user_id, alert_type: "Weather", severity: sev,
              title: `🌧️ Heavy Rain Warning — ${district}`,
              message: `Heavy rainfall on ${fmtDate(worstRainDay.date)} (${worstRainDay.prob}%, ~${Math.round(worstRainDay.sum)}mm). Protect your ${userCrops}. Action: Delay planting, check drainage.`,
              expires_at: computeExpiry(sev),
            });
          }
          if (worstWindDay) {
            const sev: "high" | "medium" = worstWindDay.speed >= 80 ? "high" : "medium";
            allAlerts.push({
              user_id, alert_type: "Weather", severity: sev,
              title: `🌪️ Storm Warning — ${district}`,
              message: `Strong winds of ${Math.round(worstWindDay.speed)} km/h on ${fmtDate(worstWindDay.date)}. Secure equipment and protect ${userCrops}.`,
              expires_at: computeExpiry(sev),
            });
          }
          if (hasThunderstorm && !worstWindDay) {
            allAlerts.push({
              user_id, alert_type: "Weather", severity: "medium",
              title: `⛈️ Severe Thunderstorm — ${district}`,
              message: `Severe thunderstorm expected this week. Protect ${userCrops} and secure all equipment.`,
              expires_at: computeExpiry("medium"),
            });
          }
          if (worstHeatDay) {
            const sev: "high" | "medium" = worstHeatDay.temp >= 42 ? "high" : "medium";
            allAlerts.push({
              user_id, alert_type: "Weather", severity: sev,
              title: `🌡️ Heat Stress — ${district}`,
              message: `Temperature spike to ${Math.round(worstHeatDay.temp)}°C on ${fmtDate(worstHeatDay.date)}. Risk to ${userCrops} — increase irrigation.`,
              expires_at: computeExpiry(sev),
            });
          }

          const dryDays = (daily?.precipitation_sum || []).filter((p: number) => p < 2).length;
          if (dryDays >= 7) {
            allAlerts.push({
              user_id, alert_type: "Weather", severity: "high",
              title: `☀️ Drought Risk — ${district}`,
              message: `Dry conditions for ${dryDays}/7 days. Your ${userCrops} need extra irrigation immediately.`,
              expires_at: computeExpiry("high"),
            });
          } else if (dryDays >= 5) {
            allAlerts.push({
              user_id, alert_type: "Weather", severity: "medium",
              title: `☀️ Drought Risk — ${district}`,
              message: `Dry conditions for ${dryDays}/7 days. Your ${userCrops} may need extra irrigation soon.`,
              expires_at: computeExpiry("medium"),
            });
          }
        }
      } catch (e) {
        console.error("Weather analysis error:", e);
      }
    }

    // ─── 2. MARKET ALERT (strict thresholds) ───
    // 🔴 HIGH: Price drop ≥ 20% — immediate action
    // 🟡 MEDIUM: Price drop 10–19% — important but not urgent
    // 🟢 LOW: Price drop < 10% but > 5%
    // < 5%: NO alert
    if (settings?.market_updates !== false) {
      try {
        const marketPrompt = `You are a Malaysian agricultural market analyst for ${district}, ${state}.
The farmer grows ONLY these crops: ${userCrops}.
STRICT RULE: Only analyze price movements for these specific crops: ${userCrops}. Do NOT mention any other crop.

REALISTIC FARMER MINDSET (CRITICAL):
- Farmers are COMMITTED to their current crops. They have already invested time, money, seeds, and labor.
- NEVER suggest "switch crops" or "consider alternative crops". That is NOT realistic.
- Instead, give PRACTICAL selling/timing advice: "Hold harvest if storage available", "Sell now before further drops", "Negotiate bulk deals", "Explore direct-to-consumer channels".
- Only mention crop pivoting if price has COLLAPSED (≥40%) AND it's the START of a new season.

STRICT SEVERITY THRESHOLDS:
- "high": Price crash ≥20% — farmer should adjust selling strategy TODAY. ONLY for ≥20% drops.
- "medium": Price change 10–19% that needs monitoring
- "low": Price fluctuation 5–10% worth being aware of
- If change <5%, return null — do NOT generate an alert

Return JSON only:
{
  "market_alert": {
    "crop": "one of: ${userCrops}",
    "severity": "high" | "medium" | "low",
    "change_percent": number,
    "title": "short title mentioning the crop name",
    "message": "practical selling/management action — NOT crop switching"
  }
}
Return ONLY the single most significant price movement for ONE of the farmer's crops. If no significant movement (>5%), return: {"market_alert": null}`;

        const marketResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: marketPrompt }] }),
        });

        if (marketResp.ok) {
          const marketData = await marketResp.json();
          let content = marketData.choices?.[0]?.message?.content || "";
          content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          try {
            const parsed = JSON.parse(content);
            const alert = parsed.market_alert;
            if (alert && alert.title) {
              const mentionedCrop = alert.crop?.toLowerCase() || "";
              const isRelevant = [...cropSet].some(c => mentionedCrop.includes(c.toLowerCase()) || c.toLowerCase().includes(mentionedCrop));
              if (isRelevant) {
                const icon = (alert.change_percent || 0) < 0 ? "📉" : "📈";
                const sev = alert.severity || "medium";
                allAlerts.push({
                  user_id, alert_type: "Market", severity: sev,
                  title: `${icon} ${alert.title}`,
                  message: alert.message,
                  expires_at: computeExpiry(sev),
                });
              }
            }
          } catch { console.error("Market JSON parse failed"); }
        }
      } catch (e) {
        console.error("Market analysis error:", e);
      }
    }

    // ─── 3. CROP ADVISORY (strict thresholds) ───
    // 🔴 HIGH: Crop failure >30%, disease outbreak, pest infestation NOW
    // 🟡 MEDIUM: Early signs of stress, nutrient deficiency
    // 🟢 LOW: Tips, minor optimization
    if (settings?.crop_advisory !== false) {
      try {
        const advisoryPrompt = `You are a Malaysian crop advisor for ${district}, ${state}.
The farmer grows ONLY: ${userCrops}.
Farm: ${profile.acreage || "unknown"} acres, ${profile.soil_type || "unknown"} soil, ${profile.irrigation_type || "unknown"} irrigation, flood risk: ${profile.flood_risk || "unknown"}, drainage: ${profile.drainage_condition || "unknown"}.
STRICT RULE: Only advise about these crops: ${userCrops}. Do NOT mention crops the farmer doesn't grow.

REALISTIC FARMER MINDSET (CRITICAL):
- The farmer has ALREADY planted these crops. They are COMMITTED.
- NEVER suggest "switch to another crop" or "consider planting X instead". That is NOT helpful mid-season.
- Give PRACTICAL management advice: watering schedules, fertilizer timing, pest treatment methods, harvest timing.
- Only mention crop abandonment if failure is truly catastrophic (>60% loss) AND the season is early enough to replant.
- Focus on SAVING what they have: "Apply fungicide within 48 hours", "Increase drainage channels", "Reduce watering frequency".

STRICT SEVERITY THRESHOLDS:
- "high": ONLY for genuine emergencies — crop failure >30%, active pest/disease outbreak destroying crops NOW. Farmer must act TODAY.
- "medium": Issue needs attention — nutrient deficiency symptoms, early pest signs, suboptimal growth
- "low": General tips, minor optimization, best-practice reminders
- Most advisories should be "medium" or "low". "high" is RARE.
- If nothing notable, return null.

Return JSON only:
{
  "crop_alert": {
    "severity": "high" | "medium" | "low",
    "title": "specific alert about one of: ${userCrops}",
    "message": "practical management advice to SAVE/OPTIMIZE their current crop — NOT switching"
  }
}
Return ONLY the single most important advisory. If nothing critical, return: {"crop_alert": null}`;

        const advResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: advisoryPrompt }] }),
        });

        if (advResp.ok) {
          const advData = await advResp.json();
          let content = advData.choices?.[0]?.message?.content || "";
          content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          try {
            const parsed = JSON.parse(content);
            const alert = parsed.crop_alert;
            if (alert && alert.title) {
              const sev = alert.severity || "medium";
              allAlerts.push({
                user_id, alert_type: "Crop Advisory", severity: sev,
                title: `🌾 ${alert.title}`,
                message: alert.message,
                expires_at: computeExpiry(sev),
              });
            }
          } catch { console.error("Advisory JSON parse failed"); }
        }
      } catch (e) {
        console.error("Crop advisory error:", e);
      }
    }

    // ─── 4. CROP HEALTH (from scans) ───
    // 🔴 HIGH: Failure >30% germination or anomaly
    // 🟡 MEDIUM: Germination 30-70%
    if (settings?.seed_scan_results !== false) {
      try {
        const { data: recentScans } = await supabase
          .from("scan_results")
          .select("*")
          .eq("user_id", user_id)
          .order("created_at", { ascending: false })
          .limit(3);

        for (const scan of (recentScans || [])) {
          if (scan.germination_rate !== null && scan.germination_rate < 50) {
            allAlerts.push({
              user_id, alert_type: "Crop Health", severity: "high",
              title: `❌ Seed Failure — ${scan.crop_name}`,
              message: `${scan.germination_rate}% germination detected. Reseed affected areas immediately with fresh batch. Check seed supplier quality and storage conditions.`,
              expires_at: computeExpiry("high"),
            });
          } else if (scan.germination_rate !== null && scan.germination_rate < 70) {
            allAlerts.push({
              user_id, alert_type: "Crop Health", severity: "medium",
              title: `⚠️ Low Germination — ${scan.crop_name}`,
              message: `${scan.germination_rate}% germination. Monitor closely and investigate seed quality.`,
              expires_at: computeExpiry("medium"),
            });
          }
          if (scan.status === "anomaly") {
            allAlerts.push({
              user_id, alert_type: "Crop Health", severity: "high",
              title: `⚠️ Anomaly — ${scan.crop_name}`,
              message: `Anomaly detected. Review scan results and take corrective action.`,
              expires_at: computeExpiry("high"),
            });
          }
        }
      } catch (e) {
        console.error("Scan analysis error:", e);
      }
    }

    // ─── 5. SMART COMBINED ALERT (max 1) ───
    const hasWeatherRisk = allAlerts.some(a => a.alert_type === "Weather" && a.severity === "high");
    const hasMarketRisk = allAlerts.some(a => a.alert_type === "Market" && a.severity === "high");
    const hasSeedRisk = allAlerts.some(a => a.alert_type === "Crop Health" && a.severity === "high");

    if (hasWeatherRisk && (hasMarketRisk || hasSeedRisk)) {
      allAlerts.push({
        user_id, alert_type: "Smart Alert", severity: "high",
        title: `🔥 Multiple Risks — ${userCrops}`,
        message: `Combined risk factors detected. Take protective action now: secure equipment, check drainage, and review your input costs. ${hasSeedRisk ? "Reseed failed areas with fresh stock if season allows." : "Adjust harvest timing and selling strategy to minimize losses."}`,
        expires_at: computeExpiry("high"),
      });
    }

    // ─── ENFORCE MAX ACTIVE COUNTS PER SEVERITY ───
    // Get current active (non-expired) alert counts per severity
    const now = new Date().toISOString();
    const { data: activeAlerts } = await supabase
      .from("alerts")
      .select("severity")
      .eq("user_id", user_id)
      .or(`expires_at.is.null,expires_at.gt.${now}`);

    const activeCounts: Record<string, number> = { high: 0, medium: 0, low: 0 };
    for (const a of (activeAlerts || [])) {
      const s = a.severity || "medium";
      activeCounts[s] = (activeCounts[s] || 0) + 1;
    }

    // Sort by priority, then cap based on remaining slots
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const sortedAlerts = allAlerts
      .sort((a, b) => (priorityOrder[a.severity] || 2) - (priorityOrder[b.severity] || 2));

    const cappedAlerts: AlertPayload[] = [];
    const newCounts: Record<string, number> = { ...activeCounts };
    for (const alert of sortedAlerts) {
      const max = MAX_ACTIVE[alert.severity] || 5;
      if ((newCounts[alert.severity] || 0) < max) {
        cappedAlerts.push(alert);
        newCounts[alert.severity] = (newCounts[alert.severity] || 0) + 1;
      }
    }

    // ─── DEDUPLICATE: Check existing alerts within severity-specific windows ───
    // Also try to UPDATE existing similar alerts instead of creating duplicates
    const dedupResults: AlertPayload[] = [];
    for (const alert of cappedAlerts) {
      const windowHours = DEDUP_HOURS[alert.severity] || 72;
      const windowStart = new Date(Date.now() - windowHours * 3600000).toISOString();

      // Check for existing alert with same title
      const { data: existing } = await supabase
        .from("alerts")
        .select("id, title, message, created_at")
        .eq("user_id", user_id)
        .eq("title", alert.title)
        .gte("created_at", windowStart)
        .limit(1);

      if (existing && existing.length > 0) {
        // Update existing alert instead of duplicating
        if (existing[0].message !== alert.message) {
          await supabase.from("alerts")
            .update({ message: alert.message, expires_at: alert.expires_at, read: false })
            .eq("id", existing[0].id);
        }
        // Skip inserting — already exists or updated
      } else {
        dedupResults.push(alert);
      }
    }

    // ─── INSERT NEW ALERTS ───
    if (dedupResults.length > 0) {
      const { error } = await supabase.from("alerts").insert(dedupResults);
      if (error) console.error("Alert insert error:", error);
    }

    return new Response(JSON.stringify({
      total_generated: cappedAlerts.length,
      new_alerts: dedupResults.length,
      updated: cappedAlerts.length - dedupResults.length,
      deduplicated: sortedAlerts.length - cappedAlerts.length,
      alerts: dedupResults,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Notification engine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
