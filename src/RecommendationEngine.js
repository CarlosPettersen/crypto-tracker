const axios = require('axios');
const chalk = require('chalk');
const config = require('../config/config');

class RecommendationEngine {
  constructor() {
    this.technicalIndicators = new Map();
  }

  async getDetailedRecommendations(watchlist) {
    console.log(chalk.blue.bold('\n🎯 Detailed Trading Recommendations'));
    console.log(chalk.gray('─'.repeat(80)));

    for (const coinId of watchlist) {
      await this.analyzeAndRecommend(coinId);
    }
  }

  async analyzeAndRecommend(coinId) {
    try {
      // Get current price and market data
      const currentData = await this.getCurrentMarketData(coinId);
      
      // Get historical data for technical analysis
      const historicalData = await this.getHistoricalData(coinId, 30); // 30 days
      
      if (!currentData || !historicalData) {
        console.log(chalk.gray(`${coinId}: Insufficient data for analysis`));
        return;
      }

      // Calculate technical indicators
      const indicators = this.calculateTechnicalIndicators(historicalData);
      
      // Generate recommendation
      const recommendation = this.generateRecommendation(currentData, indicators);
      
      // Display analysis
      this.displayAnalysis(coinId, currentData, indicators, recommendation);
      
    } catch (error) {
      console.error(chalk.red(`Error analyzing ${coinId}:`, error.message));
    }
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
    try {
      const response = await axios.get(
        `${config.API.COINGECKO_BASE_URL}/coins/${coinId}/market_chart`,
        {
          params: {
            vs_currency: config.API.CURRENCY,
            days: days,
            interval: 'daily'
          }
        }
      );

      return response.data.prices.map(([timestamp, price]) => ({
        timestamp,
        price
      }));
    } catch (error) {
      return null;
    }
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
