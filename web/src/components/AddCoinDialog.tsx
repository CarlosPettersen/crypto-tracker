import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Autocomplete,
  TextField,
  CircularProgress,
} from '@mui/material';
import { CryptoService, CoinSearchResult } from '../services/CryptoService';

interface AddCoinDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (coinId: string) => void;
}

const AddCoinDialog: React.FC<AddCoinDialogProps> = ({ open, onClose, onAdd }) => {
  const [selectedCoin, setSelectedCoin] = useState<CoinSearchResult | null>(null);
  const [coinOptions, setCoinOptions] = useState<CoinSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  // Popular coins for quick selection
  const popularCoins: CoinSearchResult[] = [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
    { id: 'cardano', name: 'Cardano', symbol: 'ADA' },
    { id: 'solana', name: 'Solana', symbol: 'SOL' },
    { id: 'polkadot', name: 'Polkadot', symbol: 'DOT' },
    { id: 'chainlink', name: 'Chainlink', symbol: 'LINK' },
    { id: 'litecoin', name: 'Litecoin', symbol: 'LTC' },
    { id: 'avalanche-2', name: 'Avalanche', symbol: 'AVAX' },
  ];

  useEffect(() => {
    if (inputValue.length >= 2) {
      searchCoins(inputValue);
    } else {
      setCoinOptions(popularCoins);
    }
  }, [inputValue]);

  useEffect(() => {
    if (open) {
      setCoinOptions(popularCoins);
    }
  }, [open]);

  const searchCoins = async (query: string) => {
    setLoading(true);
    try {
      const results = await CryptoService.searchCoins(query);
      setCoinOptions(results.length > 0 ? results : popularCoins);
    } catch (error) {
      console.error('Error searching coins:', error);
      setCoinOptions(popularCoins);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedCoin) {
      setError('Please select a coin');
      return;
    }

    onAdd(selectedCoin.id);
    handleClose();
  };

  const handleClose = () => {
    setSelectedCoin(null);
    setInputValue('');
    setCoinOptions(popularCoins);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Coin to Watchlist</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Autocomplete
            options={coinOptions}
            getOptionLabel={(option) => `${option.name} (${option.symbol})`}
            value={selectedCoin}
            onChange={(_, newValue) => {
              setSelectedCoin(newValue);
              setError('');
            }}
            inputValue={inputValue}
            onInputChange={(_, newInputValue) => {
              setInputValue(newInputValue);
            }}
            loading={loading}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Coin"
                error={!!error}
                helperText={error || 'Search for a cryptocurrency or select from popular coins'}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Box>
                  <Typography variant="body1">{option.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.symbol} • {option.id}
                  </Typography>
                </Box>
              </Box>
            )}
            noOptionsText={inputValue.length < 2 ? "Type to search coins..." : "No coins found"}
          />
        </Box>

        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom>
            💡 Popular Coins
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start typing to search thousands of cryptocurrencies, or select from the popular coins above.
          </Typography>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          You can find more coin information at:{' '}
          <a
            href="https://www.coingecko.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit' }}
          >
            CoinGecko
          </a>
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          Add Coin
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddCoinDialog;
