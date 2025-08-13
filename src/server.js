const express = require('express');
const cors = require('cors');
const path = require('path');
const CryptoTracker = require('./CryptoTracker');
const PortfolioManager = require('./PortfolioManager');
const RecommendationEngine = require('./RecommendationEngine');
const MultiApiManager = require('./MultiApiManager');

class CryptoTrackerServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;
    
    // Initialize multi-API manager
    this.apiManager = new MultiApiManager();
    
    // Initialize components with API manager
    this.tracker = new CryptoTracker(this.apiManager);
    this.portfolio = new PortfolioManager();
    this.recommendations = new RecommendationEngine(this.apiManager);
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../web/build')));
  }

  setupRoutes() {
    // API Routes
    this.app.get('/api/watchlist', this.getWatchlist.bind(this));
    this.app.post('/api/watchlist', this.addToWatchlist.bind(this));
    this.app.delete('/api/watchlist/:coinId', this.removeFromWatchlist.bind(this));
    
    this.app.get('/api/portfolio', this.getPortfolio.bind(this));
    this.app.post('/api/portfolio', this.updatePortfolio.bind(this));
    
    this.app.get('/api/recommendations', this.getRecommendations.bind(this));
    this.app.get('/api/recommendations/:coinId', this.getCoinRecommendation.bind(this));
    this.app.get('/api/portfolio/optimization', this.getPortfolioOptimization.bind(this));
    
    // New endpoint for coin search
    this.app.get('/api/coins/search', this.searchCoins.bind(this));
    
    // API status endpoint for debugging
    this.app.get('/api/status', this.getApiStatus.bind(this));
    
    // Cache management endpoints
    this.app.post('/api/cache/clear', this.clearCache.bind(this));
    
    // Serve React app
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../web/build/index.html'));
    });
  }

  async getWatchlist(req, res) {
    try {
      const watchlist = this.tracker.getWatchlist();
      
      if (watchlist.length === 0) {
        return res.json([]);
      }
      
      // Get prices using the API manager
      const prices = await this.apiManager.getPrices(watchlist);
      const watchlistData = [];
      
      for (const coinId of watchlist) {
        const priceData = prices[coinId];
        
        if (priceData) {
          const price = priceData.usd || 0;
          const change24h = priceData.usd_24h_change || 0;
          const recommendation = this.tracker.getRecommendation(coinId, change24h);
          
          watchlistData.push({
            id: coinId,
            name: this.formatCoinName(coinId),
            price: price,
            change24h: change24h,
            marketCap: priceData.usd_market_cap || 0,
            volume24h: priceData.usd_24h_vol || 0,
            recommendation: recommendation,
            timestamp: Date.now()
          });
        } else {
          // Include coin even without price data
          watchlistData.push({
            id: coinId,
            name: this.formatCoinName(coinId),
            price: 0,
            change24h: 0,
            marketCap: 0,
            volume24h: 0,
            recommendation: 'HOLD',
            timestamp: Date.now(),
            unavailable: true
          });
        }
      }
      
      res.json(watchlistData);
    } catch (error) {
      console.error('Error getting watchlist:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async addToWatchlist(req, res) {
    try {
      const { coinId } = req.body;
      await this.tracker.addCoin(coinId.toLowerCase());
      res.json({ success: true, message: `Added ${coinId} to watchlist` });
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async removeFromWatchlist(req, res) {
    try {
      const { coinId } = req.params;
      await this.tracker.removeCoin(coinId.toLowerCase());
      res.json({ success: true, message: `Removed ${coinId} from watchlist` });
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async getPortfolio(req, res) {
    try {
      await this.portfolio.loadPortfolio();
      const holdings = this.portfolio.getHoldings();
      
      console.log('Portfolio holdings loaded:', holdings.size);
      
      if (holdings.size === 0) {
        return res.json({ 
          holdings: [], 
          totalValue: 0, 
          totalChange24h: 0, 
          totalChangePercent: 0 
        });
      }

      // Validate and clean holdings data
      const validHoldings = new Map();
      for (const [coinId, holding] of holdings) {
        if (holding && typeof holding.amount === 'number' && holding.amount > 0) {
          validHoldings.set(coinId, holding);
        } else {
          console.warn(`Invalid holding data for ${coinId}:`, holding);
        }
      }

      if (validHoldings.size === 0) {
        return res.json({ 
          holdings: [], 
          totalValue: 0, 
          totalChange24h: 0, 
          totalChangePercent: 0 
        });
      }

      const coinIds = Array.from(validHoldings.keys());
      console.log('Getting prices for valid coins:', coinIds);
      
      const prices = await this.apiManager.getPrices(coinIds);
      console.log('Received prices:', Object.keys(prices));
      
      let totalValue = 0;
      let totalChange24h = 0;
      const portfolioData = [];

      for (const [coinId, holding] of validHoldings) {
        const priceData = prices[coinId];
        console.log(`Processing ${coinId}:`, { holding, priceData });
        
        if (priceData && priceData.usd) {
          const currentPrice = priceData.usd;
          const change24h = priceData.usd_24h_change || 0;
          const holdingValue = holding.amount * currentPrice;
          const change24hValue = holdingValue * (change24h / 100);

          totalValue += holdingValue;
          totalChange24h += change24hValue;

          portfolioData.push({
            coinId,
            name: this.formatCoinName(coinId),
            amount: holding.amount,
            price: currentPrice,
            value: holdingValue,
            change24h: change24h,
            change24hValue: change24hValue,
            allocation: 0 // Will be calculated after totalValue is known
          });
        } else {
          console.warn(`No valid price data for ${coinId}, keeping in portfolio but showing as unavailable`);
          // Keep the coin in portfolio but show as unavailable
          portfolioData.push({
            coinId,
            name: this.formatCoinName(coinId),
            amount: holding.amount,
            price: 0,
            value: 0,
            change24h: 0,
            change24hValue: 0,
            allocation: 0,
            unavailable: true
          });
        }
      }

      // Calculate allocations
      portfolioData.forEach(item => {
        item.allocation = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
      });

      // Sort by value (highest first)
      portfolioData.sort((a, b) => b.value - a.value);

      const totalChangePercent = totalValue > 0 ? (totalChange24h / (totalValue - totalChange24h)) * 100 : 0;

      const result = {
        holdings: portfolioData,
        totalValue,
        totalChange24h,
        totalChangePercent
      };
      
      console.log('Sending portfolio response:', result);
      res.json(result);
    } catch (error) {
      console.error('Error getting portfolio:', error);
      res.status(500).json({ error: error.message });
    }
  }

  formatCoinName(coinId) {
    const nameMap = {
      'bitcoin': 'Bitcoin',
      'ethereum': 'Ethereum',
      'cardano': 'Cardano',
      'chainlink': 'Chainlink',
      'solana': 'Solana',
      'polkadot': 'Polkadot',
      'dogecoin': 'Dogecoin',
      'avalanche-2': 'Avalanche',
      'polygon': 'Polygon',
      'uniswap': 'Uniswap'
    };
    return nameMap[coinId] || coinId.charAt(0).toUpperCase() + coinId.slice(1);
  }

  async updatePortfolio(req, res) {
    try {
      const { coinId, amount } = req.body;
      
      // Validate input
      if (!coinId || typeof coinId !== 'string') {
        return res.status(400).json({ error: 'Invalid coin ID' });
      }
      
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount < 0) {
        return res.status(400).json({ error: 'Invalid amount - must be a positive number' });
      }
      
      console.log(`Updating portfolio: ${coinId} = ${numAmount}`);
      
      // Load current portfolio first
      await this.portfolio.loadPortfolio();
      
      // Update the holding
      await this.portfolio.updateHolding(coinId.toLowerCase(), numAmount);
      
      // Verify the update by reloading
      await this.portfolio.loadPortfolio();
      const holdings = this.portfolio.getHoldings();
      console.log('Portfolio after update:', Object.fromEntries(holdings));
      
      // Check if the update was successful
      const updatedHolding = holdings.get(coinId.toLowerCase());
      if (numAmount > 0 && (!updatedHolding || updatedHolding.amount !== numAmount)) {
        throw new Error('Portfolio update verification failed');
      }
      
      res.json({ 
        success: true, 
        message: numAmount > 0 
          ? `Updated ${coinId} holding to ${numAmount}` 
          : `Removed ${coinId} from portfolio`
      });
    } catch (error) {
      console.error('Error updating portfolio:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async getApiStatus(req, res) {
    try {
      const stats = this.apiManager.getCacheStats();
      const apiStatus = this.apiManager.getApiStatus();
      
      res.json({
        apiManager: stats,
        apis: apiStatus,
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Error getting API status:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async clearCache(req, res) {
    try {
      this.apiManager.clearCache();
      res.json({ success: true, message: 'Cache cleared successfully' });
    } catch (error) {
      console.error('Error clearing cache:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async searchCoins(req, res) {
    try {
      const { query } = req.query;
      if (!query || query.length < 2) {
        return res.json([]);
      }

      // Use cached coin list if available and recent (cache for 1 hour)
      const now = Date.now();
      if (!this.coinListCache || !this.coinListCacheTime || (now - this.coinListCacheTime) > 3600000) {
        console.log('Fetching fresh coin list from CoinGecko...');
        
        const axios = require('axios');
        const config = require('../config/config');
        
        // Rate limiting for coin list API
        if (!this.lastCoinListApiCall) this.lastCoinListApiCall = 0;
        const timeSinceLastCall = now - this.lastCoinListApiCall;
        const minInterval = 30000; // 30 seconds minimum for coin list
        
        if (timeSinceLastCall < minInterval) {
          console.log(`Rate limiting coin list API call, waiting ${Math.ceil((minInterval - timeSinceLastCall) / 1000)}s`);
          await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastCall));
        }
        
        this.lastCoinListApiCall = Date.now();
        
        try {
          const response = await axios.get(`${config.API.COINGECKO_BASE_URL}/coins/list`, {
            timeout: 15000,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'CryptoTracker/1.0'
            }
          });
          
          this.coinListCache = response.data;
          this.coinListCacheTime = now;
          console.log(`Cached ${this.coinListCache.length} coins`);
        } catch (error) {
          if (error.response?.status === 429) {
            console.log('Rate limited while fetching coin list, using fallback');
            // Return popular coins as fallback
            return res.json([
              { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
              { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
              { id: 'cardano', name: 'Cardano', symbol: 'ADA' },
              { id: 'solana', name: 'Solana', symbol: 'SOL' },
              { id: 'polkadot', name: 'Polkadot', symbol: 'DOT' },
              { id: 'chainlink', name: 'Chainlink', symbol: 'LINK' },
              { id: 'litecoin', name: 'Litecoin', symbol: 'LTC' },
              { id: 'avalanche-2', name: 'Avalanche', symbol: 'AVAX' }
            ].filter(coin => 
              coin.id.toLowerCase().includes(query.toLowerCase()) ||
              coin.name.toLowerCase().includes(query.toLowerCase()) ||
              coin.symbol.toLowerCase().includes(query.toLowerCase())
            ));
          }
          throw error;
        }
      }
      
      // Filter coins based on query
      const filteredCoins = this.coinListCache
        .filter(coin => 
          coin.id.toLowerCase().includes(query.toLowerCase()) ||
          coin.name.toLowerCase().includes(query.toLowerCase()) ||
          coin.symbol.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 20) // Limit to 20 results
        .map(coin => ({
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol.toUpperCase()
        }));

      res.json(filteredCoins);
    } catch (error) {
      console.error('Error searching coins:', error);
      if (error.response?.status === 429) {
        res.status(429).json({ error: 'Rate limited. Please try again in a moment.' });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async getRecommendations(req, res) {
    try {
      // Load portfolio and get holdings
      await this.portfolio.loadPortfolio();
      const holdings = this.portfolio.getHoldings();
      const portfolioCoins = Array.from(holdings.keys());
      
      if (portfolioCoins.length === 0) {
        return res.json([]);
      }
      
      console.log(`Getting recommendations for portfolio coins: ${portfolioCoins.join(', ')}`);
      
      // Use the updated getDetailedRecommendations method with portfolio coins
      const recommendations = await this.recommendations.getDetailedRecommendations(portfolioCoins);
      
      res.json(recommendations);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getCoinRecommendation(req, res) {
    try {
      const { coinId } = req.params;
      const analysis = await this.recommendations.analyzeAndRecommend(coinId);
      
      if (!analysis) {
        return res.status(404).json({ error: 'Analysis not available for this coin' });
      }
      
      res.json(analysis);
    } catch (error) {
      console.error('Error getting coin recommendation:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getPortfolioOptimization(req, res) {
    try {
      const allocations = await this.portfolio.getPortfolioAllocation();
      const totalValue = await this.portfolio.getPortfolioValue();
      
      if (allocations.size === 0) {
        return res.json({ 
          suggestions: [],
          riskLevel: 'UNKNOWN',
          totalValue: 0
        });
      }

      const sortedAllocations = Array.from(allocations.entries())
        .sort((a, b) => b[1] - a[1]);
      
      const suggestions = [];
      
      // Check for over-concentration
      const overConcentrated = sortedAllocations.filter(([_, percentage]) => percentage > 40);
      overConcentrated.forEach(([coinId, percentage]) => {
        suggestions.push({
          type: 'warning',
          message: `Consider reducing ${coinId.toUpperCase()} position (currently ${percentage.toFixed(1)}%)`,
          coinId,
          currentAllocation: percentage,
          suggestedAllocation: Math.min(percentage, 30)
        });
      });
      
      // Suggest diversification
      if (allocations.size < 5) {
        suggestions.push({
          type: 'info',
          message: 'Consider diversifying into more assets for better risk management',
          currentAssets: allocations.size,
          suggestedAssets: 5
        });
      }
      
      // Calculate target allocation
      const targetAllocation = this.calculateTargetAllocation(sortedAllocations);
      
      targetAllocation.forEach(([coinId, targetPercentage]) => {
        const currentPercentage = allocations.get(coinId) || 0;
        const difference = targetPercentage - currentPercentage;
        
        if (Math.abs(difference) > 2) {
          suggestions.push({
            type: 'rebalance',
            message: `${difference > 0 ? 'BUY' : 'SELL'} ${coinId.toUpperCase()}`,
            coinId,
            currentAllocation: currentPercentage,
            suggestedAllocation: targetPercentage,
            difference: Math.abs(difference),
            action: difference > 0 ? 'BUY' : 'SELL'
          });
        }
      });
      
      const riskLevel = this.assessPortfolioRisk(allocations);
      
      res.json({
        suggestions,
        riskLevel,
        totalValue,
        currentAllocation: sortedAllocations,
        targetAllocation
      });
    } catch (error) {
      console.error('Error getting portfolio optimization:', error);
      res.status(500).json({ error: error.message });
    }
  }

  calculateTargetAllocation(currentAllocations) {
    const targetAllocations = [];
    let remainingPercentage = 100;
    
    for (const [coinId, currentPercentage] of currentAllocations) {
      const targetPercentage = Math.min(currentPercentage, 30);
      targetAllocations.push([coinId, targetPercentage]);
      remainingPercentage -= targetPercentage;
    }
    
    if (remainingPercentage > 0) {
      const redistributionFactor = remainingPercentage / targetAllocations.length;
      for (let i = 0; i < targetAllocations.length; i++) {
        targetAllocations[i][1] += redistributionFactor;
      }
    }
    
    return targetAllocations;
  }

  assessPortfolioRisk(allocations) {
    const maxAllocation = Math.max(...allocations.values());
    const numAssets = allocations.size;
    
    if (maxAllocation > 50 || numAssets < 3) return 'HIGH';
    if (maxAllocation > 35 || numAssets < 5) return 'MEDIUM';
    return 'LOW';
  }

  async start() {
    // Warm the API cache to provide immediate responses
    this.apiManager.warmCache();
    
    // Initialize tracker
    await this.tracker.start();
    
    // Start server
    this.app.listen(this.port, () => {
      console.log(`🚀 Crypto Tracker Server running on http://localhost:${this.port}`);
      console.log(`📊 API available at http://localhost:${this.port}/api`);
    });
  }
}

// Add API method to RecommendationEngine
if (!require('./RecommendationEngine').prototype.analyzeAndRecommendAPI) {
  const RecommendationEngine = require('./RecommendationEngine');
  
  RecommendationEngine.prototype.analyzeAndRecommendAPI = async function(coinId) {
    try {
      const currentData = await this.getCurrentMarketData(coinId);
      const historicalData = await this.getHistoricalData(coinId, 30);
      
      if (!currentData || !historicalData) {
        return null;
      }

      const indicators = this.calculateTechnicalIndicators(historicalData);
      const recommendation = this.generateRecommendation(currentData, indicators);
      
      return {
        currentData,
        indicators,
        recommendation
      };
    } catch (error) {
      console.error(`Error analyzing ${coinId}:`, error.message);
      return null;
    }
  };
}

module.exports = CryptoTrackerServer;

// Start server if this file is run directly
if (require.main === module) {
  const server = new CryptoTrackerServer();
  server.start().catch(console.error);
}
