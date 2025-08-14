import React, { useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import {
  Box,
  Paper,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Stack,
  FormControlLabel,
  Switch,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShowChart
} from '@mui/icons-material';

interface ChartData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TechnicalIndicators {
  sma7?: number[];
  sma14?: number[];
  sma30?: number[];
  ema12?: number[];
  ema26?: number[];
  macd?: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
  bollinger?: Array<{
    upper: number;
    middle: number;
    lower: number;
  }>;
  rsi?: number[];
  stochastic?: {
    k: number[];
    d: number[];
  };
}

interface TradingSignal {
  type: 'BUY' | 'SELL' | 'HOLD';
  indicator: string;
  strength: number;
  reason: string;
  timestamp: string;
}

interface SupportResistanceLevel {
  level: number;
  type: 'support' | 'resistance';
  strength: number;
  touches: number;
}

interface TradingChartProps {
  coinId: string;
  data: ChartData[];
  indicators?: TechnicalIndicators;
  signals?: TradingSignal[];
  supportResistance?: SupportResistanceLevel[];
  onTimeframeChange?: (timeframe: string) => void;
}

// Custom Candlestick Component
const Candlestick = (props: any) => {
  const { payload, x, y, width, height } = props;
  
  if (!payload || !payload.open || !payload.high || !payload.low || !payload.close) {
    return null;
  }
  
  const { open, high, low, close } = payload;
  const isGreen = close >= open;
  const color = isGreen ? '#00d4aa' : '#ff6b6b'; // Green for up, red for down
  
  // Calculate positions
  const candleWidth = Math.max(width * 0.6, 2); // Minimum 2px width
  const candleX = x + (width - candleWidth) / 2;
  
  // Scale values to chart coordinates
  const maxPrice = Math.max(high, open, close);
  const minPrice = Math.min(low, open, close);
  const priceRange = maxPrice - minPrice;
  
  if (priceRange === 0) return null;
  
  // Calculate Y positions (note: Y axis is inverted in SVG)
  const highY = y;
  const lowY = y + height;
  const openY = y + ((maxPrice - open) / priceRange) * height;
  const closeY = y + ((maxPrice - close) / priceRange) * height;
  
  const bodyTop = Math.min(openY, closeY);
  const bodyHeight = Math.abs(closeY - openY);
  const wickX = candleX + candleWidth / 2;
  
  return (
    <g>
      {/* High-Low Wick */}
      <line
        x1={wickX}
        y1={highY}
        x2={wickX}
        y2={lowY}
        stroke={color}
        strokeWidth={1}
      />
      
      {/* Open-Close Body */}
      <rect
        x={candleX}
        y={bodyTop}
        width={candleWidth}
        height={Math.max(bodyHeight, 1)} // Minimum 1px height
        fill={isGreen ? color : color}
        stroke={color}
        strokeWidth={1}
        fillOpacity={isGreen ? 0.8 : 1}
      />
    </g>
  );
};

// Custom shape component for candlesticks
const CandlestickShape = (props: any) => {
  const { payload, x, y, width } = props;
  
  if (!payload) return null;
  
  const { open, high, low, close } = payload;
  const isGreen = close >= open;
  const color = isGreen ? '#00d4aa' : '#ff6b6b';
  
  const candleWidth = Math.max(width * 0.6, 3);
  const candleX = x + (width - candleWidth) / 2;
  const wickX = candleX + candleWidth / 2;
  
  // For this simplified version, we'll use the Bar component's height calculation
  const bodyHeight = Math.abs(close - open);
  const bodyY = Math.min(open, close);
  
  return (
    <g>
      {/* Wick lines */}
      <line
        x1={wickX}
        y1={high}
        x2={wickX}
        y2={low}
        stroke={color}
        strokeWidth={1}
      />
      
      {/* Body rectangle */}
      <rect
        x={candleX}
        y={bodyY}
        width={candleWidth}
        height={Math.max(bodyHeight, 1)}
        fill={isGreen ? 'transparent' : color}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
};

const TradingChart: React.FC<TradingChartProps> = ({
  coinId,
  data,
  indicators,
  signals = [],
  supportResistance = [],
  onTimeframeChange
}) => {
  const [timeframe, setTimeframe] = useState('1D');
  const [showIndicators, setShowIndicators] = useState({
    sma: true,
    volume: true,
    bollinger: false,
    candlesticks: true
  });

  // Process and combine data with indicators
  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    return data.map((item, index) => {
      const result: any = {
        time: item.time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        // Add candlestick color info
        isGreen: item.close >= item.open,
        bodyHeight: Math.abs(item.close - item.open),
        bodyBottom: Math.min(item.open, item.close),
        wickTop: item.high,
        wickBottom: item.low
      };
      
      // Add SMA data if available
      if (indicators?.sma7 && index >= data.length - indicators.sma7.length) {
        result.sma7 = indicators.sma7[index - (data.length - indicators.sma7.length)];
      }
      if (indicators?.sma14 && index >= data.length - indicators.sma14.length) {
        result.sma14 = indicators.sma14[index - (data.length - indicators.sma14.length)];
      }
      if (indicators?.sma30 && index >= data.length - indicators.sma30.length) {
        result.sma30 = indicators.sma30[index - (data.length - indicators.sma30.length)];
      }
      
      // Add Bollinger Bands if available
      if (indicators?.bollinger && index >= data.length - indicators.bollinger.length) {
        const bollinger = indicators.bollinger[index - (data.length - indicators.bollinger.length)];
        result.bollingerUpper = bollinger.upper;
        result.bollingerMiddle = bollinger.middle;
        result.bollingerLower = bollinger.lower;
      }
      
      return result;
    });
  }, [data, indicators]);

  // Format time labels based on timeframe
  const formatTimeLabel = (timeStr: string) => {
    const date = new Date(timeStr);
    
    switch (timeframe) {
      case '1H':
      case '4H':
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          month: 'short',
          day: 'numeric'
        });
      case '1D':
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      case '1W':
      case '1M':
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: '2-digit'
        });
      default:
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
    }
  };

  const handleTimeframeChange = (event: React.MouseEvent<HTMLElement>, newTimeframe: string | null) => {
    if (newTimeframe !== null) {
      setTimeframe(newTimeframe);
      onTimeframeChange?.(newTimeframe);
    }
  };

  const handleIndicatorToggle = (indicator: keyof typeof showIndicators) => {
    setShowIndicators(prev => ({
      ...prev,
      [indicator]: !prev[indicator]
    }));
  };

  const getSignalColor = (type: string) => {
    switch (type) {
      case 'BUY': return '#00d4aa';
      case 'SELL': return '#ff6b6b';
      default: return '#ffd93d';
    }
  };

  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'BUY': return <TrendingUp />;
      case 'SELL': return <TrendingDown />;
      default: return <ShowChart />;
    }
  };

  const formatPrice = (value: number) => {
    if (!value) return '$0.00';
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatVolume = (value: number) => {
    if (!value) return '0';
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      
      return (
        <Box sx={{ 
          backgroundColor: '#1a1f3a', 
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 1,
          p: 2,
          minWidth: 200
        }}>
          <Typography variant="body2" sx={{ color: '#ffffff', mb: 1, fontWeight: 600 }}>
            {label}
          </Typography>
          
          {data && (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#888' }}>Open:</Typography>
                <Typography variant="caption" sx={{ color: '#fff', textAlign: 'right' }}>
                  {formatPrice(data.open)}
                </Typography>
                
                <Typography variant="caption" sx={{ color: '#888' }}>High:</Typography>
                <Typography variant="caption" sx={{ color: '#00d4aa', textAlign: 'right' }}>
                  {formatPrice(data.high)}
                </Typography>
                
                <Typography variant="caption" sx={{ color: '#888' }}>Low:</Typography>
                <Typography variant="caption" sx={{ color: '#ff6b6b', textAlign: 'right' }}>
                  {formatPrice(data.low)}
                </Typography>
                
                <Typography variant="caption" sx={{ color: '#888' }}>Close:</Typography>
                <Typography variant="caption" sx={{ 
                  color: data.isGreen ? '#00d4aa' : '#ff6b6b', 
                  textAlign: 'right',
                  fontWeight: 600
                }}>
                  {formatPrice(data.close)}
                </Typography>
                
                <Typography variant="caption" sx={{ color: '#888' }}>Volume:</Typography>
                <Typography variant="caption" sx={{ color: '#fff', textAlign: 'right' }}>
                  {formatVolume(data.volume)}
                </Typography>
              </Box>
              
              <Typography variant="caption" sx={{ 
                color: data.isGreen ? '#00d4aa' : '#ff6b6b',
                fontWeight: 600
              }}>
                {data.isGreen ? '▲' : '▼'} {formatPrice(Math.abs(data.close - data.open))} 
                ({((Math.abs(data.close - data.open) / data.open) * 100).toFixed(2)}%)
              </Typography>
            </>
          )}
        </Box>
      );
    }
    return null;
  };

  // Custom Bar component for candlesticks
  const CandlestickBar = (props: any) => {
    const { payload, x, y, width, height } = props;
    
    if (!payload) return null;
    
    const { open, high, low, close } = payload;
    const isGreen = close >= open;
    const color = isGreen ? '#00d4aa' : '#ff6b6b';
    
    const candleWidth = Math.max(width * 0.7, 2);
    const candleX = x + (width - candleWidth) / 2;
    const wickX = candleX + candleWidth / 2;
    
    // Calculate the body rectangle
    const bodyTop = Math.max(open, close);
    const bodyBottom = Math.min(open, close);
    const bodyHeight = Math.abs(close - open);
    
    return (
      <g>
        {/* High-Low Wick */}
        <line
          x1={wickX}
          y1={y - (high - Math.max(open, close, low)) * height / (high - low)}
          x2={wickX}
          y2={y + height - (Math.min(open, close, high) - low) * height / (high - low)}
          stroke={color}
          strokeWidth={1}
        />
        
        {/* Open-Close Body */}
        <rect
          x={candleX}
          y={y + height - (bodyTop - low) * height / (high - low)}
          width={candleWidth}
          height={Math.max(bodyHeight * height / (high - low), 1)}
          fill={isGreen ? 'transparent' : color}
          stroke={color}
          strokeWidth={1.5}
          fillOpacity={isGreen ? 0 : 1}
        />
      </g>
    );
  };

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      {/* Chart Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {coinId.toUpperCase()} Chart
        </Typography>
        
        {/* Timeframe Selector */}
        <ToggleButtonGroup
          value={timeframe}
          exclusive
          onChange={handleTimeframeChange}
          size="small"
        >
          <ToggleButton value="1H">1H</ToggleButton>
          <ToggleButton value="4H">4H</ToggleButton>
          <ToggleButton value="1D">1D</ToggleButton>
          <ToggleButton value="1W">1W</ToggleButton>
          <ToggleButton value="1M">1M</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Indicators Controls */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <FormControlLabel
            control={
              <Switch
                checked={showIndicators.candlesticks}
                onChange={() => handleIndicatorToggle('candlesticks')}
                size="small"
              />
            }
            label="Candlesticks"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showIndicators.sma}
                onChange={() => handleIndicatorToggle('sma')}
                size="small"
              />
            }
            label="SMA"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showIndicators.bollinger}
                onChange={() => handleIndicatorToggle('bollinger')}
                size="small"
              />
            }
            label="Bollinger"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showIndicators.volume}
                onChange={() => handleIndicatorToggle('volume')}
                size="small"
              />
            }
            label="Volume"
          />
        </Stack>
      </Box>

      {/* Trading Signals */}
      {signals.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Active Signals:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {signals.slice(0, 3).map((signal, index) => (
              <Chip
                key={index}
                icon={getSignalIcon(signal.type)}
                label={`${signal.type} (${(signal.strength * 100).toFixed(0)}%)`}
                size="small"
                sx={{
                  backgroundColor: getSignalColor(signal.type),
                  color: 'white',
                  '& .MuiChip-icon': { color: 'white' }
                }}
              />
            ))}
          </Stack>
        </Box>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* Main Chart */}
      <Box sx={{ height: 400, mb: 2 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="time" 
              stroke="#ffffff"
              tick={{ fontSize: 12, fill: '#ffffff' }}
              tickFormatter={formatTimeLabel}
              interval="preserveStartEnd"
            />
            <YAxis 
              yAxisId="price"
              orientation="right"
              stroke="#ffffff"
              tick={{ fontSize: 12, fill: '#ffffff' }}
              tickFormatter={formatPrice}
              domain={['dataMin - 100', 'dataMax + 100']}
            />
            {showIndicators.volume && (
              <YAxis 
                yAxisId="volume"
                orientation="left"
                stroke="#ffffff"
                tick={{ fontSize: 12, fill: '#ffffff' }}
                tickFormatter={formatVolume}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Candlesticks - using custom bars for each candle */}
            {showIndicators.candlesticks && (
              <Bar
                yAxisId="price"
                dataKey="high"
                fill="transparent"
                stroke="transparent"
                shape={<CandlestickBar />}
                name="Price"
              />
            )}
            
            {/* Fallback line chart if candlesticks are disabled */}
            {!showIndicators.candlesticks && (
              <Line 
                yAxisId="price"
                type="monotone" 
                dataKey="close" 
                stroke="#00d4aa" 
                strokeWidth={2}
                dot={false}
                name="Price"
              />
            )}
            
            {/* Moving Averages */}
            {showIndicators.sma && (
              <>
                <Line 
                  yAxisId="price"
                  type="monotone" 
                  dataKey="sma7" 
                  stroke="#ffd93d" 
                  strokeWidth={1}
                  dot={false}
                  name="SMA 7"
                />
                <Line 
                  yAxisId="price"
                  type="monotone" 
                  dataKey="sma14" 
                  stroke="#ff6b6b" 
                  strokeWidth={1}
                  dot={false}
                  name="SMA 14"
                />
                <Line 
                  yAxisId="price"
                  type="monotone" 
                  dataKey="sma30" 
                  stroke="#9c88ff" 
                  strokeWidth={1}
                  dot={false}
                  name="SMA 30"
                />
              </>
            )}
            
            {/* Bollinger Bands */}
            {showIndicators.bollinger && (
              <>
                <Line 
                  yAxisId="price"
                  type="monotone" 
                  dataKey="bollingerUpper" 
                  stroke="rgba(255,255,255,0.5)" 
                  strokeWidth={1}
                  dot={false}
                  name="BB Upper"
                />
                <Line 
                  yAxisId="price"
                  type="monotone" 
                  dataKey="bollingerMiddle" 
                  stroke="rgba(255,255,255,0.3)" 
                  strokeWidth={1}
                  dot={false}
                  name="BB Middle"
                />
                <Line 
                  yAxisId="price"
                  type="monotone" 
                  dataKey="bollingerLower" 
                  stroke="rgba(255,255,255,0.5)" 
                  strokeWidth={1}
                  dot={false}
                  name="BB Lower"
                />
              </>
            )}
            
            {/* Volume Bars */}
            {showIndicators.volume && (
              <Bar 
                yAxisId="volume"
                dataKey="volume" 
                name="Volume"
              >
                {processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isGreen ? 'rgba(0, 212, 170, 0.3)' : 'rgba(255, 107, 107, 0.3)'} />
                ))}
              </Bar>
            )}
            
            {/* Support/Resistance Lines */}
            {supportResistance.slice(0, 2).map((level, index) => (
              <ReferenceLine 
                key={index}
                yAxisId="price"
                y={level.level} 
                stroke={level.type === 'support' ? '#00d4aa' : '#ff6b6b'}
                strokeDasharray="5 5"
                label={`${level.type.toUpperCase()}: ${formatPrice(level.level)}`}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </Box>

      {/* Chart Info */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" spacing={2}>
          {supportResistance.slice(0, 2).map((level, index) => (
            <Chip
              key={index}
              label={`${level.type.toUpperCase()}: ${formatPrice(level.level)}`}
              size="small"
              variant="outlined"
              sx={{
                borderColor: level.type === 'support' ? '#00d4aa' : '#ff6b6b',
                color: level.type === 'support' ? '#00d4aa' : '#ff6b6b'
              }}
            />
          ))}
        </Stack>
        
        <Typography variant="caption" color="text.secondary">
          Last updated: {new Date().toLocaleTimeString()}
        </Typography>
      </Box>

      {/* Debug Info */}
      {processedData.length === 0 && (
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(255, 193, 7, 0.1)', borderRadius: 1 }}>
          <Typography variant="body2" color="warning.main">
            No chart data available for {coinId.toUpperCase()}. Check server logs for API issues.
          </Typography>
        </Box>
      )}
      
      {processedData.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Showing {processedData.length} candlesticks • 
            Latest: {formatPrice(processedData[processedData.length - 1]?.close)} • 
            Timeframe: {timeframe} •
            {processedData[processedData.length - 1]?.isGreen ? 
              <span style={{ color: '#00d4aa' }}> ▲ Bullish</span> : 
              <span style={{ color: '#ff6b6b' }}> ▼ Bearish</span>
            }
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default TradingChart;
