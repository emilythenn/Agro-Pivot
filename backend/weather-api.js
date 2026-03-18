// backend/weather-api.js
// Node.js backend for fetching weather data from official API

const fetch = require('node-fetch');

const BASE_URL = 'https://api.data.gov.my/weather';

async function getForecast(state, district) {
  const url = `${BASE_URL}/forecast?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`;
  const res = await fetch(url);
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
