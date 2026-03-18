// backend/supabase/functions/market-ai/alertMarket.js
// Detects price spikes/drops and inserts alerts for users
const { insertAlert } = require('../../../lib/alertHelper');

/**
 * Detects price spikes/drops and inserts alerts for all users
 * @param {Array} newMarketData - Array of { crop, price, trend }
 * @param {Array} prevMarketData - Array of previous market data for comparison
 * @param {Array} userIds - Array of user IDs to alert
 */
async function alertMarketChanges(newMarketData, prevMarketData, userIds) {
  for (const commodity of newMarketData) {
    const prev = prevMarketData.find(c => c.crop === commodity.crop);
    if (!prev) continue;
    const priceChange = commodity.price - prev.price;
    const percentChange = (priceChange / prev.price) * 100;
    let alertType = null;
    let severity = 'medium';
    if (percentChange >= 10) {
      alertType = 'Market Spike';
      severity = 'high';
    } else if (percentChange <= -10) {
      alertType = 'Market Drop';
      severity = 'high';
    } else if (percentChange >= 5) {
      alertType = 'Market Increase';
    } else if (percentChange <= -5) {
      alertType = 'Market Decrease';
    }
    if (alertType) {
      for (const user_id of userIds) {
        await insertAlert({
          user_id,
          type: alertType,
          severity,
          title: `${commodity.crop} price ${alertType.toLowerCase()}`,
          message: `${commodity.crop} price changed by ${percentChange.toFixed(1)}% to RM${commodity.price}`
        });
      }
    }
  }
}

module.exports = { alertMarketChanges };
