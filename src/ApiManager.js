const axios = require('axios');
const config = require('../config/config');

class ApiManager {
  constructor() {
    this.cache = new Map();
    this.lastApiCall = 0;
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.minInterval = 60000; // 60 seconds between API calls (increased from 30s)
    this.cacheTimeout = 300000; // 5 minutes cache (increased from 1 minute)
  }

  async getCachedPrices(coinIds) {
    const cacheKey = coinIds.sort().join(',');
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`📦 Using cached prices for: ${coinIds.join(', ')}`);
      return cached.data;
    }
    
    return null;
  }

  setCachedPrices(coinIds, data) {
    const cacheKey = coinIds.sort().join(',');
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  async queueApiRequest(coinIds) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        coinIds,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      
      try {
        // Check cache first
        const cached = await this.getCachedPrices(request.coinIds);
        if (cached) {
          request.resolve(cached);
          continue;
        }

        // Rate limiting
        const now = Date.now();
        const timeSinceLastCall = now - this.lastApiCall;
        
        if (timeSinceLastCall < this.minInterval) {
          const waitTime = this.minInterval - timeSinceLastCall;
          console.log(`⏱️  Rate limiting API call, waiting ${Math.ceil(waitTime / 1000)}s`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        // Make the API call
        const data = await this.makeApiCall(request.coinIds);
        
        // Cache the result
        this.setCachedPrices(request.coinIds, data);
        
        // Update last call time
        this.lastApiCall = Date.now();
        
        request.resolve(data);
        
        // Add a small delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error('API request failed:', error.message);
        request.reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  async makeApiCall(coinIds) {
    let retries = 3;
    let delay = 10000; // Start with 10 second delay (increased from 5s)

    while (retries > 0) {
      try {
        console.log(`🌐 Fetching prices from CoinGecko for: ${coinIds.join(', ')}`);
        
        const response = await axios.get(
          `${config.API.COINGECKO_BASE_URL}/simple/price`,
          {
            params: {
              ids: coinIds.join(','),
              vs_currencies: config.API.CURRENCY.toLowerCase(),
              include_24hr_change: true
            },
            timeout: 30000,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'CryptoTracker/1.0'
            }
          }
        );

        console.log(`✅ Successfully fetched prices for ${Object.keys(response.data).length} coins`);
        
        // Validate response data
        const validData = {};
        for (const [coinId, data] of Object.entries(response.data)) {
          if (data && typeof data.usd === 'number') {
            validData[coinId] = data;
          } else {
            console.warn(`⚠️  Invalid price data for ${coinId}:`, data);
          }
        }

        return validData;

      } catch (error) {
        retries--;
        
        if (error.response?.status === 429) {
          console.error(`🚫 Rate limited (429) - ${retries} retries left`);
          if (retries > 0) {
            console.log(`⏳ Backing off for ${delay / 1000}s before retry`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 3; // More aggressive exponential backoff
            continue;
          }
        } else if (error.code === 'ECONNABORTED') {
          console.error(`⏰ Request timeout - ${retries} retries left`);
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          }
        } else {
          console.error('🔥 API Error:', error.message);
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          }
        }
      }
    }

    console.error('❌ All API retries exhausted');
    throw new Error('API request failed after all retries');
  }

  async getPrices(coinIds) {
    if (!coinIds || coinIds.length === 0) {
      return {};
    }

    try {
      return await this.queueApiRequest(coinIds);
    } catch (error) {
      console.error('Failed to get prices:', error.message);
      return {};
    }
  }

  clearCache() {
    this.cache.clear();
    console.log('🧹 API cache cleared');
  }

  warmCache() {
    // Pre-populate cache with some default data to provide immediate response
    const defaultCoins = ['bitcoin', 'ethereum', 'chainlink', 'solana', 'litecoin'];
    const mockData = {};
    
    defaultCoins.forEach(coinId => {
      mockData[coinId] = {
        usd: 0,
        usd_24h_change: 0,
        _cached: true,
        _note: 'Cached data - will update shortly'
      };
    });
    
    this.setCachedPrices(defaultCoins, mockData);
    console.log('🔥 Cache warmed with default data');
  }

  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessingQueue,
      lastApiCall: this.lastApiCall
    };
  }
}

module.exports = ApiManager;
