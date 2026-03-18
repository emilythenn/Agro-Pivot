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

// In VS Code Codespace, ensure port 4000 is set to Public in the Ports tab for frontend access.
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Weather server running on port ${PORT}`);
});
