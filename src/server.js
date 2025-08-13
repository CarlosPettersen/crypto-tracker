const express = require('express');
const cors = require('cors');
const path = require('path');
const CryptoTracker = require('./CryptoTracker');
const PortfolioManager = require('./PortfolioManager');
const RecommendationEngine = require('./RecommendationEngine');

class CryptoTrackerServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;
    
    // Initialize components
    this.tracker = new CryptoTracker();
    this.portfolio = new PortfolioManager();
    this.recommendations = new RecommendationEngine();
    
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
    
    // Serve React app
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../web/build/index.html'));
    });
  }

  async getWatchlist(req, res) {
    try {
      const watchlist = this.tracker.getWatchlist();
      const watchlistData = [];
      
      for (const coinId of watchlist) {
        const priceData = this.tracker.getPriceData(coinId);
        if (priceData) {
          const recommendation = this.tracker.getRecommendation(coinId, priceData.change_24h);
          watchlistData.push({
            id: coinId,
            name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
            price: priceData.price,
            change24h: priceData.change_24h,
            marketCap: priceData.market_cap,
            volume24h: priceData.volume_24h,
            recommendation: recommendation,
            timestamp: priceData.timestamp
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

      const coinIds = Array.from(holdings.keys());
      console.log('Getting prices for coins:', coinIds);
      
      const prices = await this.getCurrentPricesFixed(coinIds);
      console.log('Received prices:', Object.keys(prices));
      
      let totalValue = 0;
      let totalChange24h = 0;
      const portfolioData = [];

      for (const [coinId, holding] of holdings) {
        const priceData = prices[coinId];
        console.log(`Processing ${coinId}:`, { holding, priceData });
        
        if (priceData) {
          const currentPrice = priceData.usd || priceData.price || 0;
          const change24h = priceData.usd_24h_change || priceData.change_24h || 0;
          const holdingValue = holding.amount * currentPrice;
          const change24hValue = holdingValue * (change24h / 100);

          totalValue += holdingValue;
          totalChange24h += change24hValue;

          portfolioData.push({
            coinId,
            name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
            amount: holding.amount,
            price: currentPrice,
            value: holdingValue,
            change24h: change24h,
            change24hValue: change24hValue,
            allocation: 0 // Will be calculated after totalValue is known
          });
        } else {
          console.warn(`No price data for ${coinId}`);
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

  async getCurrentPricesFixed(coinIds) {
    try {
      const axios = require('axios');
      const config = require('../config/config');
      
      const response = await axios.get(
        `${config.API.COINGECKO_BASE_URL}/simple/price`,
        {
          params: {
            ids: coinIds.join(','),
            vs_currencies: config.API.CURRENCY,
            include_24hr_change: true
          }
        }
      );
      
      console.log('CoinGecko API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching prices:', error.message);
      return {};
    }
  }

  async updatePortfolio(req, res) {
    try {
      const { coinId, amount } = req.body;
      console.log(`Updating portfolio: ${coinId} = ${amount}`);
      
      await this.portfolio.updateHolding(coinId.toLowerCase(), parseFloat(amount));
      
      // Verify the update
      await this.portfolio.loadPortfolio();
      const holdings = this.portfolio.getHoldings();
      console.log('Portfolio after update:', Object.fromEntries(holdings));
      
      res.json({ success: true, message: `Updated ${coinId} holding to ${amount}` });
    } catch (error) {
      console.error('Error updating portfolio:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async searchCoins(req, res) {
    try {
      const { query } = req.query;
      if (!query || query.length < 2) {
        return res.json([]);
      }

      const axios = require('axios');
      const config = require('../config/config');
      
      // Get list of coins from CoinGecko
      const response = await axios.get(`${config.API.COINGECKO_BASE_URL}/coins/list`);
      const coins = response.data;
      
      // Filter coins based on query
      const filteredCoins = coins
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
      res.status(500).json({ error: error.message });
    }
  }

  async getRecommendations(req, res) {
    try {
      const watchlist = this.tracker.getWatchlist();
      const recommendations = [];
      
      for (const coinId of watchlist) {
        try {
          const analysis = await this.recommendations.analyzeAndRecommendAPI(coinId);
          if (analysis) {
            recommendations.push({
              coinId,
              name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
              ...analysis
            });
          }
        } catch (error) {
          console.error(`Error analyzing ${coinId}:`, error.message);
        }
      }
      
      res.json(recommendations);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getCoinRecommendation(req, res) {
    try {
      const { coinId } = req.params;
      const analysis = await this.recommendations.analyzeAndRecommendAPI(coinId);
      
      if (!analysis) {
        return res.status(404).json({ error: 'Analysis not available for this coin' });
      }
      
      res.json({
        coinId,
        name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
        ...analysis
      });
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
