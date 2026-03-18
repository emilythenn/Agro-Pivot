declare const Deno: any;
// RECOMMENDED ARCHITECTURE: Simple mock endpoint for assignment/demo
// Remove Edge Function logic for now. Use frontend direct API calls and Supabase for DB/storage.

export default async function handler(req: Request) {
  // Simple mock crop advisory data
  const data = {
    source: "mock",
    district: "Kedah",
    season: "current",
    recommendations: [
      {
        crop: "Rice",
        advice:
          "Suitable for current season. Ensure proper irrigation and monitor pests.",
      },
      {
        crop: "Corn",
        advice:
          "Moderate suitability. Use fertilizer and ensure good drainage.",
      },
      {
        crop: "Chili",
        advice:
          "High market demand. Requires careful pest control and watering.",
      },
    ],
    soil: {
      type: "Clay Loam",
      moisture: "Moderate",
      fertility: "Good",
    },
    weather: {
      condition: "Humid",
      recommendation: "Ensure proper drainage to avoid waterlogging.",
    },
  };
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}