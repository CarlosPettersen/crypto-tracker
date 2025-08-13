import React, { useState, useEffect, useCallback } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Paper,
  Box,
  Tabs,
  Tab,
  Fab,
  Snackbar,
  Alert
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import Watchlist from './components/Watchlist';
import Portfolio from './components/Portfolio';
import Recommendations from './components/Recommendations';
import AddCoinDialog from './components/AddCoinDialog';
import AddHoldingDialog from './components/AddHoldingDialog';
import { CryptoService, WatchlistItem, PortfolioData, CoinRecommendation } from './services/CryptoService';
import './App.css';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00d4aa',
    },
    secondary: {
      main: '#ff6b6b',
    },
    background: {
      default: '#0a0e27',
      paper: '#1a1f3a',
    },
    success: {
      main: '#00d4aa',
    },
    error: {
      main: '#ff6b6b',
    },
    warning: {
      main: '#ffd93d',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function App() {
  const [tabValue, setTabValue] = useState(0);
  const [watchlistData, setWatchlistData] = useState<WatchlistItem[]>([]);
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [recommendationsData, setRecommendationsData] = useState<CoinRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [addCoinOpen, setAddCoinOpen] = useState(false);
  const [addHoldingOpen, setAddHoldingOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Loading data...');
      const [watchlist, portfolio, recommendations] = await Promise.all([
        CryptoService.getWatchlist().catch(err => {
          console.warn('Watchlist failed:', err.message);
          return [];
        }),
        CryptoService.getPortfolio().catch(err => {
          console.warn('Portfolio failed:', err.message);
          return { holdings: [], totalValue: 0, totalChange24h: 0, totalChangePercent: 0 };
        }),
        CryptoService.getRecommendations().catch(err => {
          console.warn('Recommendations failed:', err.message);
          return [];
        }),
      ]);
      
      console.log('Data loaded:', { watchlist: watchlist.length, portfolio: portfolio.holdings.length, recommendations: recommendations.length });
      
      setWatchlistData(watchlist);
      setPortfolioData(portfolio);
      setRecommendationsData(recommendations);
    } catch (error: any) {
      console.error('Error loading data:', error);
      if (error?.message?.includes('429') || error?.message?.includes('rate limit')) {
        showSnackbar('API rate limited. Data will refresh automatically in a moment.', 'warning');
      } else {
        showSnackbar('Error loading data', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 2 minutes (increased to avoid rate limits)
    const interval = setInterval(loadData, 120000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAddCoin = async (coinId: string) => {
    try {
      await CryptoService.addToWatchlist(coinId);
      showSnackbar(`Added ${coinId} to watchlist`);
      // Reload data immediately
      setTimeout(loadData, 1000);
    } catch (error: any) {
      showSnackbar(error.message || 'Error adding coin', 'error');
    }
  };

  const handleRemoveCoin = async (coinId: string) => {
    try {
      await CryptoService.removeFromWatchlist(coinId);
      showSnackbar(`Removed ${coinId} from watchlist`);
      // Reload data immediately
      setTimeout(loadData, 1000);
    } catch (error: any) {
      showSnackbar(error.message || 'Error removing coin', 'error');
    }
  };

  const handleUpdateHolding = async (coinId: string, amount: number) => {
    try {
      console.log(`Updating holding: ${coinId} = ${amount}`);
      await CryptoService.updatePortfolio(coinId, amount);
      showSnackbar(`Updated ${coinId} holding`);
      // Reload data immediately and again after a short delay
      setTimeout(loadData, 500);
      setTimeout(loadData, 2000);
    } catch (error: any) {
      console.error('Error updating holding:', error);
      showSnackbar(error.message || 'Error updating holding', 'error');
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1, minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)' }}>
        <AppBar position="static" sx={{ background: 'rgba(26, 31, 58, 0.9)', backdropFilter: 'blur(10px)' }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
              🚀 Crypto Tracker
            </Typography>
            <Fab
              size="small"
              color="primary"
              onClick={loadData}
              sx={{ mr: 1 }}
            >
              <RefreshIcon />
            </Fab>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 2 }}>
          <Paper sx={{ mb: 2 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="📊 Watchlist" />
              <Tab label="💼 Portfolio" />
              <Tab label="🎯 Recommendations" />
            </Tabs>
          </Paper>

          <TabPanel value={tabValue} index={0}>
            <Watchlist
              data={watchlistData}
              loading={loading}
              onRemoveCoin={handleRemoveCoin}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Portfolio
              data={portfolioData}
              loading={loading}
              onUpdateHolding={handleUpdateHolding}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Recommendations
              data={recommendationsData}
              loading={loading}
            />
          </TabPanel>
        </Container>

        {/* Floating Action Buttons */}
        <Box sx={{ position: 'fixed', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {tabValue === 0 && (
            <Fab
              color="primary"
              onClick={() => setAddCoinOpen(true)}
              sx={{ mb: 1 }}
            >
              <AddIcon />
            </Fab>
          )}
          {tabValue === 1 && (
            <Fab
              color="secondary"
              onClick={() => setAddHoldingOpen(true)}
            >
              <AddIcon />
            </Fab>
          )}
        </Box>

        {/* Dialogs */}
        <AddCoinDialog
          open={addCoinOpen}
          onClose={() => setAddCoinOpen(false)}
          onAdd={handleAddCoin}
        />

        <AddHoldingDialog
          open={addHoldingOpen}
          onClose={() => setAddHoldingOpen(false)}
          onAdd={handleUpdateHolding}
        />

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default App;
