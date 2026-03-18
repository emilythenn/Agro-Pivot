const express = require('express');
const router = express.Router();
const WeatherModel = require('../models/WeatherModel.cjs');
const fetch = require('node-fetch');

// ...existing code...
// Weather endpoint
router.post('/weather-ai', async (req, res) => {
  const { state, district } = req.body;
  try {
    const apiKey = process.env.MET_TOKEN;
    const url = `https://api.data.gov.my/weather/forecast?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!response.ok) throw new Error(`Weather API error: ${response.status}`);
    const data = await response.json();
    const weather = new WeatherModel({ state, district, forecast: data });
    res.json(weather);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// Add similar endpoints for market-ai and crop-advisory as needed

module.exports = router;
