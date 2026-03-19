const FRONTEND_ORIGIN = process.env.COMMODITY_FRONTEND_ORIGIN || 'https://symmetrical-guide-x5prw74947q4h5p7-8080.app.github.dev';
// backend/commodity-server.cjs
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();

const app = express();
const allowedOrigins = (process.env.COMMODITY_FRONTEND_ORIGIN || 'https://symmetrical-guide-x5prw74947q4h5p7-8080.app.github.dev').split(',');
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
const PORT = 4001;
const API_NINJAS_KEY = process.env.API_NINJAS_KEY || 'YOUR_API_NINJAS_KEY';

app.use(express.json());

// GET endpoint for real commodity price
app.get('/api/commodity', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
    const cropSymbols = ['corn', 'wheat', 'coffee', 'soybean', 'rice', 'cocoa', 'cotton', 'sugar', 'gold', 'silver'];
    try {
      const results = await Promise.all(cropSymbols.map(async (symbol) => {
        const url = `https://api.api-ninjas.com/v1/commodityprice?symbol=${symbol}`;
        try {
          const response = await fetch(url, {
            headers: { 'X-Api-Key': API_NINJAS_KEY }
          });
          if (!response.ok) {
            console.error(`Failed to fetch ${symbol}: ${response.status} ${response.statusText}`);
            return null;
          }
          const data = await response.json();
          const item = Array.isArray(data) ? data[0] : data;
          if (!item) {
            console.error(`No data for ${symbol}`);
            return null;
          }
          return { symbol: item.symbol, price: item.price, unit: item.unit, change: item.change || 0, trend: item.change > 0 ? 'up' : item.change < 0 ? 'down' : 'stable' };
        } catch (err) {
          console.error(`Error fetching ${symbol}:`, err);
          return null;
        }
      }));
      const commodities = results.filter(Boolean);
      if (commodities.length === 0) {
        console.error('No commodity data returned from API Ninjas. Check API key and rate limits.');
      }
      res.json({ commodities });
    } catch (e) {
      console.error('Commodity fetch error:', e);
      res.status(500).json({ error: e.message });
    }
});

// ...existing code...

// POST endpoint for frontend compatibility
app.post('/api/commodity', async (req, res) => {
  const cropSymbols = ['corn', 'wheat', 'coffee', 'soybean', 'rice', 'cocoa', 'cotton', 'sugar', 'gold', 'silver'];
  try {
    const results = await Promise.all(cropSymbols.map(async (symbol) => {
      const url = `https://api.api-ninjas.com/v1/commodityprice?symbol=${symbol}`;
      const response = await fetch(url, {
        headers: { 'X-Api-Key': API_NINJAS_KEY }
      });
      if (!response.ok) return null;
      const data = await response.json();
      const item = Array.isArray(data) ? data[0] : data;
      return item ? { symbol: item.symbol, price: item.price, unit: item.unit, change: item.change || 0, trend: item.change > 0 ? 'up' : item.change < 0 ? 'down' : 'stable' } : null;
    }));
    const commodities = results.filter(Boolean);
    res.json({ commodities });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Commodity backend running on http://localhost:${PORT}`);
});
