const axios = require('axios');
const chalk = require('chalk');
const config = require('../config/config');
const fs = require('fs').promises;
const path = require('path');

class CryptoTracker {
  constructor() {
    this.watchlist = [...config.COINS];
    this.priceData = new Map();
    this.priceHistory = new Map();
    this.watchlistFile = path.join(__dirname, '../data/watchlist.json');
    this.priceHistoryFile = path.join(__dirname, '../data/price_history.json');
  }

  async start() {
    // Create data directory if it doesn't exist
    await this.ensureDataDirectory();
    
    // Load saved watchlist and price history
    await this.loadWatchlist();
    await this.loadPriceHistory();
    
    // Start price tracking
    await this.updatePrices();
    
    // Set up periodic updates
    setInterval(() => {
      this.updatePrices();
    }, config.API.UPDATE_INTERVAL);
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
      const coinIds = this.watchlist.join(',');
      const response = await axios.get(
        `${config.API.COINGECKO_BASE_URL}/simple/price`,
        {
          params: {
            ids: coinIds,
            vs_currencies: config.API.CURRENCY,
            include_24hr_change: true,
            include_market_cap: true,
            include_24hr_vol: true
          }
        }
      );

      const timestamp = Date.now();
      
      for (const [coinId, data] of Object.entries(response.data)) {
        // Update current price data
        this.priceData.set(coinId, {
          ...data,
          timestamp,
          price: data[config.API.CURRENCY],
          change_24h: data[`${config.API.CURRENCY}_24h_change`],
          market_cap: data[`${config.API.CURRENCY}_market_cap`],
          volume_24h: data[`${config.API.CURRENCY}_24h_vol`]
        });

        // Update price history
        if (!this.priceHistory.has(coinId)) {
          this.priceHistory.set(coinId, []);
        }
        
        const history = this.priceHistory.get(coinId);
        history.push({
          timestamp,
          price: data[config.API.CURRENCY],
          change_24h: data[`${config.API.CURRENCY}_24h_change`]
        });

        // Keep only last 100 price points
        if (history.length > 100) {
          history.shift();
        }
      }

      await this.savePriceHistory();
      
    } catch (error) {
      console.error(chalk.red('Error updating prices:', error.message));
    }
  }

  async addCoin(coinId) {
    if (this.watchlist.includes(coinId)) {
      console.log(chalk.yellow(`${coinId} is already in your watchlist`));
      return;
    }

    // Verify coin exists
    try {
      const response = await axios.get(
        `${config.API.COINGECKO_BASE_URL}/simple/price`,
        {
          params: {
            ids: coinId,
            vs_currencies: config.API.CURRENCY
          }
        }
      );

      if (Object.keys(response.data).length === 0) {
        console.log(chalk.red(`Coin "${coinId}" not found. Please check the coin ID.`));
        return;
      }

      this.watchlist.push(coinId);
      await this.saveWatchlist();
      await this.updatePrices();
      
      console.log(chalk.green(`✅ Added ${coinId} to your watchlist`));
      
    } catch (error) {
      console.log(chalk.red(`Error adding coin: ${error.message}`));
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
