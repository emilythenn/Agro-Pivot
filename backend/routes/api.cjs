const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const malaysiaLatLon = require('../malaysiaLatLon.cjs');
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

// ...existing code...
// Weather endpoint
router.post('/weather-ai', async (req, res) => {
  console.log('[Weather API] Incoming request:', {
    method: req.method,
    headers: req.headers,
    body: req.body
  });
  // Defensive: always default to empty object
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const { state, district, date } = body;
  if (!state || !district) {
    return res.status(400).json({ error: 'Missing state or district in request body.' });
  }
  console.log('[Weather API] Received:', { state, district, date });
  try {
    const coords = malaysiaLatLon[state]?.[district];
    if (!coords) {
      console.error('[Weather API] Invalid state or district:', { state, district });
      return res.status(400).json({ error: 'Invalid state or district', received: { state, district } });
    }

    // OpenWeather One Call API (7-day forecast)
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${coords.lat}&lon=${coords.lon}&exclude=minutely,hourly,alerts&units=metric&appid=${OPENWEATHER_API_KEY}`;
    console.log('[Weather API] Fetching OpenWeather:', url);
    let data;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errText = await response.text();
        throw new Error('OpenWeather API error: ' + errText);
      }
      data = await response.json();
    } catch (err) {
      // Fallback to mock data if OpenWeather fails
      console.error('[Weather API] OpenWeather fetch failed, using mock data:', err);
      const startDate = date ? new Date(date) : new Date();
      const forecast = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        return {
          date: d.toISOString().split('T')[0],
          temp_high: 32 + Math.floor(Math.random() * 4),
          temp_low: 24 + Math.floor(Math.random() * 3),
          rain_percent: Math.floor(Math.random() * 100),
          wind_kmh: 5 + Math.floor(Math.random() * 15),
          humidity: 60 + Math.floor(Math.random() * 30),
          condition: 'Partly cloudy',
          icon: '03d',
        };
      });
      return res.json({ current: forecast[0], forecast });
    }

    // Map OpenWeather 'current' to frontend expected keys
    let current = null;
    if (data.current) {
      current = {
        temperature: data.current.temp,
        feels_like: data.current.feels_like,
        rainfall_mm: data.current.rain || 0,
        condition: data.current.weather && data.current.weather[0] ? data.current.weather[0].description : '',
        wind_speed: data.current.wind_speed,
        wind_direction: data.current.wind_deg ? `${data.current.wind_deg}°` : '',
        humidity: data.current.humidity,
      };
    } else if (data.daily && data.daily.length > 0) {
      // fallback: use first forecast day as current
      const d = data.daily[0];
      current = {
        temperature: d.temp.day,
        feels_like: d.feels_like.day,
        rainfall_mm: d.rain || 0,
        condition: d.weather && d.weather[0] ? d.weather[0].description : '',
        wind_speed: d.wind_speed,
        wind_direction: d.wind_deg ? `${d.wind_deg}°` : '',
        humidity: d.humidity,
      };
    }

    // Optionally, filter/format the forecast to start from the selected date and limit to 7 days
    res.json({ current, forecast: data.daily.slice(0, 7) });
  } catch (e) {
    console.error('[Weather API] Exception:', e);
    // Fallback to mock data if any error occurs
    const startDate = date ? new Date(date) : new Date();
    const forecast = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return {
        date: d.toISOString().split('T')[0],
        temp_high: 32 + Math.floor(Math.random() * 4),
        temp_low: 24 + Math.floor(Math.random() * 3),
        rain_percent: Math.floor(Math.random() * 100),
        wind_kmh: 5 + Math.floor(Math.random() * 15),
        humidity: 60 + Math.floor(Math.random() * 30),
        condition: 'Partly cloudy',
        icon: '03d',
      };
    });
    res.json({ current: forecast[0], forecast });
  }
});
// Add similar endpoints for market-ai and crop-advisory as needed
// Market endpoint 
router.post('/market-ai', async (req, res) => {
  try {
    const apiKey = process.env.APRIFEAKS_API_KEY;
    // Example: Replace with your real market price API endpoint
    const url = `https://api.artifacts.market/v1/prices?apikey=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Market price API error');
    const data = await response.json();
    // Assume data.commodities is the array needed by frontend, else map as needed
    res.json({ commodities: data.commodities || data });
  } catch (e) {
    // fallback to mock data if API fails
    res.json({
      commodities: [
        { crop: "Rice", price: 1200, trend: "up" },
        { crop: "Corn", price: 900, trend: "down" },
        { crop: "Palm Oil", price: 2500, trend: "stable" }
      ]
    });
  }
});

// Crop advisory endpoint 
router.post('/crop-advisory', async (req, res) => {
  res.json({
    recommendations: [
      { crop: "Rice", recommendation: "Plant now", risk: "low" },
      { crop: "Corn", recommendation: "Delay planting", risk: "medium" },
      { crop: "Palm Oil", recommendation: "Monitor for pests", risk: "high" }
    ]
  });
});

module.exports = router;
