// RECOMMENDED ARCHITECTURE: Simple mock endpoint for assignment/demo
// Remove Edge Function logic for now. Use frontend direct API calls and Supabase for DB/storage.

export default async function handler(req: Request) {
  // Simple mock weather data
  const data = {
    current: {
      temperature: 32,
      humidity: 85,
      wind_speed: 10,
      wind_direction: "North-East",
      condition: "Partly Cloudy",
      rainfall_mm: 5,
      feels_like: 36,
    },
    forecast: [
      { day: "Mon", date: "2026-03-18", icon: "\u2600\ufe0f", temp_high: 34, temp_low: 26, rain_percent: 20, wind_kmh: 10, humidity: 80, condition: "Sunny" },
      { day: "Tue", date: "2026-03-19", icon: "\ud83c\udf27\ufe0f", temp_high: 31, temp_low: 25, rain_percent: 70, wind_kmh: 12, humidity: 90, condition: "Rainy" },
      { day: "Wed", date: "2026-03-20", icon: "\u26c5", temp_high: 33, temp_low: 26, rain_percent: 30, wind_kmh: 9, humidity: 82, condition: "Cloudy" },
    ],
    alerts: [
      {
        type: "Heavy Rain",
        severity: "medium",
        message: "Possible heavy rain in the evening",
      },
    ],
  };
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}