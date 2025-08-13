module.exports = {
  // Cryptocurrencies to track
  COINS: ['bitcoin', 'ethereum', 'litecoin', 'chainlink'],
  
  // Trading thresholds (percentage changes)
  THRESHOLDS: {
    STRONG_BUY: -5,    // Buy when price drops 5% or more
    BUY: -2,           // Buy when price drops 2% or more
    SELL: 3,           // Sell when price rises 3% or more
    STRONG_SELL: 7     // Strong sell when price rises 7% or more
  },
  
  // API settings
  API: {
    COINGECKO_BASE_URL: 'https://api.coingecko.com/api/v3',
    UPDATE_INTERVAL: 30000, // 30 seconds
    CURRENCY: 'usd'
  },
  
  // Display settings
  DISPLAY: {
    SHOW_DETAILED_INFO: true,
    ALERT_SOUND: false
  }
};