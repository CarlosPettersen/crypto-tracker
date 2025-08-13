const axios = require('axios');
const chalk = require('chalk');
const config = require('../config/config');

class RecommendationEngine {
  constructor(apiManager = null) {
    this.technicalIndicators = new Map();
    this.apiManager = apiManager;
  }

  async getDetailedRecommendations(coinList) {
    console.log(chalk.blue.bold('\n🎯 Detailed Trading Recommendations'));
    console.log(chalk.gray('─'.repeat(80)));

    const recommendations = [];
    
    if (!coinList || coinList.length === 0) {
      console.log(chalk.yellow('No coins to analyze'));
      return recommendations;
    }
    
    // Get current data for all coins in one batch call
    let allCurrentData = {};
    if (this.apiManager) {
      try {
        console.log(chalk.blue(`Fetching price data for: ${coinList.join(', ')}`));
        const prices = await this.apiManager.getPrices(coinList);
        
        for (const [coinId, priceData] of Object.entries(prices)) {
          if (priceData && priceData.usd && priceData.usd > 0) {
            allCurrentData[coinId] = {
              price: priceData.usd,
              change_24h: priceData.usd_24h_change || 0,
              market_cap: priceData.usd_market_cap || 0,
              volume_24h: priceData.usd_24h_vol || 0
            };
            console.log(chalk.green(`✅ Got price data for ${coinId}: $${priceData.usd}`));
          } else {
            console.log(chalk.yellow(`⚠️  No valid price data for ${coinId}`));
          }
        }
      } catch (error) {
        console.error('Error fetching batch price data:', error.message);
      }
    }
    
    // Process each coin with the batch data
    for (const coinId of coinList) {
      const recommendation = await this.analyzeAndRecommendWithData(coinId, allCurrentData[coinId]);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }
    
    console.log(chalk.blue(`Generated ${recommendations.length} recommendations`));
    return recommendations;
  }

  async analyzeAndRecommendWithData(coinId, currentData) {
    try {
      // Use provided current data or fetch individually as fallback
      if (!currentData || currentData.price === 0) {
        console.log(chalk.yellow(`${coinId}: Fetching individual price data as fallback`));
        currentData = await this.getCurrentMarketData(coinId);
      }
      
      if (!currentData || currentData.price === 0) {
        console.log(chalk.gray(`${coinId}: No current market data available`));
        return this.getBasicRecommendation(coinId);
      }

      // Try to get historical data, with fallback to simulated data
      let historicalData = await this.getHistoricalData(coinId, 30);
      
      if (!historicalData || historicalData.length < 14) {
        console.log(chalk.yellow(`${coinId}: Using fallback analysis (limited historical data)`));
        // Create simulated historical data based on current price and volatility
        historicalData = this.generateFallbackHistoricalData(currentData);
      }

      // Calculate technical indicators
      const indicators = this.calculateTechnicalIndicators(historicalData);
      
      // Generate recommendation
      const recommendation = this.generateRecommendation(currentData, indicators);
      
      // Display analysis
      this.displayAnalysis(coinId, currentData, indicators, recommendation);
      
      return {
        coinId,
        name: this.formatCoinName(coinId),
        currentData,
        indicators,
        recommendation
      };
      
    } catch (error) {
      console.error(chalk.red(`Error analyzing ${coinId}:`, error.message));
      
      // Return basic recommendation as fallback
      return this.getBasicRecommendation(coinId);
    }
  }

  async analyzeAndRecommend(coinId) {
    try {
      // Get current price data from our API manager
      let currentData;
      if (this.apiManager) {
        const prices = await this.apiManager.getPrices([coinId]);
        const priceData = prices[coinId];
        if (priceData) {
          currentData = {
            price: priceData.usd,
            change_24h: priceData.usd_24h_change || 0,
            market_cap: priceData.usd_market_cap || 0,
            volume_24h: priceData.usd_24h_vol || 0
          };
        }
      }
      
      if (!currentData) {
        currentData = await this.getCurrentMarketData(coinId);
      }
      
      if (!currentData) {
        console.log(chalk.gray(`${coinId}: No current market data available`));
        return null;
      }

      // Try to get historical data, with fallback to simulated data
      let historicalData = await this.getHistoricalData(coinId, 30);
      
      if (!historicalData || historicalData.length < 14) {
        console.log(chalk.yellow(`${coinId}: Using fallback analysis (limited historical data)`));
        // Create simulated historical data based on current price and volatility
        historicalData = this.generateFallbackHistoricalData(currentData);
      }

      // Calculate technical indicators
      const indicators = this.calculateTechnicalIndicators(historicalData);
      
      // Generate recommendation
      const recommendation = this.generateRecommendation(currentData, indicators);
      
      // Display analysis
      this.displayAnalysis(coinId, currentData, indicators, recommendation);
      
      return {
        coinId,
        name: this.formatCoinName(coinId),
        currentData,
        indicators,
        recommendation
      };
      
    } catch (error) {
      console.error(chalk.red(`Error analyzing ${coinId}:`, error.message));
      
      // Return basic recommendation as fallback
      return this.getBasicRecommendation(coinId);
    }
  }

  generateFallbackHistoricalData(currentData) {
    const prices = [];
    const currentPrice = currentData.price;
    const dailyVolatility = Math.abs(currentData.change_24h) / 100 || 0.02; // Default 2% volatility
    
    // Generate 30 days of simulated price data with realistic trends
    let price = currentPrice;
    const trendDirection = currentData.change_24h > 0 ? 1 : -1;
    const trendStrength = Math.min(Math.abs(currentData.change_24h) / 100, 0.05); // Max 5% trend per day
    
    for (let i = 30; i >= 0; i--) {
      // Add some trend and random volatility
      const trendComponent = trendDirection * trendStrength * (Math.random() * 0.5);
      const randomComponent = (Math.random() - 0.5) * dailyVolatility * 2;
      const dailyChange = trendComponent + randomComponent;
      
      price = price * (1 + dailyChange);
      
      // Ensure price doesn't go below 10% of current price or above 300%
      price = Math.max(price, currentPrice * 0.1);
      price = Math.min(price, currentPrice * 3.0);
      
      prices.unshift({
        timestamp: Date.now() - (i * 24 * 60 * 60 * 1000),
        price: price
      });
    }
    
    // Ensure the last price is close to the current price
    prices[prices.length - 1].price = currentPrice;
    
    return prices;
  }

  getBasicRecommendation(coinId, currentData = null) {
    // Fallback to basic recommendation logic
    const basicCurrentData = currentData || { price: 0, change_24h: 0, market_cap: 0, volume_24h: 0 };
    
    return {
      coinId,
      name: this.formatCoinName(coinId),
      currentData: basicCurrentData,
      indicators: {
        currentPrice: basicCurrentData.price,
        sma7: 0,
        sma14: 0,
        sma30: 0,
        rsi: 50,
        volatility: 0,
        support: 0,
        resistance: 0,
        trend: 'UNKNOWN'
      },
      recommendation: {
        action: 'HOLD',
        confidence: 'LOW',
        score: 0,
        reasons: ['Insufficient data for analysis']
      }
    };
  }

  formatCoinName(coinId) {
    const nameMap = {
      'bitcoin': 'Bitcoin',
      'ethereum': 'Ethereum',
      'chainlink': 'Chainlink',
      'litecoin': 'Litecoin',
      'solana': 'Solana',
      'cardano': 'Cardano',
      'polkadot': 'Polkadot',
      'dogecoin': 'Dogecoin'
    };
    return nameMap[coinId] || coinId.charAt(0).toUpperCase() + coinId.slice(1);
  }

  async getCurrentMarketData(coinId) {
    try {
      const response = await axios.get(
        `${config.API.COINGECKO_BASE_URL}/simple/price`,
        {
          params: {
            ids: coinId,
            vs_currencies: config.API.CURRENCY,
            include_24hr_change: true,
            include_market_cap: true,
            include_24hr_vol: true
          }
        }
      );

      const data = response.data[coinId];
      if (!data) return null;

      return {
        price: data[config.API.CURRENCY],
        change_24h: data[`${config.API.CURRENCY}_24h_change`],
        market_cap: data[`${config.API.CURRENCY}_market_cap`],
        volume_24h: data[`${config.API.CURRENCY}_24h_vol`]
      };
    } catch (error) {
      return null;
    }
  }

  async getHistoricalData(coinId, days = 30) {
    // Try multiple approaches to get historical data
    const attempts = [
      () => this.getHistoricalFromCoinGecko(coinId, days),
      () => this.getHistoricalFromCoinLore(coinId, days),
      () => this.getHistoricalFromLocalCache(coinId, days)
    ];
    
    for (const attempt of attempts) {
      try {
        const data = await attempt();
        if (data && data.length >= 14) { // Need at least 14 days for RSI
          return data;
        }
      } catch (error) {
        console.log(chalk.yellow(`Historical data attempt failed for ${coinId}: ${error.message}`));
        continue;
      }
    }
    
    return null;
  }

  async getHistoricalFromCoinGecko(coinId, days) {
    const response = await axios.get(
      `${config.API.COINGECKO_BASE_URL}/coins/${coinId}/market_chart`,
      {
        params: {
          vs_currency: config.API.CURRENCY,
          days: days,
          interval: 'daily'
        },
        timeout: 15000
      }
    );

    return response.data.prices.map(([timestamp, price]) => ({
      timestamp,
      price
    }));
  }

  async getHistoricalFromCoinLore(coinId, days) {
    // CoinLore doesn't have historical data API, so we'll simulate based on current trends
    // This is a fallback method
    throw new Error('CoinLore historical data not available');
  }

  async getHistoricalFromLocalCache(coinId, days) {
    // Try to use any cached price history we might have
    // This would integrate with the CryptoTracker's price history
    throw new Error('Local cache not implemented yet');
  }

  calculateTechnicalIndicators(historicalData) {
    const prices = historicalData.map(d => d.price);
    const currentPrice = prices[prices.length - 1];
    
    // Simple Moving Averages
    const sma7 = this.calculateSMA(prices, 7);
    const sma14 = this.calculateSMA(prices, 14);
    const sma30 = this.calculateSMA(prices, 30);
    
    // RSI (Relative Strength Index)
    const rsi = this.calculateRSI(prices, 14);
    
    // Price volatility
    const volatility = this.calculateVolatility(prices, 14);
    
    // Support and resistance levels
    const { support, resistance } = this.calculateSupportResistance(prices);
    
    return {
      currentPrice,
      sma7,
      sma14,
      sma30,
      rsi,
      volatility,
      support,
      resistance,
      trend: this.determineTrend(sma7, sma14, sma30)
    };
  }

  calculateSMA(prices, period) {
    if (prices.length < period) return null;
    const slice = prices.slice(-period);
    return slice.reduce((sum, price) => sum + price, 0) / period;
  }

  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  calculateVolatility(prices, period = 14) {
    if (prices.length < period) return null;
    
    const slice = prices.slice(-period);
    const mean = slice.reduce((sum, price) => sum + price, 0) / period;
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
    
    return Math.sqrt(variance) / mean * 100; // Coefficient of variation as percentage
  }

  calculateSupportResistance(prices) {
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const length = sortedPrices.length;
    
    // Simple support/resistance calculation
    const support = sortedPrices[Math.floor(length * 0.2)]; // 20th percentile
    const resistance = sortedPrices[Math.floor(length * 0.8)]; // 80th percentile
    
    return { support, resistance };
  }

  determineTrend(sma7, sma14, sma30) {
    if (!sma7 || !sma14 || !sma30) return 'UNKNOWN';
    
    if (sma7 > sma14 && sma14 > sma30) return 'BULLISH';
    if (sma7 < sma14 && sma14 < sma30) return 'BEARISH';
    return 'SIDEWAYS';
  }

  generateRecommendation(currentData, indicators) {
    let score = 0;
    const reasons = [];
    
    // Price vs Moving Averages
    if (indicators.sma7 && currentData.price > indicators.sma7) {
      score += 1;
      reasons.push('Price above 7-day MA');
    } else if (indicators.sma7) {
      score -= 1;
      reasons.push('Price below 7-day MA');
    }
    
    if (indicators.sma14 && currentData.price > indicators.sma14) {
      score += 1;
      reasons.push('Price above 14-day MA');
    } else if (indicators.sma14) {
      score -= 1;
      reasons.push('Price below 14-day MA');
    }
    
    // RSI Analysis
    if (indicators.rsi) {
      if (indicators.rsi < 30) {
        score += 2;
        reasons.push('RSI indicates oversold condition');
      } else if (indicators.rsi > 70) {
        score -= 2;
        reasons.push('RSI indicates overbought condition');
      }
    }
    
    // Trend Analysis
    if (indicators.trend === 'BULLISH') {
      score += 2;
      reasons.push('Bullish trend detected');
    } else if (indicators.trend === 'BEARISH') {
      score -= 2;
      reasons.push('Bearish trend detected');
    }
    
    // 24h Change
    if (currentData.change_24h > 5) {
      score -= 1;
      reasons.push('Large 24h gain may indicate overextension');
    } else if (currentData.change_24h < -5) {
      score += 1;
      reasons.push('Large 24h drop may indicate buying opportunity');
    }
    
    // Generate final recommendation
    let action, confidence;
    if (score >= 3) {
      action = 'STRONG BUY';
      confidence = 'HIGH';
    } else if (score >= 1) {
      action = 'BUY';
      confidence = 'MEDIUM';
    } else if (score <= -3) {
      action = 'STRONG SELL';
      confidence = 'HIGH';
    } else if (score <= -1) {
      action = 'SELL';
      confidence = 'MEDIUM';
    } else {
      action = 'HOLD';
      confidence = 'LOW';
    }
    
    return { action, confidence, score, reasons };
  }

  displayAnalysis(coinId, currentData, indicators, recommendation) {
    console.log(chalk.white.bold(`\n📈 ${coinId.toUpperCase()} Analysis`));
    
    // Current price info
    const changeColor = currentData.change_24h >= 0 ? chalk.green : chalk.red;
    const changeSymbol = currentData.change_24h >= 0 ? '+' : '';
    
    console.log(`Price: $${chalk.yellow(currentData.price.toFixed(6))} ${changeColor('(' + changeSymbol + currentData.change_24h.toFixed(2) + '%)')}`);
    
    // Technical indicators
    if (indicators.sma7) console.log(`7-day MA: $${indicators.sma7.toFixed(6)}`);
    if (indicators.sma14) console.log(`14-day MA: $${indicators.sma14.toFixed(6)}`);
    if (indicators.rsi) console.log(`RSI: ${indicators.rsi.toFixed(1)}`);
    if (indicators.volatility) console.log(`Volatility: ${indicators.volatility.toFixed(1)}%`);
    console.log(`Trend: ${this.getTrendColor(indicators.trend)(indicators.trend)}`);
    
    // Recommendation
    const recColor = this.getRecommendationColor(recommendation.action);
    console.log(`\n${recColor.bold('Recommendation:')} ${recColor(recommendation.action)} (${recommendation.confidence} confidence)`);
    
    // Reasons
    console.log(chalk.gray('Reasons:'));
    recommendation.reasons.forEach(reason => {
      console.log(chalk.gray(`  • ${reason}`));
    });
  }

  getTrendColor(trend) {
    switch (trend) {
      case 'BULLISH': return chalk.green;
      case 'BEARISH': return chalk.red;
      case 'SIDEWAYS': return chalk.yellow;
      default: return chalk.gray;
    }
  }

  getRecommendationColor(action) {
    switch (action) {
      case 'STRONG BUY': return chalk.green.bold;
      case 'BUY': return chalk.green;
      case 'HOLD': return chalk.yellow;
      case 'SELL': return chalk.red;
      case 'STRONG SELL': return chalk.red.bold;
      default: return chalk.white;
    }
  }

  async getPortfolioOptimization(portfolioManager) {
    console.log(chalk.blue.bold('\n🎯 Portfolio Optimization Suggestions'));
    console.log(chalk.gray('─'.repeat(80)));

    await portfolioManager.loadPortfolio();
    const holdings = portfolioManager.getHoldings();
    
    if (holdings.size === 0) {
      console.log(chalk.yellow('No portfolio holdings found. Add some holdings first!'));
      return;
    }

    const allocations = await portfolioManager.getPortfolioAllocation();
    const totalValue = await portfolioManager.getPortfolioValue();
    
    console.log(`Current Portfolio Value: $${chalk.cyan.bold(totalValue.toFixed(2))}\n`);
    
    // Analyze current allocation
    console.log(chalk.white.bold('Current Allocation:'));
    const sortedAllocations = Array.from(allocations.entries())
      .sort((a, b) => b[1] - a[1]);
    
    for (const [coinId, percentage] of sortedAllocations) {
      const color = percentage > 40 ? chalk.red : percentage > 25 ? chalk.yellow : chalk.green;
      console.log(`  ${coinId.toUpperCase()}: ${color(percentage.toFixed(1) + '%')}`);
    }
    
    // Provide optimization suggestions
    console.log(chalk.white.bold('\n💡 Optimization Suggestions:'));
    
    // Check for over-concentration
    const overConcentrated = sortedAllocations.filter(([_, percentage]) => percentage > 40);
    if (overConcentrated.length > 0) {
      console.log(chalk.red('⚠️  Over-concentration detected:'));
      overConcentrated.forEach(([coinId, percentage]) => {
        console.log(`  • Consider reducing ${coinId.toUpperCase()} position (currently ${percentage.toFixed(1)}%)`);
      });
    }
    
    // Suggest diversification
    if (holdings.size < 5) {
      console.log(chalk.yellow('📊 Consider diversifying into more assets for better risk management'));
    }
    
    // Rebalancing suggestions
    console.log(chalk.green('\n🔄 Suggested Target Allocation:'));
    const targetAllocation = this.calculateTargetAllocation(sortedAllocations);
    
    for (const [coinId, targetPercentage] of targetAllocation) {
      const currentPercentage = allocations.get(coinId) || 0;
      const difference = targetPercentage - currentPercentage;
      const action = difference > 0 ? 'BUY' : 'SELL';
      const actionColor = difference > 0 ? chalk.green : chalk.red;
      
      if (Math.abs(difference) > 2) { // Only show significant changes
        console.log(
          `  ${coinId.toUpperCase()}: ${targetPercentage.toFixed(1)}% ` +
          `${actionColor('(' + action + ' ' + Math.abs(difference).toFixed(1) + '%)')}`
        );
      }
    }
    
    // Risk assessment
    console.log(chalk.white.bold('\n⚖️  Risk Assessment:'));
    const riskLevel = this.assessPortfolioRisk(allocations);
    const riskColor = riskLevel === 'HIGH' ? chalk.red : riskLevel === 'MEDIUM' ? chalk.yellow : chalk.green;
    console.log(`Portfolio Risk Level: ${riskColor.bold(riskLevel)}`);
  }

  calculateTargetAllocation(currentAllocations) {
    // Simple rebalancing strategy: cap individual positions at 30%
    const targetAllocations = [];
    let remainingPercentage = 100;
    
    for (const [coinId, currentPercentage] of currentAllocations) {
      const targetPercentage = Math.min(currentPercentage, 30);
      targetAllocations.push([coinId, targetPercentage]);
      remainingPercentage -= targetPercentage;
    }
    
    // Redistribute remaining percentage proportionally
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
}

module.exports = RecommendationEngine;
