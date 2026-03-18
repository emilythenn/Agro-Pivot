// backend/weather-server.js
// Simple Express server to expose weather API to frontend

const express = require('express');
const cors = require('cors');
const { getForecast, getWarnings, getEarthquakeWarnings } = require('./weather-api');

const app = express();
app.use(cors());

app.get('/weather/forecast', async (req, res) => {
  const { state, district } = req.query;
  try {
    const data = await getForecast(state, district);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/weather/warning', async (req, res) => {
  try {
    const data = await getWarnings();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/weather/warning/earthquake', async (req, res) => {
  try {
    const data = await getEarthquakeWarnings();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// Mock weather-ai endpoint
app.get('/weather-ai', (req, res) => {
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
  res.json(data);
});

// Mock market-ai endpoint
app.get('/market-ai', (req, res) => {
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
  res.json(data);
});

// Mock crop-advisory endpoint
app.get('/crop-advisory', (req, res) => {
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
  res.json(data);
});

// In VS Code Codespace, ensure port 4000 is set to Public in the Ports tab for frontend access.
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Weather server running on port ${PORT}`);
});
