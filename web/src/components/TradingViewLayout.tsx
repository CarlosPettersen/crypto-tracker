import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
  Divider,
  Card,
  CardContent,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
  CheckCircle,
  Error,
  Warning,
  Circle
} from '@mui/icons-material';
import TradingChart from './TradingChart';
import { cryptoService } from '../services/CryptoService';

interface MarketData {
  coinId: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap: number;
}

interface TechnicalAnalysis {
  coinId: string;
  currentPrice: number;
  technicalIndicators: any;
  patterns: any;
  levels: any;
  volume: any;
  signals: any[];
  priceAction?: any;
}

const TradingViewLayout: React.FC = () => {
  const [selectedCoin, setSelectedCoin] = useState('bitcoin');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [technicalAnalysis, setTechnicalAnalysis] = useState<TechnicalAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  // Load market data
  useEffect(() => {
    const loadMarketData = async () => {
      try {
        const watchlist = await cryptoService.getWatchlist();
        setMarketData(watchlist.map(item => ({
          coinId: item.id,
          name: item.name,
          symbol: item.id,
          price: item.price,
          change24h: item.change24h,
          changePercent24h: (item.change24h / (item.price - item.change24h)) * 100,
          volume24h: item.volume24h,
          marketCap: item.marketCap
        })));
      } catch (error) {
        console.error('Error loading market data:', error);
      }
    };

    loadMarketData();
    const interval = setInterval(loadMarketData, 90000);
    return () => clearInterval(interval);
  }, []);

  // Load chart data and technical analysis for selected coin
  useEffect(() => {
    const loadCoinData = async () => {
      if (!selectedCoin) return;
      
      setLoading(true);
      try {
        // Load chart data with selected timeframe
        const response = await fetch(`http://localhost:3001/api/chart-data/${selectedCoin}?timeframe=${selectedTimeframe}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`Loaded ${data.chartData?.length || 0} chart points for ${selectedCoin} (${selectedTimeframe})`);
          setChartData(data.chartData || []);
        } else {
          console.error('Failed to load chart data:', response.statusText);
          setChartData([]);
        }

        // Load technical analysis
        const analysisResponse = await fetch(`http://localhost:3001/api/technical-analysis/${selectedCoin}`);
        if (analysisResponse.ok) {
          const analysis = await analysisResponse.json();
          setTechnicalAnalysis(analysis);
        } else {
          console.error('Failed to load technical analysis:', analysisResponse.statusText);
          setTechnicalAnalysis(null);
        }
      } catch (error) {
        console.error('Error loading coin data:', error);
        setChartData([]);
        setTechnicalAnalysis(null);
      } finally {
        setLoading(false);
      }
    };

    loadCoinData();
  }, [selectedCoin, selectedTimeframe]);

  const handleTimeframeChange = (newTimeframe: string) => {
    console.log(`Changing timeframe from ${selectedTimeframe} to ${newTimeframe}`);
    setSelectedTimeframe(newTimeframe);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2
    }).format(price);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
    return `$${volume.toFixed(2)}`;
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? '#00d4aa' : '#ff6b6b';
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Left Sidebar - Market Watch */}
      <Paper sx={{ width: 300, display: 'flex', flexDirection: 'column', borderRadius: 0 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            📊 Market Watch
          </Typography>
        </Box>
        
        <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
          {marketData.map((coin) => (
            <ListItem
              key={coin.coinId}
              component="div"
              onClick={() => setSelectedCoin(coin.coinId)}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)'
                },
                ...(selectedCoin === coin.coinId && {
                  backgroundColor: 'rgba(0, 212, 170, 0.1)',
                  borderLeft: '3px solid #00d4aa'
                })
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {coin.symbol.toUpperCase()}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: getChangeColor(coin.changePercent24h), fontWeight: 600 }}
                    >
                      {coin.changePercent24h >= 0 ? '+' : ''}{coin.changePercent24h.toFixed(2)}%
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.primary">
                      {formatPrice(coin.price)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Vol: {formatVolume(coin.volume24h)}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Chart Area */}
        <Box sx={{ flex: 1, p: 2 }}>
          {loading ? (
            <Paper sx={{ p: 4, textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box>
                <LinearProgress sx={{ mb: 2 }} />
                <Typography>Loading chart data...</Typography>
              </Box>
            </Paper>
          ) : (
            <TradingChart
              coinId={selectedCoin}
              data={chartData}
              indicators={technicalAnalysis?.technicalIndicators}
              signals={technicalAnalysis?.signals || []}
              supportResistance={technicalAnalysis?.levels?.supportResistance || []}
              onTimeframeChange={handleTimeframeChange}
            />
          )}
        </Box>

        {/* Bottom Panel - Technical Analysis */}
        <Paper sx={{ height: 200, m: 2, mt: 0 }}>
          <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              🎯 Technical Analysis
            </Typography>
            
            {technicalAnalysis ? (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {/* Moving Averages */}
                <Card variant="outlined" sx={{ minWidth: 200 }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Moving Averages
                    </Typography>
                    {technicalAnalysis.technicalIndicators?.sma && (
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">SMA 7:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatPrice(technicalAnalysis.technicalIndicators.sma.sma7)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">SMA 14:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatPrice(technicalAnalysis.technicalIndicators.sma.sma14)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">SMA 30:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatPrice(technicalAnalysis.technicalIndicators.sma.sma30)}
                          </Typography>
                        </Box>
                      </Stack>
                    )}
                  </CardContent>
                </Card>

                {/* Oscillators */}
                <Card variant="outlined" sx={{ minWidth: 200 }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Oscillators
                    </Typography>
                    <Stack spacing={1}>
                      {technicalAnalysis.technicalIndicators?.stochastic && (
                        <>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">Stochastic K:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {technicalAnalysis.technicalIndicators.stochastic.k.toFixed(2)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">Stochastic D:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {technicalAnalysis.technicalIndicators.stochastic.d.toFixed(2)}
                            </Typography>
                          </Box>
                        </>
                      )}
                      {technicalAnalysis.technicalIndicators?.williamsR && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Williams %R:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {technicalAnalysis.technicalIndicators.williamsR.toFixed(2)}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>

                {/* Price Action */}
                <Card variant="outlined" sx={{ minWidth: 200 }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Price Action
                    </Typography>
                    {technicalAnalysis.priceAction && (
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">52W High:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatPrice(technicalAnalysis.priceAction.high52w)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">52W Low:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatPrice(technicalAnalysis.priceAction.low52w)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">From High:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#ff6b6b' }}>
                            -{technicalAnalysis.priceAction.distanceFromHigh.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Box>
            ) : (
              <Typography color="text.secondary">
                Select a coin to view technical analysis
              </Typography>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Right Sidebar - Signals */}
      <Paper sx={{ width: 350, display: 'flex', flexDirection: 'column', borderRadius: 0 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            🚨 Trading Signals
          </Typography>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {/* Active Signals */}
          {technicalAnalysis?.signals && technicalAnalysis.signals.length > 0 ? (
            <Stack spacing={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Active Signals ({technicalAnalysis.signals.length})
              </Typography>
              {technicalAnalysis.signals.map((signal: any, index: number) => (
                <Alert
                  key={index}
                  severity={signal.type === 'BUY' ? 'success' : signal.type === 'SELL' ? 'error' : 'info'}
                  icon={signal.type === 'BUY' ? <TrendingUp /> : signal.type === 'SELL' ? <TrendingDown /> : <ShowChart />}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {signal.type} Signal - {signal.indicator}
                    </Typography>
                    <Typography variant="caption">
                      Confidence: {(signal.strength * 100).toFixed(0)}%
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {signal.reason}
                    </Typography>
                  </Box>
                </Alert>
              ))}
            </Stack>
          ) : (
            <Typography color="text.secondary">
              No active signals for {selectedCoin.toUpperCase()}
            </Typography>
          )}

          {/* Pattern Recognition */}
          {technicalAnalysis?.patterns?.triangles && technicalAnalysis.patterns.triangles.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Pattern Recognition
              </Typography>
              <Stack spacing={1}>
                {technicalAnalysis.patterns.triangles.map((pattern: any, index: number) => (
                  <Alert
                    key={index}
                    severity={pattern.breakoutDirection === 'bullish' ? 'success' : pattern.breakoutDirection === 'bearish' ? 'error' : 'info'}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {pattern.type.replace('_', ' ').toUpperCase()}
                    </Typography>
                    <Typography variant="caption">
                      Confidence: {(pattern.confidence * 100).toFixed(0)}%
                      {pattern.breakoutDirection !== 'neutral' && (
                        <> • Expected: {pattern.breakoutDirection} breakout</>
                      )}
                    </Typography>
                  </Alert>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default TradingViewLayout;
