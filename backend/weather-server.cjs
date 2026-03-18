// backend/weather-server.cjs
// Simple Express server to expose weather API to frontend

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const { getForecast, getWarnings, getEarthquakeWarnings } = require('./weather-api.cjs');


const app = express();
app.use(cors());
app.use(express.json()); // Enable JSON body parsing for POST

// Health check root endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Weather API server is running.' });
});
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

// POST endpoint for weather-ai (real fetch)
app.post('/weather-ai', async (req, res) => {
  const { state, district } = req.body;
  try {
    const apiKey = process.env.MET_TOKEN;
    const url = `https://api.data.gov.my/weather/forecast?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!response.ok) throw new Error(`Weather API error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const fetch = require('node-fetch');

// POST endpoint for market-ai (real fetch)
app.post('/market-ai', async (req, res) => {
  const { language } = req.body;
  try {
    const apiKey = process.env.APRIFEAKS_API_KEY;
    const url = `https://api.aprifeaks.com/market?lang=${language}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!response.ok) throw new Error(`Market API error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST endpoint for crop-advisory (real fetch)
app.post('/crop-advisory', async (req, res) => {
  const { district, season, language } = req.body;
  try {
    const apiKey = process.env.REGIONALSOIL_API_KEY;
    const url = `https://api.regionalsoil.com/advisory?district=${encodeURIComponent(district)}&season=${encodeURIComponent(season)}&lang=${language}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!response.ok) throw new Error(`Crop Advisory API error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Weather server running on port ${PORT}`);
});
