// Node.js Express replacement for Deno Edge Function
const express = require('express');
const router = express.Router();


router.post('/market-ai', async (req, res) => {
  const { language = "en" } = req.body;
  try {
    const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || "f60c93c18ef64c5da68228340844a97e";
    const url = `https://api.twelvedata.com/price?symbol=KRW/USD,USD/MYR&apikey=${TWELVE_DATA_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 429) return res.status(429).json({ error: "Rate limit exceeded" });
      if (response.status === 402) return res.status(402).json({ error: "API credits exhausted" });
      throw new Error("Market service unavailable");
    }
    const marketData = await response.json();
    // Map Twelve Data response to commodities array
    const commodities = Object.entries(marketData).map(([symbol, data]) => ({
      crop: symbol,
      price: data.price,
      trend: "stable"
    }));
    res.json({ commodities });
  } catch (e) {
    console.error("market-ai error:", e);
    res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

module.exports = router;
