// Node.js Express replacement for Deno Edge Function (ESM)
import express from 'express';
const router = express.Router();
import fetch from 'node-fetch';

router.post('/weather-ai', async (req, res) => {
  const { state = "Putrajaya", district = "237" } = req.body;
  try {
    const MET_TOKEN = process.env.MET_TOKEN;
    if (!MET_TOKEN) throw new Error("MET_TOKEN is not configured");
    const url = `https://api.data.gov.my/weather/forecast?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${MET_TOKEN}` }
    });
    if (!response.ok) {
      if (response.status === 429) return res.status(429).json({ error: "Rate limit exceeded" });
      if (response.status === 402) return res.status(402).json({ error: "API credits exhausted" });
      throw new Error("Weather service unavailable");
    }
    const weatherData = await response.json();
    res.json(weatherData);
  } catch (e) {
    console.error("weather-ai error:", e);
    res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

export default router;
