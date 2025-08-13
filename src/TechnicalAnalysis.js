const chalk = require('chalk');

class TechnicalAnalysis {
  constructor() {
    this.indicators = {};
  }

  // Calculate all technical indicators for a coin
  calculateAllIndicators(historicalData, currentData) {
    const prices = historicalData.map(d => d.price);
    const volumes = historicalData.map(d => d.volume || 0);
    const highs = historicalData.map(d => d.high || d.price);
    const lows = historicalData.map(d => d.low || d.price);
    const closes = prices;

    return {
      // Price and basic info
      currentPrice: currentData.price,
      priceChange24h: currentData.change_24h,
      volume24h: currentData.volume_24h,
      
      // Moving Averages
      sma7: this.calculateSMA(prices, 7),
      sma14: this.calculateSMA(prices, 14),
      sma21: this.calculateSMA(prices, 21),
      sma30: this.calculateSMA(prices, 30),
      sma50: this.calculateSMA(prices, 50),
      ema12: this.calculateEMA(prices, 12),
      ema26: this.calculateEMA(prices, 26),
      
      // Momentum Indicators
      rsi: this.calculateRSI(prices, 14),
      rsi_fast: this.calculateRSI(prices, 7),
      stochastic: this.calculateStochastic(highs, lows, closes, 14),
      williams_r: this.calculateWilliamsR(highs, lows, closes, 14),
      
      // Trend Indicators
      macd: this.calculateMACD(prices),
      adx: this.calculateADX(highs, lows, closes, 14),
      
      // Volatility Indicators
      bollinger: this.calculateBollingerBands(prices, 20, 2),
      atr: this.calculateATR(highs, lows, closes, 14),
      volatility: this.calculateVolatility(prices, 14),
      
      // Volume Indicators
      volumeMA: this.calculateSMA(volumes, 20),
      volumeRatio: volumes.length > 0 ? volumes[volumes.length - 1] / this.calculateSMA(volumes, 20) : 1,
      
      // Support and Resistance
      support: this.calculateSupport(lows, 20),
      resistance: this.calculateResistance(highs, 20),
      
      // Chart Patterns
      patterns: this.detectPatterns(prices, highs, lows),
      
      // Trend Analysis
      trend: this.analyzeTrend(prices),
      trendStrength: this.calculateTrendStrength(prices),
      
      // Market Structure
      marketStructure: this.analyzeMarketStructure(highs, lows, closes)
    };
  }

  // Simple Moving Average
  calculateSMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    const slice = prices.slice(-period);
    return slice.reduce((sum, price) => sum + price, 0) / period;
  }

  // Exponential Moving Average
  calculateEMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    
    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(prices.slice(0, period), period);
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  // Relative Strength Index
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = prices[prices.length - i] - prices[prices.length - i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // MACD (Moving Average Convergence Divergence)
  calculateMACD(prices) {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;
    
    // Calculate signal line (9-period EMA of MACD)
    const macdHistory = [];
    for (let i = 26; i < prices.length; i++) {
      const slice = prices.slice(0, i + 1);
      const ema12_i = this.calculateEMA(slice, 12);
      const ema26_i = this.calculateEMA(slice, 26);
      macdHistory.push(ema12_i - ema26_i);
    }
    
    const signalLine = this.calculateEMA(macdHistory, 9);
    const histogram = macdLine - signalLine;
    
    return {
      macd: macdLine,
      signal: signalLine,
      histogram: histogram,
      bullish: macdLine > signalLine && histogram > 0,
      bearish: macdLine < signalLine && histogram < 0
    };
  }

  // Bollinger Bands
  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    const sma = this.calculateSMA(prices, period);
    const slice = prices.slice(-period);
    
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev),
      bandwidth: (standardDeviation * stdDev * 2) / sma * 100,
      position: prices.length > 0 ? (prices[prices.length - 1] - (sma - standardDeviation * stdDev)) / (standardDeviation * stdDev * 2) : 0.5
    };
  }

  // Stochastic Oscillator
  calculateStochastic(highs, lows, closes, period = 14) {
    if (highs.length < period) return { k: 50, d: 50 };
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const currentClose = closes[closes.length - 1];
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    // Calculate %D (3-period SMA of %K)
    const kValues = [];
    for (let i = period - 1; i < closes.length; i++) {
      const sliceHighs = highs.slice(i - period + 1, i + 1);
      const sliceLows = lows.slice(i - period + 1, i + 1);
      const hh = Math.max(...sliceHighs);
      const ll = Math.min(...sliceLows);
      kValues.push(((closes[i] - ll) / (hh - ll)) * 100);
    }
    
    const d = kValues.length >= 3 ? 
      kValues.slice(-3).reduce((sum, val) => sum + val, 0) / 3 : k;
    
    return { k, d };
  }

  // Williams %R
  calculateWilliamsR(highs, lows, closes, period = 14) {
    if (highs.length < period) return -50;
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const currentClose = closes[closes.length - 1];
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    return ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
  }

  // Average Directional Index (ADX)
  calculateADX(highs, lows, closes, period = 14) {
    if (highs.length < period + 1) return 25;
    
    const trueRanges = [];
    const plusDMs = [];
    const minusDMs = [];
    
    for (let i = 1; i < highs.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trueRanges.push(tr);
      
      const plusDM = highs[i] - highs[i - 1] > lows[i - 1] - lows[i] ? 
        Math.max(highs[i] - highs[i - 1], 0) : 0;
      const minusDM = lows[i - 1] - lows[i] > highs[i] - highs[i - 1] ? 
        Math.max(lows[i - 1] - lows[i], 0) : 0;
      
      plusDMs.push(plusDM);
      minusDMs.push(minusDM);
    }
    
    const avgTR = this.calculateSMA(trueRanges.slice(-period), period);
    const avgPlusDM = this.calculateSMA(plusDMs.slice(-period), period);
    const avgMinusDM = this.calculateSMA(minusDMs.slice(-period), period);
    
    const plusDI = (avgPlusDM / avgTR) * 100;
    const minusDI = (avgMinusDM / avgTR) * 100;
    
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
    
    return dx;
  }

  // Average True Range
  calculateATR(highs, lows, closes, period = 14) {
    if (highs.length < 2) return 0;
    
    const trueRanges = [];
    for (let i = 1; i < highs.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trueRanges.push(tr);
    }
    
    return this.calculateSMA(trueRanges.slice(-period), period);
  }

  // Price Volatility
  calculateVolatility(prices, period = 14) {
    if (prices.length < period) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    const recentReturns = returns.slice(-period);
    const avgReturn = recentReturns.reduce((sum, ret) => sum + ret, 0) / period;
    const variance = recentReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / period;
    
    return Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized volatility
  }

  // Support Level
  calculateSupport(lows, period = 20) {
    if (lows.length < period) return Math.min(...lows);
    
    const recentLows = lows.slice(-period);
    const sortedLows = [...recentLows].sort((a, b) => a - b);
    
    // Return the 25th percentile as support
    const index = Math.floor(sortedLows.length * 0.25);
    return sortedLows[index];
  }

  // Resistance Level
  calculateResistance(highs, period = 20) {
    if (highs.length < period) return Math.max(...highs);
    
    const recentHighs = highs.slice(-period);
    const sortedHighs = [...recentHighs].sort((a, b) => b - a);
    
    // Return the 25th percentile as resistance
    const index = Math.floor(sortedHighs.length * 0.25);
    return sortedHighs[index];
  }

  // Trend Analysis
  analyzeTrend(prices) {
    if (prices.length < 10) return 'UNKNOWN';
    
    const sma7 = this.calculateSMA(prices, 7);
    const sma14 = this.calculateSMA(prices, 14);
    const sma30 = this.calculateSMA(prices, 30);
    const currentPrice = prices[prices.length - 1];
    
    // Strong trend conditions
    if (currentPrice > sma7 && sma7 > sma14 && sma14 > sma30) {
      return 'STRONG_BULLISH';
    } else if (currentPrice < sma7 && sma7 < sma14 && sma14 < sma30) {
      return 'STRONG_BEARISH';
    }
    
    // Moderate trend conditions
    if (currentPrice > sma14 && sma14 > sma30) {
      return 'BULLISH';
    } else if (currentPrice < sma14 && sma14 < sma30) {
      return 'BEARISH';
    }
    
    return 'SIDEWAYS';
  }

  // Trend Strength (0-100)
  calculateTrendStrength(prices) {
    if (prices.length < 20) return 50;
    
    const linearRegression = this.calculateLinearRegression(prices.slice(-20));
    const r_squared = linearRegression.r_squared;
    
    return Math.min(r_squared * 100, 100);
  }

  // Linear Regression for trend strength
  calculateLinearRegression(prices) {
    const n = prices.length;
    const x = Array.from({length: n}, (_, i) => i);
    const y = prices;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const yMean = sumY / n;
    const ssRes = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const r_squared = 1 - (ssRes / ssTot);
    
    return { slope, intercept, r_squared };
  }

  // Market Structure Analysis
  analyzeMarketStructure(highs, lows, closes) {
    if (highs.length < 10) return { structure: 'UNKNOWN', confidence: 0 };
    
    const recentHighs = highs.slice(-10);
    const recentLows = lows.slice(-10);
    
    // Higher highs and higher lows = uptrend
    const higherHighs = this.countHigherHighs(recentHighs);
    const higherLows = this.countHigherLows(recentLows);
    const lowerHighs = this.countLowerHighs(recentHighs);
    const lowerLows = this.countLowerLows(recentLows);
    
    if (higherHighs >= 2 && higherLows >= 2) {
      return { structure: 'UPTREND', confidence: Math.min((higherHighs + higherLows) * 10, 100) };
    } else if (lowerHighs >= 2 && lowerLows >= 2) {
      return { structure: 'DOWNTREND', confidence: Math.min((lowerHighs + lowerLows) * 10, 100) };
    } else {
      return { structure: 'CONSOLIDATION', confidence: 50 };
    }
  }

  countHigherHighs(highs) {
    let count = 0;
    for (let i = 1; i < highs.length; i++) {
      if (highs[i] > highs[i - 1]) count++;
    }
    return count;
  }

  countHigherLows(lows) {
    let count = 0;
    for (let i = 1; i < lows.length; i++) {
      if (lows[i] > lows[i - 1]) count++;
    }
    return count;
  }

  countLowerHighs(highs) {
    let count = 0;
    for (let i = 1; i < highs.length; i++) {
      if (highs[i] < highs[i - 1]) count++;
    }
    return count;
  }

  countLowerLows(lows) {
    let count = 0;
    for (let i = 1; i < lows.length; i++) {
      if (lows[i] < lows[i - 1]) count++;
    }
    return count;
  }

  // Basic Pattern Detection
  detectPatterns(prices, highs, lows) {
    const patterns = [];
    
    if (prices.length < 20) return patterns;
    
    // Double Top/Bottom
    const doubleTop = this.detectDoubleTop(highs.slice(-20));
    const doubleBottom = this.detectDoubleBottom(lows.slice(-20));
    
    if (doubleTop) patterns.push({ type: 'DOUBLE_TOP', confidence: doubleTop.confidence, bearish: true });
    if (doubleBottom) patterns.push({ type: 'DOUBLE_BOTTOM', confidence: doubleBottom.confidence, bullish: true });
    
    // Head and Shoulders
    const headShoulders = this.detectHeadAndShoulders(highs.slice(-20));
    if (headShoulders) patterns.push({ type: 'HEAD_AND_SHOULDERS', confidence: headShoulders.confidence, bearish: true });
    
    // Triangle patterns
    const triangle = this.detectTriangle(highs.slice(-15), lows.slice(-15));
    if (triangle) patterns.push({ type: triangle.type, confidence: triangle.confidence, direction: triangle.direction });
    
    return patterns;
  }

  detectDoubleTop(highs) {
    // Simplified double top detection
    if (highs.length < 10) return null;
    
    const maxHigh = Math.max(...highs);
    const maxIndices = highs.map((h, i) => ({ value: h, index: i }))
      .filter(h => h.value > maxHigh * 0.98)
      .map(h => h.index);
    
    if (maxIndices.length >= 2 && maxIndices[maxIndices.length - 1] - maxIndices[0] > 5) {
      return { confidence: 70 };
    }
    
    return null;
  }

  detectDoubleBottom(lows) {
    // Simplified double bottom detection
    if (lows.length < 10) return null;
    
    const minLow = Math.min(...lows);
    const minIndices = lows.map((l, i) => ({ value: l, index: i }))
      .filter(l => l.value < minLow * 1.02)
      .map(l => l.index);
    
    if (minIndices.length >= 2 && minIndices[minIndices.length - 1] - minIndices[0] > 5) {
      return { confidence: 70 };
    }
    
    return null;
  }

  detectHeadAndShoulders(highs) {
    // Simplified head and shoulders detection
    if (highs.length < 15) return null;
    
    const peaks = this.findPeaks(highs);
    if (peaks.length >= 3) {
      const lastThree = peaks.slice(-3);
      if (lastThree[1].value > lastThree[0].value && lastThree[1].value > lastThree[2].value) {
        return { confidence: 60 };
      }
    }
    
    return null;
  }

  detectTriangle(highs, lows) {
    // Simplified triangle detection
    if (highs.length < 10) return null;
    
    const highTrend = this.calculateLinearRegression(highs.slice(-10));
    const lowTrend = this.calculateLinearRegression(lows.slice(-10));
    
    if (Math.abs(highTrend.slope) < 0.1 && Math.abs(lowTrend.slope) < 0.1) {
      return { type: 'SYMMETRICAL_TRIANGLE', confidence: 50, direction: 'NEUTRAL' };
    } else if (highTrend.slope < -0.1 && lowTrend.slope > 0.1) {
      return { type: 'SYMMETRICAL_TRIANGLE', confidence: 60, direction: 'BREAKOUT_PENDING' };
    }
    
    return null;
  }

  findPeaks(data) {
    const peaks = [];
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
        peaks.push({ index: i, value: data[i] });
      }
    }
    return peaks;
  }
}

module.exports = TechnicalAnalysis;
