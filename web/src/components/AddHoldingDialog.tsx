import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import { CryptoService, CoinSearchResult } from '../services/CryptoService';

interface AddHoldingDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (coinId: string, amount: number) => void;
}

const AddHoldingDialog: React.FC<AddHoldingDialogProps> = ({ open, onClose, onAdd }) => {
  const [selectedCoin, setSelectedCoin] = useState<CoinSearchResult | null>(null);
  const [amount, setAmount] = useState('');
  const [coinOptions, setCoinOptions] = useState<CoinSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [errors, setErrors] = useState({ coin: '', amount: '' });

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
    const newErrors = { coin: '', amount: '' };

    if (!selectedCoin) {
      newErrors.coin = 'Please select a coin';
    }

    if (!amount.trim()) {
      newErrors.amount = 'Please enter an amount';
    } else if (isNaN(parseFloat(amount)) || parseFloat(amount) < 0) {
      newErrors.amount = 'Please enter a valid positive number';
    }

    setErrors(newErrors);

    if (!newErrors.coin && !newErrors.amount && selectedCoin) {
      onAdd(selectedCoin.id, parseFloat(amount));
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedCoin(null);
    setAmount('');
    setInputValue('');
    setCoinOptions(popularCoins);
    setErrors({ coin: '', amount: '' });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add/Update Portfolio Holding</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Autocomplete
            options={coinOptions}
            getOptionLabel={(option) => `${option.name} (${option.symbol})`}
            value={selectedCoin}
            onChange={(_, newValue) => {
              setSelectedCoin(newValue);
              setErrors({ ...errors, coin: '' });
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
                error={!!errors.coin}
                helperText={errors.coin || 'Search for a cryptocurrency or select from popular coins'}
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

          <TextField
            label="Amount"
            type="number"
            fullWidth
            variant="outlined"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setErrors({ ...errors, amount: '' });
            }}
            error={!!errors.amount}
            helperText={errors.amount || 'Enter the amount you own (set to 0 to remove)'}
            inputProps={{ min: 0, step: 'any' }}
          />
        </Box>

        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom>
            💡 Tips:
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            • Search by coin name, symbol, or ID (e.g., "bitcoin", "BTC")
            <br />
            • Enter the exact amount of coins you own
            <br />
            • Set amount to 0 to remove a coin from your portfolio
            <br />
            • You can update existing holdings by entering a new amount
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          {parseFloat(amount) === 0 ? 'Remove Holding' : 'Update Holding'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddHoldingDialog;
