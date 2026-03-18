// backend/weather-api.js
// Node.js backend for fetching weather data from official API

const fetch = require('node-fetch');
require('dotenv').config();

const BASE_URL = 'https://api.met.gov.my/v2/data';
const MET_TOKEN = process.env.MET_TOKEN;

async function getForecast(state, district) {
  // Example: Putrajaya LOCATION:237, adjust as needed
  const locationId = district ? `LOCATION:${district}` : 'LOCATION:237';
  const today = new Date().toISOString().split('T')[0];
  const url = `${BASE_URL}?datasetid=FORECAST&datacategoryid=GENERAL&locationid=${locationId}&start_date=${today}&end_date=${today}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `METToken ${MET_TOKEN}`
    }
  });
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  return await res.json();
}

async function getWarnings() {
  const url = `${BASE_URL}/warning`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  return await res.json();
}

async function getEarthquakeWarnings() {
  const url = `${BASE_URL}/warning/earthquake`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  return await res.json();
}

module.exports = {
  getForecast,
  getWarnings,
  getEarthquakeWarnings,
};
