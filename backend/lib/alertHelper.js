// backend/lib/alertHelper.js
// Helper to insert alerts into Supabase from Node.js backend
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase URL and Service Role Key must be set in environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Insert a new alert for a user
 * @param {Object} alert
 * @param {string} alert.user_id
 * @param {string} alert.type
 * @param {string} alert.severity
 * @param {string} alert.title
 * @param {string} alert.message
 */
async function insertAlert(alert) {
  const { data, error } = await supabase.from('alerts').insert([alert]);
  if (error) throw error;
  return data;
}

module.exports = { insertAlert };
