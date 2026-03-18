// Node.js Express replacement for Deno Edge Function (ESM)
import express from 'express';
const router = express.Router();
import fetch from 'node-fetch';

router.post('/market-ai', async (req, res) => {
  const { language = "en" } = req.body;
  try {
    const APRIFEAKS_API_KEY = process.env.APRIFEAKS_API_KEY;
    if (!APRIFEAKS_API_KEY) throw new Error("APRIFEAKS_API_KEY is not configured");
    const url = `https://api.aprifeaks.com/market?lang=${language}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${APRIFEAKS_API_KEY}` }
    });
    if (!response.ok) {
      if (response.status === 429) return res.status(429).json({ error: "Rate limit exceeded" });
      if (response.status === 402) return res.status(402).json({ error: "API credits exhausted" });
      throw new Error("Market service unavailable");
    }
    const marketData = await response.json();
    res.json(marketData);
  } catch (e) {
    console.error("market-ai error:", e);
    res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

export default router;
