import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Skeleton,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  CheckCircle,
  Info,
} from '@mui/icons-material';
import { CoinRecommendation } from '../services/CryptoService';

interface RecommendationsProps {
  data: CoinRecommendation[];
  loading: boolean;
}

const getRecommendationColor = (recommendation: string) => {
  switch (recommendation) {
    case 'STRONG BUY':
      return 'success';
    case 'BUY':
      return 'success';
    case 'HOLD':
      return 'warning';
    case 'SELL':
      return 'error';
    case 'STRONG SELL':
      return 'error';
    default:
      return 'default';
  }
};

const getConfidenceColor = (confidence: string) => {
  switch (confidence) {
    case 'HIGH':
      return 'success';
    case 'MEDIUM':
      return 'warning';
    case 'LOW':
      return 'error';
    default:
      return 'default';
  }
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'BULLISH':
      return <TrendingUp color="success" />;
    case 'BEARISH':
      return <TrendingDown color="error" />;
    case 'SIDEWAYS':
      return <TrendingFlat color="warning" />;
    default:
      return <TrendingFlat />;
  }
};

const formatPrice = (price: number) => {
  if (price < 0.01) {
    return `$${price.toFixed(6)}`;
  } else if (price < 1) {
    return `$${price.toFixed(4)}`;
  } else {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

const Recommendations: React.FC<RecommendationsProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {[...Array(3)].map((_, index) => (
          <Card key={index} sx={{ minWidth: 300, flex: '1 1 300px' }}>
            <CardContent>
              <Skeleton variant="text" width="60%" height={32} />
              <Skeleton variant="text" width="40%" height={24} />
              <Skeleton variant="rectangular" width="100%" height={100} sx={{ mt: 2 }} />
              <Skeleton variant="text" width="80%" height={20} sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Info sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No recommendations available
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Add some coins to your watchlist to get trading recommendations
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {data.map((coin) => (
        <Card key={coin.coinId} sx={{ minWidth: 300, flex: '1 1 300px', height: 'fit-content' }}>
          <CardContent>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Typography variant="h6" component="div">
                  {coin.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {coin.coinId.toUpperCase()}
                </Typography>
              </Box>
              {getTrendIcon(coin.indicators.trend)}
            </Box>

            {/* Price Info */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" sx={{ mb: 0.5 }}>
                {formatPrice(coin.currentData.price)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {coin.currentData.change_24h >= 0 ? (
                  <TrendingUp color="success" sx={{ mr: 0.5, fontSize: 16 }} />
                ) : (
                  <TrendingDown color="error" sx={{ mr: 0.5, fontSize: 16 }} />
                )}
                <Typography
                  variant="body2"
                  color={coin.currentData.change_24h >= 0 ? 'success.main' : 'error.main'}
                >
                  {coin.currentData.change_24h >= 0 ? '+' : ''}{coin.currentData.change_24h.toFixed(2)}%
                </Typography>
              </Box>
            </Box>

            {/* Recommendation */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Chip
                  label={coin.recommendation.action}
                  color={getRecommendationColor(coin.recommendation.action) as any}
                  size="small"
                />
                <Chip
                  label={`${coin.recommendation.confidence} Confidence`}
                  color={getConfidenceColor(coin.recommendation.confidence) as any}
                  variant="outlined"
                  size="small"
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Score: {coin.recommendation.score}/10
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.abs(coin.recommendation.score) * 10}
                color={coin.recommendation.score >= 0 ? 'success' : 'error'}
                sx={{ mt: 0.5 }}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Technical Indicators */}
            <Typography variant="subtitle2" gutterBottom>
              Technical Indicators
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              {coin.indicators.rsi && (
                <Box sx={{ minWidth: '45%' }}>
                  <Typography variant="caption" color="text.secondary">
                    RSI
                  </Typography>
                  <Typography variant="body2">
                    {coin.indicators.rsi.toFixed(1)}
                  </Typography>
                </Box>
              )}
              {coin.indicators.volatility && (
                <Box sx={{ minWidth: '45%' }}>
                  <Typography variant="caption" color="text.secondary">
                    Volatility
                  </Typography>
                  <Typography variant="body2">
                    {coin.indicators.volatility.toFixed(1)}%
                  </Typography>
                </Box>
              )}
              {coin.indicators.sma7 && (
                <Box sx={{ minWidth: '45%' }}>
                  <Typography variant="caption" color="text.secondary">
                    7-day MA
                  </Typography>
                  <Typography variant="body2">
                    {formatPrice(coin.indicators.sma7)}
                  </Typography>
                </Box>
              )}
              {coin.indicators.sma14 && (
                <Box sx={{ minWidth: '45%' }}>
                  <Typography variant="caption" color="text.secondary">
                    14-day MA
                  </Typography>
                  <Typography variant="body2">
                    {formatPrice(coin.indicators.sma14)}
                  </Typography>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Reasons */}
            <Typography variant="subtitle2" gutterBottom>
              Analysis Reasons
            </Typography>
            <List dense sx={{ py: 0 }}>
              {coin.recommendation.reasons.slice(0, 3).map((reason, index) => (
                <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 24 }}>
                    <CheckCircle color="primary" sx={{ fontSize: 16 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={reason}
                    primaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default Recommendations;
