const fs = require('fs').promises;
const path = require('path');

class AdvancedTechnicalAnalysis {
    constructor() {
        this.dataPath = path.join(__dirname, '..', 'data');
    }

    // Calculate MACD (Moving Average Convergence Divergence)
    calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (prices.length < slowPeriod) return null;

        const fastEMA = this.calculateEMA(prices, fastPeriod);
        const slowEMA = this.calculateEMA(prices, slowPeriod);
        
        const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
        const signalLine = this.calculateEMA(macdLine, signalPeriod);
        const histogram = macdLine.map((macd, i) => macd - (signalLine[i] || 0));

        return {
            macd: macdLine,
            signal: signalLine,
            histogram: histogram
        };
    }

    // Calculate Exponential Moving Average
    calculateEMA(prices, period) {
        if (prices.length < period) return [];
        
        const multiplier = 2 / (period + 1);
        const ema = [prices[0]];
        
        for (let i = 1; i < prices.length; i++) {
            ema.push((prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier)));
        }
        
        return ema;
    }

    // Calculate Bollinger Bands
    calculateBollingerBands(prices, period = 20, stdDev = 2) {
        if (prices.length < period) return null;

        const sma = this.calculateSMA(prices, period);
        const bands = [];

        for (let i = period - 1; i < prices.length; i++) {
            const slice = prices.slice(i - period + 1, i + 1);
            const mean = sma[i - period + 1];
            const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
            const standardDeviation = Math.sqrt(variance);

            bands.push({
                upper: mean + (standardDeviation * stdDev),
                middle: mean,
                lower: mean - (standardDeviation * stdDev)
            });
        }

        return bands;
    }

    // Calculate Simple Moving Average
    calculateSMA(prices, period) {
        const sma = [];
        for (let i = period - 1; i < prices.length; i++) {
            const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            sma.push(sum / period);
        }
        return sma;
    }

    // Calculate Stochastic Oscillator
    calculateStochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
        if (closes.length < kPeriod) return null;

        const kValues = [];
        
        for (let i = kPeriod - 1; i < closes.length; i++) {
            const highestHigh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
            const lowestLow = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
            const currentClose = closes[i];
            
            const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
            kValues.push(k);
        }

        const dValues = this.calculateSMA(kValues, dPeriod);

        return {
            k: kValues,
            d: dValues
        };
    }

    // Calculate Williams %R
    calculateWilliamsR(highs, lows, closes, period = 14) {
        if (closes.length < period) return [];

        const williamsR = [];
        
        for (let i = period - 1; i < closes.length; i++) {
            const highestHigh = Math.max(...highs.slice(i - period + 1, i + 1));
            const lowestLow = Math.min(...lows.slice(i - period + 1, i + 1));
            const currentClose = closes[i];
            
            const wr = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
            williamsR.push(wr);
        }

        return williamsR;
    }

    // Detect Support and Resistance Levels
    detectSupportResistance(prices, minTouches = 3, tolerance = 0.02) {
        const levels = [];
        const priceMap = new Map();

        // Group similar prices
        prices.forEach(price => {
            let found = false;
            for (let [level, count] of priceMap) {
                if (Math.abs(price - level) / level <= tolerance) {
                    priceMap.set(level, count + 1);
                    found = true;
                    break;
                }
            }
            if (!found) {
                priceMap.set(price, 1);
            }
        });

        // Filter levels with minimum touches
        for (let [level, count] of priceMap) {
            if (count >= minTouches) {
                const currentPrice = prices[prices.length - 1];
                levels.push({
                    level: level,
                    touches: count,
                    type: level > currentPrice ? 'resistance' : 'support',
                    strength: Math.min(count / 10, 1) // Normalize strength 0-1
                });
            }
        }

        return levels.sort((a, b) => b.strength - a.strength);
    }

    // Pattern Recognition - Head and Shoulders
    detectHeadAndShoulders(prices, window = 20) {
        if (prices.length < window * 3) return null;

        const patterns = [];
        
        for (let i = window; i < prices.length - window; i++) {
            const leftShoulder = Math.max(...prices.slice(i - window, i));
            const head = Math.max(...prices.slice(i, i + window));
            const rightShoulder = Math.max(...prices.slice(i + window, i + window * 2));

            // Check if it forms a head and shoulders pattern
            if (head > leftShoulder && head > rightShoulder && 
                Math.abs(leftShoulder - rightShoulder) / leftShoulder < 0.05) {
                
                patterns.push({
                    type: 'head_and_shoulders',
                    position: i,
                    leftShoulder: leftShoulder,
                    head: head,
                    rightShoulder: rightShoulder,
                    confidence: this.calculatePatternConfidence(leftShoulder, head, rightShoulder)
                });
            }
        }

        return patterns;
    }

    // Pattern Recognition - Triangle Patterns
    detectTrianglePatterns(highs, lows, minPoints = 4) {
        if (highs.length < minPoints || lows.length < minPoints) return [];

        const patterns = [];
        
        // Ascending Triangle
        const ascendingTriangle = this.detectAscendingTriangle(highs, lows);
        if (ascendingTriangle) patterns.push(ascendingTriangle);

        // Descending Triangle
        const descendingTriangle = this.detectDescendingTriangle(highs, lows);
        if (descendingTriangle) patterns.push(descendingTriangle);

        // Symmetrical Triangle
        const symmetricalTriangle = this.detectSymmetricalTriangle(highs, lows);
        if (symmetricalTriangle) patterns.push(symmetricalTriangle);

        return patterns;
    }

    detectAscendingTriangle(highs, lows) {
        // Look for horizontal resistance and ascending support
        const recentHighs = highs.slice(-10);
        const recentLows = lows.slice(-10);

        const resistanceLevel = Math.max(...recentHighs);
        const resistanceTouches = recentHighs.filter(h => Math.abs(h - resistanceLevel) / resistanceLevel < 0.02).length;

        if (resistanceTouches >= 2) {
            // Check if lows are ascending
            const lowTrend = this.calculateTrendSlope(recentLows);
            if (lowTrend > 0) {
                return {
                    type: 'ascending_triangle',
                    resistance: resistanceLevel,
                    confidence: Math.min(resistanceTouches / 5, 1),
                    breakoutDirection: 'bullish'
                };
            }
        }

        return null;
    }

    detectDescendingTriangle(highs, lows) {
        // Look for horizontal support and descending resistance
        const recentHighs = highs.slice(-10);
        const recentLows = lows.slice(-10);

        const supportLevel = Math.min(...recentLows);
        const supportTouches = recentLows.filter(l => Math.abs(l - supportLevel) / supportLevel < 0.02).length;

        if (supportTouches >= 2) {
            // Check if highs are descending
            const highTrend = this.calculateTrendSlope(recentHighs);
            if (highTrend < 0) {
                return {
                    type: 'descending_triangle',
                    support: supportLevel,
                    confidence: Math.min(supportTouches / 5, 1),
                    breakoutDirection: 'bearish'
                };
            }
        }

        return null;
    }

    detectSymmetricalTriangle(highs, lows) {
        const recentHighs = highs.slice(-10);
        const recentLows = lows.slice(-10);

        const highTrend = this.calculateTrendSlope(recentHighs);
        const lowTrend = this.calculateTrendSlope(recentLows);

        // Converging lines
        if (highTrend < 0 && lowTrend > 0) {
            return {
                type: 'symmetrical_triangle',
                confidence: 0.7,
                breakoutDirection: 'neutral'
            };
        }

        return null;
    }

    calculateTrendSlope(values) {
        if (values.length < 2) return 0;
        
        const n = values.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
        const sumXX = values.reduce((sum, _, x) => sum + x * x, 0);

        return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    }

    calculatePatternConfidence(leftShoulder, head, rightShoulder) {
        const symmetry = 1 - Math.abs(leftShoulder - rightShoulder) / Math.max(leftShoulder, rightShoulder);
        const prominence = (head - Math.max(leftShoulder, rightShoulder)) / head;
        return (symmetry + prominence) / 2;
    }

    // Volume Analysis
    analyzeVolume(volumes, prices) {
        if (volumes.length !== prices.length || volumes.length < 20) return null;

        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
        
        const volumeSpike = recentVolume > avgVolume * 1.5;
        const priceChange = (prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2];

        return {
            avgVolume: avgVolume,
            recentVolume: recentVolume,
            volumeSpike: volumeSpike,
            volumeRatio: recentVolume / avgVolume,
            priceVolumeConfirmation: (priceChange > 0 && volumeSpike) || (priceChange < 0 && volumeSpike)
        };
    }

    // Fibonacci Retracement Levels
    calculateFibonacciLevels(high, low) {
        const diff = high - low;
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        
        return levels.map(level => ({
            level: level,
            price: high - (diff * level),
            label: `${(level * 100).toFixed(1)}%`
        }));
    }

    // Comprehensive Analysis
    async performComprehensiveAnalysis(coinId) {
        try {
            const historyFile = path.join(this.dataPath, 'price_history.json');
            let history = {};
            
            try {
                const data = await fs.readFile(historyFile, 'utf8');
                history = JSON.parse(data);
            } catch (error) {
                console.log('No price history found, starting fresh');
                return null;
            }

            const coinHistory = history[coinId];
            if (!coinHistory || coinHistory.length < 50) {
                return null;
            }

            const prices = coinHistory.map(h => h.price);
            const highs = coinHistory.map(h => h.high || h.price);
            const lows = coinHistory.map(h => h.low || h.price);
            const volumes = coinHistory.map(h => h.volume || 0);

            // Calculate all indicators
            const sma7 = this.calculateSMA(prices, 7);
            const sma14 = this.calculateSMA(prices, 14);
            const sma30 = this.calculateSMA(prices, 30);
            const ema12 = this.calculateEMA(prices, 12);
            const ema26 = this.calculateEMA(prices, 26);
            const macd = this.calculateMACD(prices);
            const bollinger = this.calculateBollingerBands(prices);
            const stochastic = this.calculateStochastic(highs, lows, prices);
            const williamsR = this.calculateWilliamsR(highs, lows, prices);
            const supportResistance = this.detectSupportResistance(prices);
            const headAndShoulders = this.detectHeadAndShoulders(prices);
            const trianglePatterns = this.detectTrianglePatterns(highs, lows);
            const volumeAnalysis = this.analyzeVolume(volumes, prices);

            const currentPrice = prices[prices.length - 1];
            const high52w = Math.max(...prices.slice(-365));
            const low52w = Math.min(...prices.slice(-365));
            const fibLevels = this.calculateFibonacciLevels(high52w, low52w);

            return {
                coinId,
                currentPrice,
                timestamp: new Date().toISOString(),
                technicalIndicators: {
                    sma: {
                        sma7: sma7[sma7.length - 1],
                        sma14: sma14[sma14.length - 1],
                        sma30: sma30[sma30.length - 1]
                    },
                    ema: {
                        ema12: ema12[ema12.length - 1],
                        ema26: ema26[ema26.length - 1]
                    },
                    macd: macd ? {
                        macd: macd.macd[macd.macd.length - 1],
                        signal: macd.signal[macd.signal.length - 1],
                        histogram: macd.histogram[macd.histogram.length - 1]
                    } : null,
                    bollinger: bollinger ? bollinger[bollinger.length - 1] : null,
                    stochastic: stochastic ? {
                        k: stochastic.k[stochastic.k.length - 1],
                        d: stochastic.d[stochastic.d.length - 1]
                    } : null,
                    williamsR: williamsR.length > 0 ? williamsR[williamsR.length - 1] : null
                },
                patterns: {
                    headAndShoulders,
                    triangles: trianglePatterns
                },
                levels: {
                    supportResistance,
                    fibonacci: fibLevels
                },
                volume: volumeAnalysis,
                priceAction: {
                    high52w,
                    low52w,
                    distanceFromHigh: ((high52w - currentPrice) / high52w) * 100,
                    distanceFromLow: ((currentPrice - low52w) / low52w) * 100
                }
            };

        } catch (error) {
            console.error(`Error performing comprehensive analysis for ${coinId}:`, error);
            return null;
        }
    }

    // Generate Trading Signals
    generateTradingSignals(analysis) {
        if (!analysis) return [];

        const signals = [];
        const { technicalIndicators, patterns, levels, volume } = analysis;

        // MACD Signals
        if (technicalIndicators.macd) {
            const { macd, signal, histogram } = technicalIndicators.macd;
            if (macd > signal && histogram > 0) {
                signals.push({
                    type: 'BUY',
                    indicator: 'MACD',
                    strength: Math.min(Math.abs(histogram) * 10, 1),
                    reason: 'MACD line crossed above signal line'
                });
            } else if (macd < signal && histogram < 0) {
                signals.push({
                    type: 'SELL',
                    indicator: 'MACD',
                    strength: Math.min(Math.abs(histogram) * 10, 1),
                    reason: 'MACD line crossed below signal line'
                });
            }
        }

        // Bollinger Bands Signals
        if (technicalIndicators.bollinger) {
            const { upper, lower } = technicalIndicators.bollinger;
            const currentPrice = analysis.currentPrice;
            
            if (currentPrice <= lower) {
                signals.push({
                    type: 'BUY',
                    indicator: 'Bollinger Bands',
                    strength: 0.7,
                    reason: 'Price touched lower Bollinger Band (oversold)'
                });
            } else if (currentPrice >= upper) {
                signals.push({
                    type: 'SELL',
                    indicator: 'Bollinger Bands',
                    strength: 0.7,
                    reason: 'Price touched upper Bollinger Band (overbought)'
                });
            }
        }

        // Stochastic Signals
        if (technicalIndicators.stochastic) {
            const { k, d } = technicalIndicators.stochastic;
            if (k < 20 && d < 20) {
                signals.push({
                    type: 'BUY',
                    indicator: 'Stochastic',
                    strength: 0.6,
                    reason: 'Stochastic in oversold territory'
                });
            } else if (k > 80 && d > 80) {
                signals.push({
                    type: 'SELL',
                    indicator: 'Stochastic',
                    strength: 0.6,
                    reason: 'Stochastic in overbought territory'
                });
            }
        }

        // Pattern Signals
        patterns.triangles.forEach(pattern => {
            if (pattern.breakoutDirection === 'bullish') {
                signals.push({
                    type: 'BUY',
                    indicator: 'Pattern Recognition',
                    strength: pattern.confidence,
                    reason: `${pattern.type.replace('_', ' ')} pattern detected - bullish breakout expected`
                });
            } else if (pattern.breakoutDirection === 'bearish') {
                signals.push({
                    type: 'SELL',
                    indicator: 'Pattern Recognition',
                    strength: pattern.confidence,
                    reason: `${pattern.type.replace('_', ' ')} pattern detected - bearish breakout expected`
                });
            }
        });

        // Volume Confirmation
        if (volume && volume.priceVolumeConfirmation) {
            const lastSignal = signals[signals.length - 1];
            if (lastSignal) {
                lastSignal.strength = Math.min(lastSignal.strength * 1.2, 1);
                lastSignal.reason += ' (confirmed by volume)';
            }
        }

        return signals;
    }
}

module.exports = AdvancedTechnicalAnalysis;
