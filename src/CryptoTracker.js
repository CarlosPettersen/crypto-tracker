const axios = require('axios');
const chalk = require('chalk');
const config = require('../config/config');
const fs = require('fs').promises;
const path = require('path');

class CryptoTracker {
  constructor(apiManager = null) {
    this.watchlist = [...config.COINS];
    this.priceData = new Map();
    this.priceHistory = new Map();
    this.watchlistFile = path.join(__dirname, '../data/watchlist.json');
    this.priceHistoryFile = path.join(__dirname, '../data/price_history.json');
    this.apiManager = apiManager; // Use centralized API manager if provided
    this.lastApiCall = 0;
    this.minApiInterval = 60000; // Minimum 60 seconds between API calls (increased from 30s)
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  async start() {
    // Create data directory if it doesn't exist
    await this.ensureDataDirectory();
    
    // Load saved watchlist and price history
    await this.loadWatchlist();
    await this.loadPriceHistory();
    
    // Start price tracking with initial delay
    setTimeout(() => {
      this.updatePrices();
    }, 2000);
    
    // Set up periodic updates with longer interval to avoid rate limits
    setInterval(() => {
      this.updatePrices();
    }, Math.max(config.API.UPDATE_INTERVAL, 120000)); // Minimum 2 minutes (increased from 60s)
  }

  async ensureDataDirectory() {
    const dataDir = path.join(__dirname, '../data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  async loadWatchlist() {
    try {
      const data = await fs.readFile(this.watchlistFile, 'utf8');
      this.watchlist = JSON.parse(data);
    } catch (error) {
      // File doesn't exist, use default watchlist
      await this.saveWatchlist();
    }
  }

  async saveWatchlist() {
    try {
      await fs.writeFile(this.watchlistFile, JSON.stringify(this.watchlist, null, 2));
    } catch (error) {
      console.error('Error saving watchlist:', error.message);
    }
  }

  async loadPriceHistory() {
    try {
      const data = await fs.readFile(this.priceHistoryFile, 'utf8');
      const historyData = JSON.parse(data);
      this.priceHistory = new Map(Object.entries(historyData));
    } catch (error) {
      // File doesn't exist, start with empty history
    }
  }

  async savePriceHistory() {
    try {
      const historyObj = Object.fromEntries(this.priceHistory);
      await fs.writeFile(this.priceHistoryFile, JSON.stringify(historyObj, null, 2));
    } catch (error) {
      console.error('Error saving price history:', error.message);
    }
  }

  async updatePrices() {
    if (this.watchlist.length === 0) return;

    try {
      console.log(chalk.blue(`Fetching prices for: ${this.watchlist.join(', ')}`));
      
      let priceResponse;
      
      if (this.apiManager) {
        // Use centralized API manager
        priceResponse = await this.apiManager.getPrices(this.watchlist);
      } else {
        // Fallback to direct API call with rate limiting
        const now = Date.now();
        const timeSinceLastCall = now - this.lastApiCall;
        
        if (timeSinceLastCall < this.minApiInterval) {
          console.log(chalk.yellow(`Rate limiting: waiting ${Math.ceil((this.minApiInterval - timeSinceLastCall) / 1000)}s before next API call`));
          return;
        }
        
        this.lastApiCall = now;
        
        const response = await axios.get(
          `${config.API.COINGECKO_BASE_URL}/simple/price`,
          {
            params: {
              ids: this.watchlist.join(','),
              vs_currencies: config.API.CURRENCY,
              include_24hr_change: true,
              include_market_cap: true,
              include_24hr_vol: true
            },
            timeout: 30000,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'CryptoTracker/1.0'
            }
          }
        );
        
        priceResponse = response.data;
      }

      const timestamp = Date.now();
      let updatedCount = 0;
      
      for (const [coinId, data] of Object.entries(priceResponse)) {
        // Handle both API manager format and direct API format
        const price = data.usd || data[config.API.CURRENCY];
        const change24h = data.usd_24h_change || data[`${config.API.CURRENCY}_24h_change`];
        const marketCap = data.usd_market_cap || data[`${config.API.CURRENCY}_market_cap`];
        const volume24h = data.usd_24h_vol || data[`${config.API.CURRENCY}_24h_vol`];
        
        if (price) {
          // Update current price data
          this.priceData.set(coinId, {
            ...data,
            timestamp,
            price,
            change_24h: change24h,
            market_cap: marketCap,
            volume_24h: volume24h
          });

          // Update price history
          if (!this.priceHistory.has(coinId)) {
            this.priceHistory.set(coinId, []);
          }
          
          const history = this.priceHistory.get(coinId);
          history.push({
            timestamp,
            price,
            change_24h: change24h
          });

          // Keep only last 100 price points
          if (history.length > 100) {
            history.shift();
          }
          
          updatedCount++;
        }
      }

      await this.savePriceHistory();
      
      // Reset retry count on success
      this.retryCount = 0;
      
      console.log(chalk.green(`✅ Updated prices for ${updatedCount} coins`));
      
    } catch (error) {
      this.handleApiError(error);
    }
  }

  handleApiError(error) {
    if (error.response) {
      const status = error.response.status;
      const statusText = error.response.statusText;
      
      switch (status) {
        case 429:
          this.retryCount++;
          const backoffTime = Math.min(60000 * Math.pow(2, this.retryCount), 300000); // Max 5 minutes
          console.log(chalk.yellow(`⚠️  Rate limited (429). Backing off for ${backoffTime / 1000}s (attempt ${this.retryCount}/${this.maxRetries})`));
          
          if (this.retryCount < this.maxRetries) {
            setTimeout(() => {
              this.updatePrices();
            }, backoffTime);
          } else {
            console.log(chalk.red(`❌ Max retries reached. Will try again on next scheduled update.`));
            this.retryCount = 0;
          }
          break;
          
        case 403:
          console.log(chalk.red(`❌ API access forbidden (403). Check if API key is needed.`));
          break;
          
        case 404:
          console.log(chalk.red(`❌ API endpoint not found (404). Check API URL.`));
          break;
          
        default:
          console.log(chalk.red(`❌ API error ${status}: ${statusText}`));
      }
    } else if (error.code === 'ECONNABORTED') {
      console.log(chalk.yellow(`⚠️  Request timeout. Will retry on next update.`));
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.log(chalk.red(`❌ Network error: ${error.message}`));
    } else {
      console.log(chalk.red(`❌ Unexpected error: ${error.message}`));
    }
  }

  async addCoin(coinId) {
    if (this.watchlist.includes(coinId)) {
      console.log(chalk.yellow(`${coinId} is already in your watchlist`));
      return;
    }

    // Verify coin exists with rate limiting
    const now = Date.now();
    if (now - this.lastApiCall < this.minApiInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minApiInterval - (now - this.lastApiCall)));
    }

    try {
      this.lastApiCall = Date.now();
      
      const response = await axios.get(
        `${config.API.COINGECKO_BASE_URL}/simple/price`,
        {
          params: {
            ids: coinId,
            vs_currencies: config.API.CURRENCY
          },
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'CryptoTracker/1.0'
          }
        }
      );

      if (Object.keys(response.data).length === 0) {
        console.log(chalk.red(`Coin "${coinId}" not found. Please check the coin ID.`));
        return;
      }

      this.watchlist.push(coinId);
      await this.saveWatchlist();
      
      // Update prices after a short delay
      setTimeout(() => {
        this.updatePrices();
      }, 2000);
      
      console.log(chalk.green(`✅ Added ${coinId} to your watchlist`));
      
    } catch (error) {
      if (error.response?.status === 429) {
        console.log(chalk.yellow(`⚠️  Rate limited while adding coin. Try again in a moment.`));
      } else {
        console.log(chalk.red(`Error adding coin: ${error.message}`));
      }
    }
  }

  async removeCoin(coinId) {
    const index = this.watchlist.indexOf(coinId);
    if (index === -1) {
      console.log(chalk.yellow(`${coinId} is not in your watchlist`));
      return;
    }

    this.watchlist.splice(index, 1);
    this.priceData.delete(coinId);
    this.priceHistory.delete(coinId);
    
    await this.saveWatchlist();
    await this.savePriceHistory();
    
    console.log(chalk.green(`✅ Removed ${coinId} from your watchlist`));
  }

  async displayWatchlist() {
    if (this.watchlist.length === 0) {
      console.log(chalk.yellow('Your watchlist is empty. Add some coins to get started!'));
      return;
    }

    console.log(chalk.blue.bold('\n📊 Your Crypto Watchlist'));
    console.log(chalk.gray('─'.repeat(80)));

    for (const coinId of this.watchlist) {
      const data = this.priceData.get(coinId);
      if (!data) {
        console.log(chalk.gray(`${coinId}: Loading...`));
        continue;
      }

      const price = data.price.toFixed(6);
      const change = data.change_24h;
      const changeColor = change >= 0 ? chalk.green : chalk.red;
      const changeSymbol = change >= 0 ? '+' : '';
      
      // Get recommendation
      const recommendation = this.getRecommendation(coinId, change);
      const recColor = this.getRecommendationColor(recommendation);

      console.log(
        `${chalk.white.bold(coinId.toUpperCase().padEnd(12))} ` +
        `$${chalk.yellow(price.padStart(12))} ` +
        `${changeColor(changeSymbol + change.toFixed(2) + '%').padStart(10)} ` +
        `${recColor(recommendation.padStart(12))}`
      );
    }

    console.log(chalk.gray('─'.repeat(80)));
    console.log(chalk.gray(`Last updated: ${new Date().toLocaleTimeString()}`));
    
    // Show rate limit status
    const timeSinceLastCall = Date.now() - this.lastApiCall;
    const nextUpdateIn = Math.max(0, this.minApiInterval - timeSinceLastCall);
    if (nextUpdateIn > 0) {
      console.log(chalk.gray(`Next update available in: ${Math.ceil(nextUpdateIn / 1000)}s`));
    }
  }

  getRecommendation(coinId, change24h) {
    const thresholds = config.THRESHOLDS;
    
    if (change24h <= thresholds.STRONG_BUY) return 'STRONG BUY';
    if (change24h <= thresholds.BUY) return 'BUY';
    if (change24h >= thresholds.STRONG_SELL) return 'STRONG SELL';
    if (change24h >= thresholds.SELL) return 'SELL';
    return 'HOLD';
  }

  getRecommendationColor(recommendation) {
    switch (recommendation) {
      case 'STRONG BUY': return chalk.green.bold;
      case 'BUY': return chalk.green;
      case 'HOLD': return chalk.yellow;
      case 'SELL': return chalk.red;
      case 'STRONG SELL': return chalk.red.bold;
      default: return chalk.white;
    }
  }

  getWatchlist() {
    return this.watchlist;
  }

  getPriceData(coinId) {
    return this.priceData.get(coinId);
  }

  getPriceHistory(coinId) {
    return this.priceHistory.get(coinId) || [];
  }
}

module.exports = CryptoTracker;
