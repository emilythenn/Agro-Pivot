// backend/weather-server.cjs
// Simple Express server to expose weather API to frontend

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const { getForecast, getWarnings, getEarthquakeWarnings } = require('./weather-api.cjs');


const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json()); // Enable JSON body parsing for POST
app.use('/api', require('./routes/api.cjs'));
app.use('/api', require('./supabase/functions/market-ai/index.cjs'));
// Removed duplicate /weather-ai endpoint to avoid conflicts. Only main /weather-ai endpoint in routes/api.cjs is active.
app.use('/api', require('./supabase/functions/crop-advisory/index.cjs'));

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
