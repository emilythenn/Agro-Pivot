// backend/weather-server.mjs
// Simple Express server to expose weather API to frontend (ESM)

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import { getForecast, getWarnings, getEarthquakeWarnings } from './weather-api.cjs';

import apiRouter from './routes/api.mjs';
import marketAiRouter from './supabase/functions/market-ai/index.mjs';
import weatherAiRouter from './supabase/functions/weather-ai/index.mjs';
import cropAdvisoryRouter from './supabase/functions/crop-advisory/index.mjs';

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json()); // Enable JSON body parsing for POST
app.use('/api', apiRouter);
app.use('/api', marketAiRouter);
app.use('/api', weatherAiRouter);
app.use('/api', cropAdvisoryRouter);

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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Weather server running on port ${PORT}`);
});
