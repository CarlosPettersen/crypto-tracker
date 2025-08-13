import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  IconButton,
  Box,
  Skeleton,
  Card,
  CardContent,
} from '@mui/material';
import { Delete as DeleteIcon, TrendingUp, TrendingDown } from '@mui/icons-material';
import { WatchlistItem } from '../services/CryptoService';

interface WatchlistProps {
  data: WatchlistItem[];
  loading: boolean;
  onRemoveCoin: (coinId: string) => void;
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

const formatPrice = (price: number) => {
  if (price < 0.01) {
    return `$${price.toFixed(6)}`;
  } else if (price < 1) {
    return `$${price.toFixed(4)}`;
  } else {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

const formatMarketCap = (marketCap: number) => {
  if (marketCap >= 1e12) {
    return `$${(marketCap / 1e12).toFixed(2)}T`;
  } else if (marketCap >= 1e9) {
    return `$${(marketCap / 1e9).toFixed(2)}B`;
  } else if (marketCap >= 1e6) {
    return `$${(marketCap / 1e6).toFixed(2)}M`;
  } else {
    return `$${marketCap.toLocaleString()}`;
  }
};

const Watchlist: React.FC<WatchlistProps> = ({ data, loading, onRemoveCoin }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {[...Array(4)].map((_, index) => (
          <Card key={index} sx={{ minWidth: 250, flex: '1 1 250px' }}>
            <CardContent>
              <Skeleton variant="text" width="60%" height={32} />
              <Skeleton variant="text" width="40%" height={24} />
              <Skeleton variant="text" width="80%" height={20} />
              <Skeleton variant="rectangular" width="100%" height={40} sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No coins in your watchlist
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Add some cryptocurrencies to start tracking their prices
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Cards View for Mobile */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, flexWrap: 'wrap', gap: 2 }}>
        {data.map((coin) => (
          <Card key={coin.id} sx={{ minWidth: 250, flex: '1 1 250px' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h6" component="div">
                  {coin.name}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => onRemoveCoin(coin.id)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              
              <Typography variant="h5" sx={{ mb: 1 }}>
                {formatPrice(coin.price)}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {coin.change24h >= 0 ? (
                  <TrendingUp color="success" sx={{ mr: 0.5 }} />
                ) : (
                  <TrendingDown color="error" sx={{ mr: 0.5 }} />
                )}
                <Typography
                  variant="body2"
                  color={coin.change24h >= 0 ? 'success.main' : 'error.main'}
                >
                  {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
                </Typography>
              </Box>
              
              <Chip
                label={coin.recommendation}
                color={getRecommendationColor(coin.recommendation) as any}
                size="small"
                sx={{ mb: 1 }}
              />
              
              <Typography variant="caption" display="block" color="text.secondary">
                Market Cap: {formatMarketCap(coin.marketCap)}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Table View for Desktop */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Coin</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">24h Change</TableCell>
                <TableCell align="right">Market Cap</TableCell>
                <TableCell align="right">Volume (24h)</TableCell>
                <TableCell align="center">Recommendation</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((coin) => (
                <TableRow key={coin.id} hover>
                  <TableCell>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {coin.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {coin.id.toUpperCase()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1" fontWeight="medium">
                      {formatPrice(coin.price)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      {coin.change24h >= 0 ? (
                        <TrendingUp color="success" sx={{ mr: 0.5, fontSize: 16 }} />
                      ) : (
                        <TrendingDown color="error" sx={{ mr: 0.5, fontSize: 16 }} />
                      )}
                      <Typography
                        variant="body2"
                        color={coin.change24h >= 0 ? 'success.main' : 'error.main'}
                        fontWeight="medium"
                      >
                        {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatMarketCap(coin.marketCap)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatMarketCap(coin.volume24h)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={coin.recommendation}
                      color={getRecommendationColor(coin.recommendation) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => onRemoveCoin(coin.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default Watchlist;
