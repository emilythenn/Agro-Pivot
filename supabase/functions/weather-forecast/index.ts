import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Malaysian district coordinates (lat, lng)
const DISTRICT_COORDS: Record<string, [number, number]> = {
  "Kota Setar": [6.12, 100.37],
  "Kuala Muda": [5.75, 100.50],
  "Kubang Pasu": [6.44, 100.36],
  "Padang Terap": [6.26, 100.62],
  "Sik": [5.81, 100.74],
  "Baling": [5.67, 100.93],
  "Bandar Baharu": [5.14, 100.47],
  "Kulim": [5.38, 100.56],
  "Langkawi": [6.35, 99.73],
  "Yan": [5.80, 100.38],
  "Pokok Sena": [6.02, 100.38],
  "Pendang": [5.99, 100.50],
  // Perlis
  "Kangar": [6.44, 100.19],
  "Arau": [6.43, 100.27],
  // Penang
  "George Town": [5.41, 100.34],
  "Balik Pulau": [5.34, 100.23],
  "Seberang Perai Utara": [5.51, 100.44],
  "Seberang Perai Tengah": [5.36, 100.41],
  "Seberang Perai Selatan": [5.20, 100.48],
  // Perak
  "Ipoh": [4.60, 101.08],
  "Taiping": [4.85, 100.74],
  "Teluk Intan": [4.02, 101.02],
  "Manjung": [4.20, 100.66],
  "Kuala Kangsar": [4.77, 100.94],
  "Kampar": [4.31, 101.15],
  "Gerik": [5.44, 101.12],
  // Kelantan
  "Kota Bharu": [6.13, 102.24],
  "Pasir Mas": [6.05, 102.14],
  "Tumpat": [6.20, 102.17],
  "Bachok": [6.07, 102.40],
  "Tanah Merah": [5.81, 102.15],
  "Machang": [5.76, 102.22],
  "Kuala Krai": [5.53, 102.20],
  "Gua Musang": [4.88, 101.97],
  // Terengganu
  "Kuala Terengganu": [5.31, 103.13],
  "Kemaman": [4.23, 103.42],
  "Dungun": [4.76, 103.42],
  "Besut": [5.83, 102.55],
  "Marang": [5.21, 103.21],
  "Hulu Terengganu": [5.06, 103.00],
  "Setiu": [5.53, 102.72],
  // Pahang
  "Kuantan": [3.81, 103.33],
  "Temerloh": [3.45, 102.42],
  "Bentong": [3.52, 101.91],
  "Raub": [3.79, 101.86],
  "Jerantut": [3.94, 102.36],
  "Lipis": [4.19, 101.94],
  "Cameron Highlands": [4.47, 101.38],
  "Rompin": [2.81, 103.49],
  "Pekan": [3.49, 103.40],
  // Selangor
  "Shah Alam": [3.07, 101.52],
  "Petaling Jaya": [3.11, 101.64],
  "Klang": [3.04, 101.45],
  "Subang Jaya": [3.06, 101.59],
  "Ampang": [3.15, 101.77],
  "Sepang": [2.69, 101.74],
  "Hulu Langat": [3.11, 101.85],
  "Hulu Selangor": [3.56, 101.65],
  "Kuala Selangor": [3.35, 101.26],
  "Sabak Bernam": [3.81, 101.03],
  "Gombak": [3.25, 101.73],
  // Negeri Sembilan
  "Seremban": [2.73, 101.94],
  "Port Dickson": [2.52, 101.80],
  "Jelebu": [2.96, 102.06],
  "Kuala Pilah": [2.74, 102.25],
  "Tampin": [2.47, 102.23],
  "Rembau": [2.59, 102.09],
  "Jempol": [2.83, 102.40],
  // Melaka
  "Melaka Tengah": [2.19, 102.25],
  "Alor Gajah": [2.38, 102.14],
  "Jasin": [2.31, 102.43],
  // Johor
  "Johor Bahru": [1.49, 103.74],
  "Batu Pahat": [1.85, 102.93],
  "Kluang": [2.03, 103.32],
  "Muar": [2.04, 102.57],
  "Pontian": [1.49, 103.39],
  "Segamat": [2.51, 102.82],
  "Kota Tinggi": [1.74, 103.90],
  "Mersing": [2.43, 103.84],
  "Kulai": [1.66, 103.60],
  "Tangkak": [2.27, 102.55],
  // Sabah
  "Kota Kinabalu": [5.98, 116.07],
  "Sandakan": [5.84, 118.12],
  "Tawau": [4.24, 117.89],
  "Lahad Datu": [5.03, 118.33],
  "Keningau": [5.34, 116.16],
  "Beaufort": [5.35, 115.75],
  "Ranau": [5.96, 116.67],
  "Kudat": [6.88, 116.85],
  // Sarawak
  "Kuching": [1.55, 110.35],
  "Sibu": [2.30, 111.83],
  "Miri": [4.40, 114.01],
  "Bintulu": [3.17, 113.04],
  "Sri Aman": [1.24, 111.46],
  "Sarikei": [2.13, 111.52],
  "Limbang": [4.75, 115.01],
  // KL & Putrajaya
  "Kuala Lumpur": [3.14, 101.69],
  "Putrajaya": [2.93, 101.69],
  "Labuan": [5.28, 115.24],
};

// WMO weather code to condition/icon mapping
function wmoToCondition(code: number): { condition: string; icon: string } {
  if (code === 0) return { condition: "Clear Sky", icon: "☀️" };
  if (code <= 3) return { condition: "Partly Cloudy", icon: "⛅" };
  if (code <= 48) return { condition: "Foggy", icon: "🌫️" };
  if (code <= 55) return { condition: "Drizzle", icon: "🌦️" };
  if (code <= 57) return { condition: "Freezing Drizzle", icon: "🌧️" };
  if (code <= 65) return { condition: "Rain", icon: "🌧️" };
  if (code <= 67) return { condition: "Freezing Rain", icon: "🌧️" };
  if (code <= 77) return { condition: "Snow", icon: "❄️" };
  if (code <= 82) return { condition: "Heavy Rain", icon: "🌧️" };
  if (code <= 86) return { condition: "Snow Showers", icon: "❄️" };
  if (code === 95) return { condition: "Thunderstorm", icon: "⛈️" };
  if (code <= 99) return { condition: "Thunderstorm with Hail", icon: "⛈️" };
  return { condition: "Unknown", icon: "🌤️" };
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { district, user_id } = await req.json();
    const districtName = district || "Kota Setar";

    // Find coordinates — fallback to Kota Setar
    const coords = DISTRICT_COORDS[districtName] || DISTRICT_COORDS["Kota Setar"];
    const [lat, lng] = coords;

    // Fetch real weather from Open-Meteo (free, no API key) with retry
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,relative_humidity_2m_mean&timezone=Asia/Kuala_Lumpur&forecast_days=7`;

    let raw: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const resp = await fetch(url);
        if (resp.ok) {
          raw = await resp.json();
          break;
        }
        const t = await resp.text();
        console.error(`Open-Meteo attempt ${attempt + 1} error:`, resp.status, t.slice(0, 200));
      } catch (e) {
        console.error(`Open-Meteo attempt ${attempt + 1} fetch error:`, e);
      }
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }

    // Fallback if all retries fail
    if (!raw) {
      console.warn("All Open-Meteo retries failed, returning fallback data");
      const fallbackForecast = [];
      const now = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        fallbackForecast.push({
          day: i === 0 ? "Today" : i === 1 ? "Tomorrow" : DAY_NAMES[d.getDay()],
          date: d.toLocaleDateString("en-MY", { day: "numeric", month: "short" }),
          condition: "Partly Cloudy",
          icon: "⛅",
          temp_high: 33,
          temp_low: 25,
          rain_percent: 40,
          wind_kmh: 12,
          humidity: 78,
        });
      }
      return new Response(JSON.stringify({
        current: { temperature: 31, feels_like: 34, humidity: 78, rainfall_mm: 0, wind_speed: 12, wind_direction: "SW", condition: "Partly Cloudy" },
        forecast: fallbackForecast,
        alerts: [],
        fallback: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build current weather
    const currentWmo = wmoToCondition(raw.current?.weather_code ?? 0);
    const windDeg = raw.current?.wind_direction_10m ?? 0;
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const windDir = dirs[Math.round(windDeg / 45) % 8];

    const current = {
      temperature: Math.round(raw.current?.temperature_2m ?? 30),
      feels_like: Math.round(raw.current?.apparent_temperature ?? 32),
      humidity: Math.round(raw.current?.relative_humidity_2m ?? 80),
      rainfall_mm: Math.round((raw.current?.precipitation ?? 0) * 10) / 10,
      wind_speed: Math.round(raw.current?.wind_speed_10m ?? 10),
      wind_direction: windDir,
      condition: currentWmo.condition,
    };

    // Build 7-day forecast
    const forecast = (raw.daily?.time || []).map((dateStr: string, i: number) => {
      const d = new Date(dateStr);
      const dayLabel = i === 0 ? "Today" : i === 1 ? "Tomorrow" : DAY_NAMES[d.getDay()];
      const dateLabel = d.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
      const wmo = wmoToCondition(raw.daily.weather_code?.[i] ?? 0);

      return {
        day: dayLabel,
        date: dateLabel,
        condition: wmo.condition,
        icon: wmo.icon,
        temp_high: Math.round(raw.daily.temperature_2m_max?.[i] ?? 33),
        temp_low: Math.round(raw.daily.temperature_2m_min?.[i] ?? 24),
        rain_percent: Math.round(raw.daily.precipitation_probability_max?.[i] ?? 0),
        wind_kmh: Math.round(raw.daily.wind_speed_10m_max?.[i] ?? 10),
        humidity: Math.round(raw.daily.relative_humidity_2m_mean?.[i] ?? 80),
      };
    });

    // Generate alerts for high rain probability
    const alerts: { type: string; message: string; severity: string }[] = [];
    for (const day of forecast) {
      if (day.rain_percent >= 80) {
        alerts.push({
          type: "Heavy Rain Warning",
          message: `${day.rain_percent}% chance of heavy rain on ${day.date} (${day.day}). Take precautions for crops.`,
          severity: day.rain_percent >= 90 ? "high" : "medium",
        });
      }
      if (day.wind_kmh >= 50) {
        alerts.push({
          type: "Strong Wind Warning",
          message: `Strong winds of ${day.wind_kmh} km/h expected on ${day.date} (${day.day}). Secure equipment and protect crops.`,
          severity: "high",
        });
      }
    }

    // Insert alerts into database if user_id is provided
    if (user_id && alerts.length > 0) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (SUPABASE_URL && SERVICE_ROLE_KEY) {
        try {
          const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
          // Check for recent duplicates
          const { data: existing } = await supabase
            .from("alerts")
            .select("title")
            .eq("user_id", user_id)
            .gte("created_at", new Date(Date.now() - 6 * 3600000).toISOString());
          const existingTitles = new Set((existing || []).map((a: any) => a.title));

          const newAlerts = alerts
            .filter(a => !existingTitles.has(`🌧️ ${a.type}`))
            .map(a => ({
              user_id,
              alert_type: "Weather",
              severity: a.severity,
              title: `🌧️ ${a.type}`,
              message: a.message,
            }));

          if (newAlerts.length > 0) {
            await supabase.from("alerts").insert(newAlerts);
          }
        } catch (e) {
          console.error("Weather alert insert error:", e);
        }
      }
    }

    return new Response(JSON.stringify({ current, forecast, alerts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Weather error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
