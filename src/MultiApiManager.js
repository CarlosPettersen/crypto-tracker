const axios = require('axios');
const config = require('../config/config');

class MultiApiManager {
  constructor() {
    this.cache = new Map();
    this.lastApiCall = new Map(); // Track per API
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.cacheTimeout = 300000; // 5 minutes cache
    
    // API configurations with different rate limits
    this.apis = [
      {
        name: 'coinlore',
        baseUrl: 'https://api.coinlore.net/api',
        rateLimit: 5000, // 5 seconds
        priority: 1,
        active: true
      },
      {
        name: 'cryptocompare',
        baseUrl: 'https://min-api.cryptocompare.com/data',
        rateLimit: 10000, // 10 seconds
        priority: 2,
        active: true
      },
      {
        name: 'coingecko',
        baseUrl: 'https://api.coingecko.com/api/v3',
        rateLimit: 60000, // 60 seconds (very conservative)
        priority: 3,
        active: true
      }
    ];
    
    // Coin ID mappings between different APIs
    this.coinMappings = {
      'bitcoin': { coinlore: '90', cryptocompare: 'BTC', coingecko: 'bitcoin' },
      'ethereum': { coinlore: '80', cryptocompare: 'ETH', coingecko: 'ethereum' },
      'chainlink': { coinlore: '2751', cryptocompare: 'LINK', coingecko: 'chainlink' },
      'litecoin': { coinlore: '1', cryptocompare: 'LTC', coingecko: 'litecoin' },
      'solana': { coinlore: '48543', cryptocompare: 'SOL', coingecko: 'solana' },
      'cardano': { coinlore: '257', cryptocompare: 'ADA', coingecko: 'cardano' },
      'polkadot': { coinlore: '45219', cryptocompare: 'DOT', coingecko: 'polkadot' },
      'dogecoin': { coinlore: '2', cryptocompare: 'DOGE', coingecko: 'dogecoin' }
    };
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

  async getPrices(coinIds) {
    if (!coinIds || coinIds.length === 0) {
      return {};
    }

    // Check cache first
    const cached = await this.getCachedPrices(coinIds);
    if (cached) {
      return cached;
    }

    // Try each API in priority order
    for (const api of this.apis.filter(a => a.active)) {
      try {
        console.log(`🌐 Trying ${api.name} API for: ${coinIds.join(', ')}`);
        
        // Check rate limiting for this API
        const lastCall = this.lastApiCall.get(api.name) || 0;
        const timeSinceLastCall = Date.now() - lastCall;
        
        if (timeSinceLastCall < api.rateLimit) {
          const waitTime = api.rateLimit - timeSinceLastCall;
          console.log(`⏱️  Rate limiting ${api.name}, waiting ${Math.ceil(waitTime / 1000)}s`);
          continue; // Try next API
        }

        const data = await this.fetchFromApi(api, coinIds);
        
        if (data && Object.keys(data).length > 0) {
          this.lastApiCall.set(api.name, Date.now());
          this.setCachedPrices(coinIds, data);
          console.log(`✅ Successfully fetched prices from ${api.name}`);
          return data;
        }
        
      } catch (error) {
        console.error(`❌ ${api.name} API failed:`, error.message);
        continue; // Try next API
      }
    }

    console.error('❌ All APIs failed, returning empty data');
    return {};
  }

  async fetchFromApi(api, coinIds) {
    switch (api.name) {
      case 'coinlore':
        return await this.fetchFromCoinLore(coinIds);
      case 'cryptocompare':
        return await this.fetchFromCryptoCompare(coinIds);
      case 'coingecko':
        return await this.fetchFromCoinGecko(coinIds);
      default:
        throw new Error(`Unknown API: ${api.name}`);
    }
  }

  async fetchFromCryptoCompare(coinIds) {
    try {
      // Get symbols for CryptoCompare
      const symbols = coinIds
        .map(coinId => this.coinMappings[coinId]?.cryptocompare)
        .filter(symbol => symbol);
      
      if (symbols.length === 0) return {};
      
      const response = await axios.get('https://min-api.cryptocompare.com/data/pricemultifull', {
        params: {
          fsyms: symbols.join(','),
          tsyms: 'USD'
        },
        timeout: 15000,
        headers: { 'Accept': 'application/json' }
      });
      
      const results = {};
      const data = response.data.RAW;
      
      for (const coinId of coinIds) {
        const symbol = this.coinMappings[coinId]?.cryptocompare;
        if (symbol && data[symbol] && data[symbol].USD) {
          const coinData = data[symbol].USD;
          results[coinId] = {
            usd: coinData.PRICE,
            usd_24h_change: coinData.CHANGEPCT24HOUR,
            usd_market_cap: coinData.MKTCAP,
            usd_24h_vol: coinData.VOLUME24HOURTO
          };
        }
      }
      
      return results;
      
    } catch (error) {
      throw new Error(`CryptoCompare API error: ${error.message}`);
    }
  }

  async fetchFromCoinGecko(coinIds) {
    try {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price',
        {
          params: {
            ids: coinIds.join(','),
            vs_currencies: 'usd',
            include_24hr_change: true,
            include_market_cap: true,
            include_24hr_vol: true
          },
          timeout: 15000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'CryptoTracker/1.0'
          }
        }
      );

      const results = {};
      for (const [coinId, data] of Object.entries(response.data)) {
        if (data && typeof data.usd === 'number') {
          results[coinId] = {
            usd: data.usd,
            usd_24h_change: data.usd_24h_change || 0,
            usd_market_cap: data.usd_market_cap || 0,
            usd_24h_vol: data.usd_24h_vol || 0
          };
        }
      }
      
      return results;
      
    } catch (error) {
      if (error.response?.status === 429) {
        throw new Error('Rate limited by CoinGecko');
      }
      throw error;
    }
  }

  async fetchFromCoinLore(coinIds) {
    const results = {};
    
    // CoinLore requires individual requests
    for (const coinId of coinIds) {
      const mappedId = this.coinMappings[coinId]?.coinlore;
      if (!mappedId) continue;
      
      try {
        const response = await axios.get(`https://api.coinlore.net/api/ticker/?id=${mappedId}`, {
          timeout: 15000,
          headers: { 'Accept': 'application/json' }
        });
        
        const data = response.data[0];
        if (data) {
          results[coinId] = {
            usd: parseFloat(data.price_usd),
            usd_24h_change: parseFloat(data.percent_change_24h),
            usd_market_cap: parseFloat(data.market_cap_usd),
            usd_24h_vol: parseFloat(data.volume24)
          };
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.warn(`Failed to fetch ${coinId} from CoinLore:`, error.message);
      }
    }
    
    return results;
  }

  warmCache() {
    // Pre-populate cache with some default data
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

  clearCache() {
    this.cache.clear();
    console.log('🧹 API cache cleared');
  }

  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessingQueue,
      lastApiCalls: Object.fromEntries(this.lastApiCall),
      activeApis: this.apis.filter(a => a.active).map(a => a.name)
    };
  }

  getApiStatus() {
    return this.apis.map(api => ({
      name: api.name,
      active: api.active,
      priority: api.priority,
      rateLimit: api.rateLimit,
      lastCall: this.lastApiCall.get(api.name) || 0,
      timeSinceLastCall: Date.now() - (this.lastApiCall.get(api.name) || 0)
    }));
  }
}

module.exports = MultiApiManager;
