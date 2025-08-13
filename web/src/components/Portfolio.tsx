import React, { useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Skeleton,
  LinearProgress,
  IconButton,
  Button,
} from '@mui/material';
import { Edit as EditIcon, TrendingUp, TrendingDown, PieChart } from '@mui/icons-material';
import { PortfolioData } from '../services/CryptoService';

interface PortfolioProps {
  data: PortfolioData | null;
  loading: boolean;
  onUpdateHolding: (coinId: string, amount: number) => void;
}

const formatPrice = (price: number) => {
  if (price < 0.01) {
    return `$${price.toFixed(6)}`;
  } else if (price < 1) {
    return `$${price.toFixed(4)}`;
  } else {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

const formatValue = (value: number) => {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const Portfolio: React.FC<PortfolioProps> = ({ data, loading, onUpdateHolding }) => {
  const [editingCoin, setEditingCoin] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');

  const handleEditClick = (coinId: string, currentAmount: number) => {
    setEditingCoin(coinId);
    setEditAmount(currentAmount.toString());
  };

  const handleSaveEdit = () => {
    if (editingCoin) {
      onUpdateHolding(editingCoin, parseFloat(editAmount) || 0);
      setEditingCoin(null);
      setEditAmount('');
    }
  };

  const handleCancelEdit = () => {
    setEditingCoin(null);
    setEditAmount('');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Skeleton variant="text" width="40%" height={32} />
          <Skeleton variant="rectangular" width="100%" height={100} sx={{ mt: 2 }} />
        </Paper>
        <Paper sx={{ p: 3 }}>
          <Skeleton variant="rectangular" width="100%" height={300} />
        </Paper>
      </Box>
    );
  }

  if (!data || data.holdings.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <PieChart sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Your portfolio is empty
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Add some holdings to start tracking your portfolio
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Portfolio Summary */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Portfolio Overview
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <Box>
            <Typography variant="h4" color="primary">
              {formatValue(data.totalValue)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Value
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {data.totalChange24h >= 0 ? (
              <TrendingUp color="success" sx={{ mr: 1 }} />
            ) : (
              <TrendingDown color="error" sx={{ mr: 1 }} />
            )}
            <Box>
              <Typography
                variant="h6"
                color={data.totalChange24h >= 0 ? 'success.main' : 'error.main'}
              >
                {data.totalChange24h >= 0 ? '+' : ''}{formatValue(data.totalChange24h)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                24h Change ({data.totalChangePercent >= 0 ? '+' : ''}{data.totalChangePercent.toFixed(2)}%)
              </Typography>
            </Box>
          </Box>
          <Box>
            <Typography variant="h6">
              {data.holdings.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Assets
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Holdings Table */}
      <Paper>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Holdings
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Asset</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Value</TableCell>
                <TableCell align="right">24h Change</TableCell>
                <TableCell align="right">Allocation</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.holdings.map((holding) => (
                <TableRow key={holding.coinId} hover>
                  <TableCell>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {holding.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {holding.coinId.toUpperCase()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {editingCoin === holding.coinId ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          style={{
                            width: '80px',
                            padding: '4px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            backgroundColor: 'transparent',
                            color: 'inherit',
                          }}
                        />
                        <Button size="small" onClick={handleSaveEdit}>Save</Button>
                        <Button size="small" onClick={handleCancelEdit}>Cancel</Button>
                      </Box>
                    ) : (
                      <Typography variant="body2">
                        {holding.amount.toFixed(4)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatPrice(holding.price)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1" fontWeight="medium">
                      {formatValue(holding.value)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      {holding.change24h >= 0 ? (
                        <TrendingUp color="success" sx={{ mr: 0.5, fontSize: 16 }} />
                      ) : (
                        <TrendingDown color="error" sx={{ mr: 0.5, fontSize: 16 }} />
                      )}
                      <Box>
                        <Typography
                          variant="body2"
                          color={holding.change24h >= 0 ? 'success.main' : 'error.main'}
                        >
                          {holding.change24h >= 0 ? '+' : ''}{holding.change24h.toFixed(2)}%
                        </Typography>
                        <Typography
                          variant="caption"
                          color={holding.change24hValue >= 0 ? 'success.main' : 'error.main'}
                        >
                          {holding.change24hValue >= 0 ? '+' : ''}{formatValue(holding.change24hValue)}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <LinearProgress
                        variant="determinate"
                        value={holding.allocation}
                        sx={{ width: 60, mr: 1 }}
                      />
                      <Typography variant="body2">
                        {holding.allocation.toFixed(1)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleEditClick(holding.coinId, holding.amount)}
                      disabled={editingCoin !== null}
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Portfolio;
