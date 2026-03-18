declare const Deno: any;
// RECOMMENDED ARCHITECTURE: Simple mock endpoint for assignment/demo
// Remove Edge Function logic for now. Use frontend direct API calls and Supabase for DB/storage.

export default async function handler(req: Request) {
  // Simple mock market data
  const data = {
    source: "mock",
    crops: [
      {
        name: "Rice",
        price: 1200,
        change: "+2%",
        weekHigh: 1250,
        weekLow: 1150,
        volume: 300,
      },
      {
        name: "Corn",
        price: 800,
        change: "-1%",
        weekHigh: 850,
        weekLow: 780,
        volume: 200,
      },
      {
        name: "Palm Oil",
        price: 3500,
        change: "+0.5%",
        weekHigh: 3600,
        weekLow: 3400,
        volume: 500,
      },
    ],
  };
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}