// Node.js Express replacement for Deno Edge Function (ESM)
import express from 'express';
const router = express.Router();
import fetch from 'node-fetch';

router.post('/crop-advisory', async (req, res) => {
  const { district = "Kedah", season = "current", language = "en" } = req.body;
  try {
    const REGIONALSOIL_API_KEY = process.env.REGIONALSOIL_API_KEY;
    if (!REGIONALSOIL_API_KEY) throw new Error("REGIONALSOIL_API_KEY is not configured");
    const url = `https://api.regionalsoil.com/advisory?district=${encodeURIComponent(district)}&season=${encodeURIComponent(season)}&lang=${language}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${REGIONALSOIL_API_KEY}` }
    });
    if (!response.ok) {
      if (response.status === 429) return res.status(429).json({ error: "Rate limit exceeded" });
      if (response.status === 402) return res.status(402).json({ error: "API credits exhausted" });
      throw new Error("Crop advisory service unavailable");
    }
    const recommendations = await response.json();
    res.json(recommendations);
  } catch (e) {
    console.error("crop-advisory error:", e);
    res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

export default router;
